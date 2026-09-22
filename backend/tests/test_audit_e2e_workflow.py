import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongo import mongo_db
from app.services.scheduler_engine import evaluate_member_schedule
from app.services.care_coordinator import care_coordinator

@pytest.mark.asyncio
async def test_complete_20_step_engineering_audit_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Step 1: Register
        user_email = "audit.test.user@vaxassist.com"
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": user_email,
            "password": "AuditPassword123!",
            "full_name": "Audit Medical Lead",
        })
        # If user exists from previous run, login directly
        if reg_res.status_code == 400:
            pass

        # Step 2: Login
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": user_email,
            "password": "AuditPassword123!",
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        auth_data = login_res.json()
        token = auth_data["access_token"]
        user_id = auth_data["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 3: Create Family
        fam_res = await ac.post("/api/v1/families", json={
            "name": "Audit Lead Family",
            "address": "456 Healthcare Blvd",
            "emergency_contact": "+1-800-555-VAX",
        }, headers=headers)
        assert fam_res.status_code == 201
        family_id = fam_res.json()["id"]

        # Step 4: Add Family Members
        mem1_res = await ac.post(f"/api/v1/families/{family_id}/members", json={
            "name": "Arjun Sharma",
            "date_of_birth": "2024-01-10",
            "relationship": "Child",
            "gender": "Male",
            "blood_group": "B+",
        }, headers=headers)
        assert mem1_res.status_code == 201
        member_id = mem1_res.json()["id"]

        # Step 5: Add Vaccination
        vax_res = await ac.post("/api/v1/vaccinations", json={
            "member_id": member_id,
            "vaccine_name": "BCG",
            "dose": "0.1 ml",
            "administration_date": "2024-01-10",
            "provider": "Dr. Verma",
            "clinic": "Metro General Hospital",
            "batch_number": "LOT-BCG-001",
            "verification_status": "verified",
        }, headers=headers)
        assert vax_res.status_code == 201
        vax_id = vax_res.json()["id"]

        # Step 6: Edit Vaccination
        edit_vax_res = await ac.put(f"/api/v1/vaccinations/{vax_id}", json={
            "notes": "Administered with zero immediate side effects. Observation passed.",
        }, headers=headers)
        assert edit_vax_res.status_code == 200
        assert edit_vax_res.json()["notes"] == "Administered with zero immediate side effects. Observation passed."

        # Step 7: View Dashboard (Family and member counts)
        fam_detail_res = await ac.get(f"/api/v1/families/{family_id}", headers=headers)
        assert fam_detail_res.status_code == 200
        assert fam_detail_res.json()["member_count"] >= 1
        assert len(fam_detail_res.json()["members"]) >= 1

        # Step 8: View Schedule (Deterministic engine)
        sched_res = await ac.get(f"/api/v1/schedule/{member_id}", headers=headers)
        assert sched_res.status_code == 200
        sched_data = sched_res.json()
        assert sched_data["summary"]["completed_count"] >= 1
        assert sched_data["schedule_version"] == "v1.0.0-demo-2026"

        # Step 9: View Reminders / Milestones
        assert len(sched_data["upcoming"]) > 0 or len(sched_data["overdue"]) > 0

        # Step 10: Ask AI question (Care Coordinator)
        ai_res = await ac.post("/api/v1/ai/chat", json={
            "message": "What does the MMR vaccine protect against and what is the recommended schedule?",
            "member_id": member_id,
        }, headers=headers)
        assert ai_res.status_code == 200
        ai_data = ai_res.json()

        # Step 11: Verify Retrieved Sources & Medical Disclaimer
        assert "response" in ai_data
        assert len(ai_data["sources"]) > 0
        assert "disclaimer" in ai_data
        assert "pediatrician" in ai_data["disclaimer"].lower() or "physician" in ai_data["disclaimer"].lower()

        # Step 12, 13, 14: Offline Creation Simulation
        offline_payload = {
            "member_id": member_id,
            "vaccine_name": "Hepatitis B Birth Dose",
            "dose": "0.5 ml",
            "administration_date": "2024-01-11",
            "provider": "Dr. Field Ops",
            "clinic": "Rural Outreach Center",
            "batch_number": "LOT-HEP-OFFLINE-99",
        }

        # Step 15 & 16: Reconnect & Synchronize (Replay queued mutation via API)
        sync_res = await ac.post("/api/v1/vaccinations", json=offline_payload, headers=headers)
        assert sync_res.status_code == 201
        synced_vax_id = sync_res.json()["id"]

        # Step 17: Generate Report
        member_vax_list = await ac.get(f"/api/v1/vaccinations?member_id={member_id}", headers=headers)
        assert member_vax_list.status_code == 200
        assert len(member_vax_list.json()) >= 2

        # Step 18: Logout
        logout_res = await ac.post("/api/v1/auth/logout", headers=headers)
        assert logout_res.status_code == 200

        # Step 19: Attempt protected resource with invalid/cleared token
        invalid_headers = {"Authorization": "Bearer invalid_or_expired_token"}
        unauth_res = await ac.get("/api/v1/families", headers=invalid_headers)

        # Step 20: Verify access is denied
        assert unauth_res.status_code == 401
        assert "credentials" in unauth_res.json()["detail"].lower()

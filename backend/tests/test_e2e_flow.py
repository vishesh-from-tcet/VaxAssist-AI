import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongo import mongo_db


@pytest.fixture(autouse=True)
async def cleanup_db():
    mongo_db.connect()
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^e2e_.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})
    yield
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^e2e_.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})


@pytest.mark.asyncio
async def test_complete_9_step_phase3_workflow():
    """
    Complete end-to-end integration test matching all 9 required verification steps:
    1. Register
    2. Create family
    3. Add two members
    4. Add vaccination records
    5. Edit a record
    6. Delete a record
    7. Refresh (simulate new client query)
    8. Verify persistence
    9. Verify unauthorized family access is rejected
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # STEP 1: Register User 1
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": "e2e_user1@example.com",
            "password": "SecurePassword123!",
            "full_name": "Dr. Eleanor Vance"
        })
        assert reg_res.status_code == 201
        token1 = reg_res.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # STEP 2: Create Family
        fam_res = await ac.post("/api/v1/families", json={
            "name": "The Vance Family Health Vault",
            "address": "742 Evergreen Terrace",
            "emergency_contact": "+1-800-555-0199"
        }, headers=headers1)
        assert fam_res.status_code == 201
        fam_id = fam_res.json()["id"]
        assert fam_res.json()["name"] == "The Vance Family Health Vault"

        # STEP 3: Add two members (Self and Child)
        m1_res = await ac.post(f"/api/v1/families/{fam_id}/members", json={
            "name": "Eleanor Vance",
            "date_of_birth": "1988-11-20",
            "relationship": "Self",
            "gender": "Female",
            "blood_group": "AB+",
            "allergies": "None",
            "medical_notes": "Healthcare professional"
        }, headers=headers1)
        assert m1_res.status_code == 201
        m1_id = m1_res.json()["id"]

        m2_res = await ac.post(f"/api/v1/families/{fam_id}/members", json={
            "name": "Oliver Vance",
            "date_of_birth": "2022-06-15",
            "relationship": "Child",
            "gender": "Male",
            "blood_group": "A+",
            "allergies": "Egg protein (mild)",
            "medical_notes": "Pediatric immunization schedule"
        }, headers=headers1)
        assert m2_res.status_code == 201
        m2_id = m2_res.json()["id"]

        # STEP 4: Add Vaccination Records for both members
        vax1_res = await ac.post("/api/v1/vaccinations", json={
            "member_id": m1_id,
            "vaccine_name": "COVID-19 (Comirnaty)",
            "dose": "Booster 1",
            "administration_date": "2024-02-10",
            "clinic": "University Hospital Center",
            "provider": "Dr. Aris Thorne",
            "batch_number": "BN-PF-9012",
            "notes": "Administered in left deltoid",
            "verification_status": "verified"
        }, headers=headers1)
        assert vax1_res.status_code == 201
        vax1_id = vax1_res.json()["id"]
        assert vax1_res.json()["member_name"] == "Eleanor Vance"

        vax2_res = await ac.post("/api/v1/vaccinations", json={
            "member_id": m2_id,
            "vaccine_name": "MMR (Measles, Mumps, Rubella)",
            "dose": "Dose 1",
            "administration_date": "2023-07-20",
            "clinic": "Children's Pediatric Wellness",
            "provider": "Dr. Clara Oswald",
            "batch_number": "MMR-2023-X1",
            "notes": "Standard 12-month childhood dose",
            "verification_status": "verified"
        }, headers=headers1)
        assert vax2_res.status_code == 201
        vax2_id = vax2_res.json()["id"]
        assert vax2_res.json()["member_name"] == "Oliver Vance"

        # Record 3 (temporary to delete)
        vax3_res = await ac.post("/api/v1/vaccinations", json={
            "member_id": m1_id,
            "vaccine_name": "Influenza Quadrivalent",
            "dose": "Annual 2023",
            "administration_date": "2023-10-01",
            "clinic": "City Care Walk-in",
            "batch_number": "TEMP-DEL-999",
            "verification_status": "self_reported"
        }, headers=headers1)
        assert vax3_res.status_code == 201
        vax3_id = vax3_res.json()["id"]

        # STEP 5: Edit a record
        edit_res = await ac.put(f"/api/v1/vaccinations/{vax1_id}", json={
            "batch_number": "BN-PF-9012-VERIFIED",
            "notes": "Administered in left deltoid - zero complications"
        }, headers=headers1)
        assert edit_res.status_code == 200
        assert edit_res.json()["batch_number"] == "BN-PF-9012-VERIFIED"
        assert edit_res.json()["notes"] == "Administered in left deltoid - zero complications"

        # STEP 6: Delete a record (vax3)
        del_res = await ac.delete(f"/api/v1/vaccinations/{vax3_id}", headers=headers1)
        assert del_res.status_code == 200

        # STEP 7 & 8: Refresh and Verify Persistence
        # Query families
        fresh_fam = await ac.get(f"/api/v1/families/{fam_id}", headers=headers1)
        assert fresh_fam.status_code == 200
        fam_data = fresh_fam.json()
        assert fam_data["name"] == "The Vance Family Health Vault"
        assert len(fam_data["members"]) == 2

        # Query vaccinations list
        fresh_vax_list = await ac.get("/api/v1/vaccinations", headers=headers1)
        assert fresh_vax_list.status_code == 200
        vax_items = fresh_vax_list.json()
        assert len(vax_items) == 2
        vax_ids = [v["id"] for v in vax_items]
        assert vax1_id in vax_ids
        assert vax2_id in vax_ids
        assert vax3_id not in vax_ids

        # STEP 9: Verify unauthorized access by another user is strictly rejected
        reg_unauth = await ac.post("/api/v1/auth/register", json={
            "email": "e2e_intruder@example.com",
            "password": "IntruderPassword999!",
            "full_name": "Unauthorized Intruder"
        })
        token_unauth = reg_unauth.json()["access_token"]
        headers_unauth = {"Authorization": f"Bearer {token_unauth}"}

        # Intruder attempts:
        # a) GET User 1's family -> 404
        assert (await ac.get(f"/api/v1/families/{fam_id}", headers=headers_unauth)).status_code == 404
        # b) PUT User 1's family -> 404
        assert (await ac.put(f"/api/v1/families/{fam_id}", json={"name": "Stolen"}, headers=headers_unauth)).status_code == 404
        # c) POST member to User 1's family -> 404
        assert (await ac.post(f"/api/v1/families/{fam_id}/members", json={"name": "Spy", "date_of_birth": "2000-01-01", "relationship": "Other"}, headers=headers_unauth)).status_code == 404
        # d) PUT User 1's member -> 404
        assert (await ac.put(f"/api/v1/members/{m1_id}", json={"name": "Hacked"}, headers=headers_unauth)).status_code == 404
        # e) DELETE User 1's member -> 404
        assert (await ac.delete(f"/api/v1/members/{m1_id}", headers=headers_unauth)).status_code == 404
        # f) POST vaccination on User 1's member -> 404
        assert (await ac.post("/api/v1/vaccinations", json={"member_id": m1_id, "vaccine_name": "Fake", "dose": "1", "administration_date": "2024-01-01"}, headers=headers_unauth)).status_code == 404
        # g) GET User 1's vaccination -> 404
        assert (await ac.get(f"/api/v1/vaccinations/{vax1_id}", headers=headers_unauth)).status_code == 404
        # h) PUT User 1's vaccination -> 404
        assert (await ac.put(f"/api/v1/vaccinations/{vax1_id}", json={"dose": "Hacked"}, headers=headers_unauth)).status_code == 404
        # i) DELETE User 1's vaccination -> 404
        assert (await ac.delete(f"/api/v1/vaccinations/{vax1_id}", headers=headers_unauth)).status_code == 404

        # Intruder's list is completely empty
        intruder_list = await ac.get("/api/v1/vaccinations", headers=headers_unauth)
        assert intruder_list.status_code == 200
        assert len(intruder_list.json()) == 0

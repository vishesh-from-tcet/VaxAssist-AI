import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongo import mongo_db
from app.services.scheduler_engine import evaluate_member_schedule


@pytest.fixture(autouse=True)
async def cleanup_db():
    mongo_db.connect()
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_sched.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})
    yield
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_sched.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})


async def _get_auth_headers(client: AsyncClient, email: str = "test_sched_user@example.com"):
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Schedule Test User"
    })
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_deterministic_schedule_evaluator_unit():
    """Direct unit test of deterministic calculation engine."""
    today = date(2026, 1, 1)
    
    # 1. 2-month-old infant (born 60 days ago: 2025-11-02)
    dob = (today - timedelta(days=60)).isoformat()
    
    # Vaccinated with BCG at birth (verified) and pending DTP 1 (self-reported)
    vax_records = [
        {
            "id": "rec-bcg",
            "vaccine_name": "BCG (Tuberculosis)",
            "dose": "Birth Dose",
            "administration_date": "2025-11-03",
            "verification_status": "verified"
        },
        {
            "id": "rec-dtp-unverified",
            "vaccine_name": "Pentavalent / DTP",
            "dose": "Dose 1",
            "administration_date": "2025-12-15",
            "verification_status": "self_reported"
        },
        {
            "id": "rec-custom",
            "vaccine_name": "Custom Travel Vaccine X",
            "dose": "Dose 1",
            "administration_date": "2025-12-20",
            "verification_status": "verified"
        }
    ]

    res = evaluate_member_schedule(
        member_dob=dob,
        member_profile={"id": "mem-1", "name": "Infant Test"},
        vaccination_records=vax_records,
        reference_date=today
    )

    # Completed test: BCG is completed
    completed_rules = [c["rule_id"] for c in res["completed"]]
    assert "UIP-BCG-0" in completed_rules
    assert res["summary"]["completed_count"] >= 1

    # Overdue test: Hepatitis B birth dose was not recorded and 60 days > 14 days grace period -> Overdue
    overdue_rules = [o["rule_id"] for o in res["overdue"]]
    assert "UIP-HEPB-0" in overdue_rules

    # Upcoming test: MMR at 9 months (270 days) -> Upcoming
    upcoming_rules = [u["rule_id"] for u in res["upcoming"]]
    assert "UIP-MMR-1" in upcoming_rules

    # Unknown / unverified test: DTP 1 (self-reported) & Custom vaccine are in unknown_unverified
    unverified_vax = [u["vaccine_name"] for u in res["unknown_unverified"]]
    assert any("Custom Travel Vaccine X" in v for v in unverified_vax)


@pytest.mark.asyncio
async def test_schedule_api_endpoints_and_security():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers_a = await _get_auth_headers(ac, email="test_sched_a@example.com")

        # Setup family and 1-year-old child for User A
        fam_a = (await ac.post("/api/v1/families", json={"name": "Family A"}, headers=headers_a)).json()
        fam_a_id = fam_a["id"]

        today = date.today()
        child_dob = (today - timedelta(days=365)).isoformat()
        child_a = (await ac.post(f"/api/v1/families/{fam_a_id}/members", json={
            "name": "Tommy A",
            "date_of_birth": child_dob,
            "relationship": "Child"
        }, headers=headers_a)).json()
        child_a_id = child_a["id"]

        # Log BCG vaccine for Tommy
        await ac.post("/api/v1/vaccinations", json={
            "member_id": child_a_id,
            "vaccine_name": "BCG",
            "dose": "Birth Dose",
            "administration_date": child_dob,
            "verification_status": "verified"
        }, headers=headers_a)

        # 1. GET Member schedule for User A
        sched_res = await ac.get(f"/api/v1/schedule/{child_a_id}", headers=headers_a)
        assert sched_res.status_code == 200
        sched_data = sched_res.json()
        assert sched_data["member_name"] == "Tommy A"
        assert sched_data["summary"]["completed_count"] >= 1
        assert len(sched_data["overdue"]) > 0  # 1-year-old missing 6w/10w/14w doses is overdue
        assert len(sched_data["upcoming"]) > 0  # 5-year booster is upcoming

        # 2. GET Family schedule for User A
        fam_sched_res = await ac.get(f"/api/v1/schedule/family/{fam_a_id}", headers=headers_a)
        assert fam_sched_res.status_code == 200
        assert len(fam_sched_res.json()["members_evaluations"]) == 1

        # 3. GET Catalog rules
        cat_res = await ac.get("/api/v1/schedule/catalog")
        assert cat_res.status_code == 200
        assert len(cat_res.json()) > 5

        # 4. Security Isolation: User B cannot access User A's schedule
        headers_b = await _get_auth_headers(ac, email="test_sched_b@example.com")
        unauth_m = await ac.get(f"/api/v1/schedule/{child_a_id}", headers=headers_b)
        assert unauth_m.status_code == 404

        unauth_fam = await ac.get(f"/api/v1/schedule/family/{fam_a_id}", headers=headers_b)
        assert unauth_fam.status_code == 404

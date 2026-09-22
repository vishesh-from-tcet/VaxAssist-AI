import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongo import mongo_db


@pytest.fixture(autouse=True)
async def cleanup_db():
    mongo_db.connect()
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_fam.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})
    yield
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_fam.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})


async def _get_auth_headers(client: AsyncClient, email: str = "test_fam_user@example.com", name: str = "Family Test User"):
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name
    })
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_family_crud_and_members():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await _get_auth_headers(ac)

        # 1. Create family
        fam_payload = {
            "name": "The Henderson Family",
            "address": "123 Maple Street",
            "emergency_contact": "+1-555-0199"
        }
        fam_res = await ac.post("/api/v1/families", json=fam_payload, headers=headers)
        assert fam_res.status_code == 201
        fam_data = fam_res.json()
        fam_id = fam_data["id"]
        assert fam_data["name"] == "The Henderson Family"
        assert fam_data["member_count"] == 0

        # 2. List families
        list_res = await ac.get("/api/v1/families", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1
        assert list_res.json()[0]["id"] == fam_id

        # 3. Add first member (Self)
        m1_payload = {
            "name": "Sarah Henderson",
            "date_of_birth": "1990-05-15",
            "relationship": "Self",
            "gender": "Female",
            "blood_group": "O+",
            "allergies": "Penicillin",
            "medical_notes": "No chronic conditions"
        }
        m1_res = await ac.post(f"/api/v1/families/{fam_id}/members", json=m1_payload, headers=headers)
        assert m1_res.status_code == 201
        m1_data = m1_res.json()
        m1_id = m1_data["id"]
        assert m1_data["name"] == "Sarah Henderson"
        assert m1_data["relationship"] == "Self"
        assert m1_data["blood_group"] == "O+"

        # 4. Add second member (Child)
        m2_payload = {
            "name": "Leo Henderson",
            "date_of_birth": "2023-01-10",
            "relationship": "Child",
            "gender": "Male",
            "blood_group": "A+",
            "allergies": "None",
            "medical_notes": "Up to date on infant immunizations"
        }
        m2_res = await ac.post(f"/api/v1/families/{fam_id}/members", json=m2_payload, headers=headers)
        assert m2_res.status_code == 201
        m2_data = m2_res.json()
        m2_id = m2_data["id"]

        # 5. Get family with members
        get_fam_res = await ac.get(f"/api/v1/families/{fam_id}", headers=headers)
        assert get_fam_res.status_code == 200
        get_fam_data = get_fam_res.json()
        assert get_fam_data["member_count"] == 2
        assert len(get_fam_data["members"]) == 2

        # 6. Update member
        upd_member_res = await ac.put(f"/api/v1/members/{m2_id}", json={"allergies": "Peanuts (mild)"}, headers=headers)
        assert upd_member_res.status_code == 200
        assert upd_member_res.json()["allergies"] == "Peanuts (mild)"

        # 7. Update family
        upd_fam_res = await ac.put(f"/api/v1/families/{fam_id}", json={"name": "The Henderson-Smith Family"}, headers=headers)
        assert upd_fam_res.status_code == 200
        assert upd_fam_res.json()["name"] == "The Henderson-Smith Family"

        # 8. Delete member
        del_m_res = await ac.delete(f"/api/v1/members/{m1_id}", headers=headers)
        assert del_m_res.status_code == 200

        # Verify member removed
        get_m1_res = await ac.get(f"/api/v1/members/{m1_id}", headers=headers)
        assert get_m1_res.status_code == 404


@pytest.mark.asyncio
async def test_family_cross_user_security_isolation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # User A setup
        headers_a = await _get_auth_headers(ac, email="test_fam_a@example.com", name="User A")
        fam_res_a = await ac.post("/api/v1/families", json={"name": "User A Family"}, headers=headers_a)
        fam_a_id = fam_res_a.json()["id"]

        m_res_a = await ac.post(f"/api/v1/families/{fam_a_id}/members", json={
            "name": "Member A",
            "date_of_birth": "1995-03-20",
            "relationship": "Self"
        }, headers=headers_a)
        m_a_id = m_res_a.json()["id"]

        # User B setup
        headers_b = await _get_auth_headers(ac, email="test_fam_b@example.com", name="User B")

        # User B tries to view User A's family -> 404
        unauth_get_fam = await ac.get(f"/api/v1/families/{fam_a_id}", headers=headers_b)
        assert unauth_get_fam.status_code == 404

        # User B tries to update User A's family -> 404
        unauth_put_fam = await ac.put(f"/api/v1/families/{fam_a_id}", json={"name": "Hacked Family"}, headers=headers_b)
        assert unauth_put_fam.status_code == 404

        # User B tries to add member to User A's family -> 404
        unauth_post_m = await ac.post(f"/api/v1/families/{fam_a_id}/members", json={
            "name": "Imposter",
            "date_of_birth": "2000-01-01",
            "relationship": "Other"
        }, headers=headers_b)
        assert unauth_post_m.status_code == 404

        # User B tries to edit User A's member -> 404
        unauth_put_m = await ac.put(f"/api/v1/members/{m_a_id}", json={"name": "Renamed Imposter"}, headers=headers_b)
        assert unauth_put_m.status_code == 404

        # User B tries to delete User A's member -> 404
        unauth_del_m = await ac.delete(f"/api/v1/members/{m_a_id}", headers=headers_b)
        assert unauth_del_m.status_code == 404

        # Verify User A's data remains untouched
        check_fam_a = await ac.get(f"/api/v1/families/{fam_a_id}", headers=headers_a)
        assert check_fam_a.status_code == 200
        assert check_fam_a.json()["name"] == "User A Family"
        assert len(check_fam_a.json()["members"]) == 1

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongo import mongo_db


@pytest.fixture(autouse=True)
async def cleanup_db():
    mongo_db.connect()
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_vax.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})
    yield
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_vax.*@example\\.com$"}})
        await mongo_db.db.families.delete_many({})
        await mongo_db.db.members.delete_many({})
        await mongo_db.db.vaccinations.delete_many({})


async def _get_auth_headers(client: AsyncClient, email: str = "test_vax_user@example.com", name: str = "Vaccine Test User"):
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": name
    })
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_vaccination_lifecycle_and_filtering():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await _get_auth_headers(ac)

        # Setup Family and Member
        fam_res = await ac.post("/api/v1/families", json={"name": "Vaccine Test Family"}, headers=headers)
        fam_id = fam_res.json()["id"]

        m_res = await ac.post(f"/api/v1/families/{fam_id}/members", json={
            "name": "Alex Johnson",
            "date_of_birth": "1998-04-12",
            "relationship": "Self"
        }, headers=headers)
        m_id = m_res.json()["id"]

        # 1. Create Vaccination Record 1
        v1_payload = {
            "member_id": m_id,
            "vaccine_name": "COVID-19 mRNA (Comirnaty)",
            "dose": "Dose 1",
            "administration_date": "2024-01-15",
            "provider": "Dr. Sarah Lee",
            "clinic": "Metro General Hospital",
            "batch_number": "BN-2024-A19",
            "notes": "No adverse reactions observed after 15 min",
            "source": "official_record",
            "verification_status": "verified"
        }
        v1_res = await ac.post("/api/v1/vaccinations", json=v1_payload, headers=headers)
        assert v1_res.status_code == 201
        v1_data = v1_res.json()
        v1_id = v1_data["id"]
        assert v1_data["vaccine_name"] == "COVID-19 mRNA (Comirnaty)"
        assert v1_data["member_name"] == "Alex Johnson"
        assert v1_data["batch_number"] == "BN-2024-A19"

        # 2. Create Vaccination Record 2
        v2_payload = {
            "member_id": m_id,
            "vaccine_name": "Influenza Quadrivalent",
            "dose": "Annual",
            "administration_date": "2024-10-05",
            "provider": "Nurse Practitioner Davis",
            "clinic": "Downtown Health Clinic",
            "batch_number": "FLU-9874",
            "notes": "Annual seasonal flu shot",
            "source": "manual",
            "verification_status": "verified"
        }
        v2_res = await ac.post("/api/v1/vaccinations", json=v2_payload, headers=headers)
        assert v2_res.status_code == 201
        v2_id = v2_res.json()["id"]

        # 3. List vaccinations
        list_all = await ac.get("/api/v1/vaccinations", headers=headers)
        assert list_all.status_code == 200
        assert len(list_all.json()) == 2

        # 4. Search and Filter
        search_res = await ac.get("/api/v1/vaccinations?search=Flu", headers=headers)
        assert search_res.status_code == 200
        assert len(search_res.json()) == 1
        assert "Influenza" in search_res.json()[0]["vaccine_name"]

        # 5. Get Single Record
        get_v1 = await ac.get(f"/api/v1/vaccinations/{v1_id}", headers=headers)
        assert get_v1.status_code == 200
        assert get_v1.json()["batch_number"] == "BN-2024-A19"

        # 6. Update Record
        upd_res = await ac.put(f"/api/v1/vaccinations/{v1_id}", json={
            "batch_number": "BN-2024-A19-REVISED",
            "notes": "Minor arm soreness next morning"
        }, headers=headers)
        assert upd_res.status_code == 200
        assert upd_res.json()["batch_number"] == "BN-2024-A19-REVISED"
        assert upd_res.json()["notes"] == "Minor arm soreness next morning"

        # 7. Delete Record
        del_res = await ac.delete(f"/api/v1/vaccinations/{v2_id}", headers=headers)
        assert del_res.status_code == 200

        # Verify deletion
        list_after_del = await ac.get("/api/v1/vaccinations", headers=headers)
        assert len(list_after_del.json()) == 1
        assert list_after_del.json()[0]["id"] == v1_id


@pytest.mark.asyncio
async def test_vaccination_security_isolation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # User A setup
        headers_a = await _get_auth_headers(ac, email="test_vax_a@example.com", name="User A")
        fam_a = (await ac.post("/api/v1/families", json={"name": "User A Family"}, headers=headers_a)).json()
        m_a = (await ac.post(f"/api/v1/families/{fam_a['id']}/members", json={
            "name": "Member A",
            "date_of_birth": "1992-06-15",
            "relationship": "Self"
        }, headers=headers_a)).json()

        vax_a = (await ac.post("/api/v1/vaccinations", json={
            "member_id": m_a["id"],
            "vaccine_name": "Hepatitis B",
            "dose": "Dose 1",
            "administration_date": "2024-02-01"
        }, headers=headers_a)).json()

        # User B setup
        headers_b = await _get_auth_headers(ac, email="test_vax_b@example.com", name="User B")

        # User B tries to log vaccine for User A's member -> 404
        unauth_create = await ac.post("/api/v1/vaccinations", json={
            "member_id": m_a["id"],
            "vaccine_name": "Unauthorized Vaccine",
            "dose": "Dose 1",
            "administration_date": "2024-03-01"
        }, headers=headers_b)
        assert unauth_create.status_code == 404

        # User B tries to view User A's vaccination record -> 404
        unauth_get = await ac.get(f"/api/v1/vaccinations/{vax_a['id']}", headers=headers_b)
        assert unauth_get.status_code == 404

        # User B tries to update User A's vaccination record -> 404
        unauth_put = await ac.put(f"/api/v1/vaccinations/{vax_a['id']}", json={"dose": "Dose 2"}, headers=headers_b)
        assert unauth_put.status_code == 404

        # User B tries to delete User A's vaccination record -> 404
        unauth_del = await ac.delete(f"/api/v1/vaccinations/{vax_a['id']}", headers=headers_b)
        assert unauth_del.status_code == 404

        # Verify User A's list has 1 and User B's list has 0
        list_a = await ac.get("/api/v1/vaccinations", headers=headers_a)
        assert len(list_a.json()) == 1

        list_b = await ac.get("/api/v1/vaccinations", headers=headers_b)
        assert len(list_b.json()) == 0

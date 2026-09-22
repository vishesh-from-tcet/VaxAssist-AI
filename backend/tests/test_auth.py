import pytest
from datetime import timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongo import mongo_db
from app.core.security import create_access_token


@pytest.fixture(autouse=True)
async def setup_db():
    """Ensure DB connection and clean up test user records before/after tests."""
    mongo_db.connect()
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_.*@example\\.com$"}})
    yield
    if mongo_db.db is not None:
        await mongo_db.db.users.delete_many({"email": {"$regex": "^test_.*@example\\.com$"}})


@pytest.mark.asyncio
async def test_successful_registration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "email": "test_register@example.com",
            "password": "Password123!",
            "full_name": "Test User"
        }
        response = await ac.post("/api/v1/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test_register@example.com"
    assert data["user"]["full_name"] == "Test User"
    assert "id" in data["user"]


@pytest.mark.asyncio
async def test_duplicate_registration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "email": "test_dup@example.com",
            "password": "Password123!",
            "full_name": "Duplicate User"
        }
        # First registration
        res1 = await ac.post("/api/v1/auth/register", json=payload)
        assert res1.status_code == 201

        # Second registration attempt with same email
        res2 = await ac.post("/api/v1/auth/register", json=payload)
        assert res2.status_code == 400
        assert "already exists" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_successful_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register user first
        reg_payload = {
            "email": "test_login@example.com",
            "password": "CorrectPassword123!",
            "full_name": "Login User"
        }
        await ac.post("/api/v1/auth/register", json=reg_payload)

        # Login
        login_payload = {
            "email": "test_login@example.com",
            "password": "CorrectPassword123!"
        }
        response = await ac.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test_login@example.com"


@pytest.mark.asyncio
async def test_invalid_credentials():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Attempt login with non-existent user
        response = await ac.post("/api/v1/auth/login", json={
            "email": "test_nonexistent@example.com",
            "password": "WrongPassword"
        })
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_protected_endpoint_without_authentication():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/auth/me")
        assert response.status_code == 401
        assert "could not validate credentials" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_expired_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Malformed token
        res_invalid = await ac.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token_123"})
        assert res_invalid.status_code == 401

        # Expired token
        expired_token = create_access_token(subject="test_expired@example.com", expires_delta=timedelta(seconds=-10))
        res_expired = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert res_expired.status_code == 401


@pytest.mark.asyncio
async def test_logout():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/logout")
        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()

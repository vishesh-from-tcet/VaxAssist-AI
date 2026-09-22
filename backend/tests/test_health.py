import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert "health_check" in response.json()


@pytest.mark.asyncio
async def test_general_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "VaxAssist AI"


@pytest.mark.asyncio
async def test_database_health_endpoint_schema():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health/database")
    # Response can be 200 (if mongo running) or 550/503 (if mongo not running yet during standalone unit test)
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "database" in data


@pytest.mark.asyncio
async def test_vector_db_health_endpoint_schema():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health/vector-db")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "host" in data

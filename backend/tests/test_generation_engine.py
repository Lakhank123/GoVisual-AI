import pytest
from fastapi.testclient import TestClient
from main import app
from services.auth import get_current_user

@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: {"id": "test_user_123", "email": "test@govisual.ai"}
    yield
    app.dependency_overrides[get_current_user] = lambda: {"id": "test_user_123", "email": "test@govisual.ai"}

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/generation/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "request_id" in data
    assert data["health"]["status"] == "healthy"

def test_get_providers():
    response = client.get("/api/v1/generation/providers")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["providers"], list)

def test_dispatch_generation():
    payload = {
        "session_id": "test_session_123",
        "settings": {"quality": "high"}
    }
    response = client.post("/api/v1/generation/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "job_id" in data
    assert "generation_id" in data

def test_dispatch_validation_error():
    # Missing session_id
    payload = {
        "settings": {"quality": "high"}
    }
    response = client.post("/api/v1/generation/dispatch", json=payload)
    assert response.status_code == 422

def test_get_job_status():
    response = client.get("/api/v1/generation/jobs/job_123")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["job_id"] == "job_123"

def test_get_manifest():
    response = client.get("/api/v1/generation/manifests/gen_123")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "manifest" in data

def test_get_assets():
    response = client.get("/api/v1/generation/assets/gen_123")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["assets"], list)

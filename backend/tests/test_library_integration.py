import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from services.auth import get_current_user
from fastapi.security import HTTPAuthorizationCredentials

class DummyUser:
    id = "user_test_library_123"
    email = "test@example.com"

@pytest.fixture(autouse=True)
def override_user():
    app.dependency_overrides[get_current_user] = lambda: DummyUser()
    yield
    app.dependency_overrides.pop(get_current_user, None)

def test_library_assets_returns_creatives_and_photoshoots():
    client = TestClient(app)

    mock_db_data = [
        {
            "id": "item_1",
            "business_id": "user_test_library_123",
            "asset_url": "/static/generated/creative_1.png",
            "asset_type": "product_image",
            "tags": {"mode": "creative", "product_name": "Special Tea", "strategy_name": "Lifestyle Showcase"},
            "created_at": "2026-11-20T00:00:00Z"
        },
        {
            "id": "item_2",
            "business_id": "user_test_library_123",
            "asset_url": "/static/generated/shoot_1.jpg",
            "asset_type": "product_image",
            "tags": {"mode": "model", "product_name": "Handmade Bag", "shot_label": "Model Pose"},
            "created_at": "2026-11-20T00:01:00Z"
        }
    ]

    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=mock_db_data)

    with patch("supabase.create_client", return_value=mock_client):
        response = client.get("/api/library/assets", headers={"Authorization": "Bearer fake_token"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assets = data["assets"]
        assert len(assets) == 2
        
        # Verify creative asset
        creative = next(a for a in assets if a["id"] == "item_1")
        assert creative["type"] == "creative"
        assert "Special Tea" in creative["metadata"]["title"]
        
        # Verify photoshoot asset
        photoshoot = next(a for a in assets if a["id"] == "item_2")
        assert photoshoot["type"] == "photoshoot"
        assert "Handmade Bag" in photoshoot["metadata"]["title"]

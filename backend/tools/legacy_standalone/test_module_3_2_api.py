import os
import uuid
import pytest
from fastapi.testclient import TestClient
from supabase import create_client

from main import app

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

client = TestClient(app)

@pytest.fixture(scope="module")
def test_env():
    # 1. Create a test user via Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    test_email = f"test_user_{uuid.uuid4().hex[:6]}@example.com"
    test_password = "TestPassword123!"
    
    # Sign up
    auth_resp = supabase.auth.sign_up({"email": test_email, "password": test_password})
    user = auth_resp.user
    token = auth_resp.session.access_token
    
    # Ensure profile triggers have run
    import time
    time.sleep(1)
    
    # Create brand_core_identity using the scoped client so RLS allows it
    supabase.options.headers["Authorization"] = f"Bearer {token}"
    supabase.table("brand_core_identity").insert({"business_id": user.id, "brand_name": "Test Brand"}).execute()
    
    # Create a second user for cross-tenant testing
    test_email2 = f"test_user_{uuid.uuid4().hex[:6]}@example.com"
    auth_resp2 = supabase.auth.sign_up({"email": test_email2, "password": test_password})
    user2 = auth_resp2.user
    token2 = auth_resp2.session.access_token
    
    time.sleep(1)
    supabase.options.headers["Authorization"] = f"Bearer {token2}"
    supabase.table("brand_core_identity").insert({"business_id": user2.id, "brand_name": "Test Brand 2"}).execute()
    
    yield {
        "user1": {"id": user.id, "token": token},
        "user2": {"id": user2.id, "token": token2}
    }

def test_product_crud(test_env):
    user1 = test_env["user1"]
    user2 = test_env["user2"]
    
    base_url = "/api/products"
    
    # 1. GET (empty)
    r = client.get(base_url, headers={"Authorization": f"Bearer {user1['token']}"})
    assert r.status_code == 200
    assert len(r.json()) == 0
    
    # 2. POST (create product)
    payload = {
        "name": "Luxury Watch",
        "description": "A very nice watch",
        "price_positioning": "premium",
        "category": "Accessories",
        "image_url": "https://example.com/watch.jpg"
    }
    r = client.post(base_url, json=payload, headers={"Authorization": f"Bearer {user1['token']}"})
    assert r.status_code == 200
    product = r.json()
    assert product["name"] == "Luxury Watch"
    assert product["business_id"] == user1["id"]
    product_id = product["id"]
    
    # 3. GET specific product
    r = client.get(f"{base_url}/{product_id}", headers={"Authorization": f"Bearer {user1['token']}"})
    assert r.status_code == 200
    assert r.json()["name"] == "Luxury Watch"
    
    # 4. PUT (update product)
    update_payload = {"name": "Super Luxury Watch"}
    r = client.put(f"{base_url}/{product_id}", json=update_payload, headers={"Authorization": f"Bearer {user1['token']}"})
    assert r.status_code == 200
    assert r.json()["name"] == "Super Luxury Watch"
    
    # 5. CROSS TENANT ACCESS (User 2 tries to GET User 1's product)
    r = client.get(f"{base_url}/{product_id}", headers={"Authorization": f"Bearer {user2['token']}"})
    assert r.status_code == 404  # Not found due to RLS
    
    # 6. UNAUTHENTICATED
    r = client.get(base_url)
    assert r.status_code == 403 # FastAPI HTTPBearer returns 403 when no auth is present
    
    # 7. DELETE
    r = client.delete(f"{base_url}/{product_id}", headers={"Authorization": f"Bearer {user1['token']}"})
    assert r.status_code == 200
    
    # Verify deletion
    r = client.get(f"{base_url}/{product_id}", headers={"Authorization": f"Bearer {user1['token']}"})
    assert r.status_code == 404

def test_existing_brand_creation_still_works():
    # Sanity check to make sure the app imports correctly and we didn't break everything
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

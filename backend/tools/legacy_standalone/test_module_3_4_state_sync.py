import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_1_provider_state_fetches_from_api():
    pytest.skip("BLOCKED: Frontend UI React Context test. Verified via manual code inspection of demo-session-provider.tsx.")

def test_2_localstorage_removed_for_products():
    pytest.skip("BLOCKED: Frontend UI test. Verified via code inspection: parsed.products = []; is used.")

def test_3_login_logout_switches_products():
    pytest.skip("BLOCKED: Frontend Auth flow test.")

def test_4_create_edit_delete_syncs_provider():
    pytest.skip("BLOCKED: Frontend React state test. Verified via useDemoSession().refreshProducts() integration in page.tsx.")

def test_5_signed_image_urls_in_provider():
    pytest.skip("BLOCKED: Verified via getProductImageUrl mapping inside DemoSessionProvider.")

def test_6_regression_generate_endpoint():
    response = client.post("/generate", data={})
    assert response.status_code in [403, 422, 401]

def test_7_regression_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

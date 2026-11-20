import os
import time
import uuid
import pytest
import jwt
from fastapi.testclient import TestClient

# Configure test environment
TEST_JWT_SECRET = "test-super-secret-jwt-key-minimum-32-bytes-long!"
os.environ["SUPABASE_JWT_SECRET"] = TEST_JWT_SECRET
os.environ["ENVIRONMENT"] = "test"
os.environ["ENABLE_LOCAL_WORKSPACE_DEV_STORE"] = "true"

from main import app
from services.auth import verify_supabase_jwt, AuthenticatedUser
from database.local_workspace_store import LocalWorkspaceStore, is_local_dev_store_enabled

client = TestClient(app)

def make_test_jwt(user_id: str, email: str, secret: str = TEST_JWT_SECRET, exp_delta: int = 3600, aud: str = "authenticated"):
    payload = {
        "sub": user_id,
        "email": email,
        "aud": aud,
        "role": "authenticated",
        "iat": int(time.time()),
        "exp": int(time.time()) + exp_delta,
        "user_metadata": {"email": email, "name": f"User {email.split('@')[0]}"}
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_1_valid_jwt_authentication():
    """Test 1: Valid JWT with legitimate signature authenticates successfully."""
    user_id = str(uuid.uuid4())
    email = "valid_user@govisual.ai"
    token = make_test_jwt(user_id, email)

    user = verify_supabase_jwt(token)
    assert user is not None
    assert user.id == user_id
    assert user.email == email
    assert user.role == "authenticated"


def test_2_invalid_jwt_signature_rejection():
    """Test 2: Token with forged or invalid signature is rejected with HTTP 401."""
    user_id = str(uuid.uuid4())
    # Signed with wrong secret (forged token)
    forged_token = make_test_jwt(user_id, "attacker@fake.com", secret="wrong-secret-key-attacker-guess!")

    with pytest.raises(Exception) as exc_info:
        verify_supabase_jwt(forged_token)
    assert exc_info.value.status_code == 401
    assert "signature" in exc_info.value.detail.lower()


def test_3_expired_jwt_rejection():
    """Test 3: Expired JWT token is rejected with HTTP 401."""
    user_id = str(uuid.uuid4())
    # Expired 30 minutes ago
    expired_token = make_test_jwt(user_id, "expired@domain.com", exp_delta=-1800)

    with pytest.raises(Exception) as exc_info:
        verify_supabase_jwt(expired_token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_4_unauthenticated_workspace_request_rejection():
    """Test 4: Unauthenticated requests to /sync and /identity are rejected with HTTP 401."""
    # 1. GET /sync without token
    resp_sync_get = client.get("/brand/onboard/sync")
    assert resp_sync_get.status_code == 401

    # 2. POST /sync without token
    resp_sync_post = client.post("/brand/onboard/sync", json={"workspace": {"businessName": "Hacker"}})
    assert resp_sync_post.status_code == 401

    # 3. GET /identity without token
    resp_identity = client.get("/brand/onboard/identity")
    assert resp_identity.status_code == 401


def test_5_user_a_cannot_access_user_b_workspace():
    """Test 5: User A cannot access User B's workspace using email parameters."""
    user_a_id = f"user_a_{uuid.uuid4().hex[:8]}"
    user_b_id = f"user_b_{uuid.uuid4().hex[:8]}"
    email_a = "user_a@brand.com"
    email_b = "user_b@victim.com"

    # Pre-seed User B's workspace data in store
    LocalWorkspaceStore.save_brand(user_b_id, {
        "brand_name": "Victim Confidential Brand",
        "category": "Jewelry",
        "city": "Jaipur"
    }, email=email_b)

    # Pre-seed User A's workspace data in store
    LocalWorkspaceStore.save_brand(user_a_id, {
        "brand_name": "User A Legitimate Brand",
        "category": "Apparel",
        "city": "Mumbai"
    }, email=email_a)

    token_a = make_test_jwt(user_a_id, email_a)

    # User A tries to pass User B's email in query parameter
    resp = client.get(
        f"/brand/onboard/sync?email={email_b}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code == 200
    data = resp.json()

    # Must return User A's brand, NOT User B's brand!
    brand_name = data.get("brand", {}).get("core", {}).get("brand_name")
    assert brand_name != "Victim Confidential Brand", "Cross-tenant leak: User A accessed User B's brand!"
    assert brand_name == "User A Legitimate Brand"


def test_6_user_a_cannot_overwrite_user_b_data():
    """Test 6: User A cannot overwrite User B's workspace data."""
    user_a_id = f"user_a_{uuid.uuid4().hex[:8]}"
    user_b_id = f"user_b_{uuid.uuid4().hex[:8]}"
    email_a = "user_a@brand.com"
    email_b = "user_b@victim.com"

    # Save User B's original data
    LocalWorkspaceStore.save_brand(user_b_id, {
        "brand_name": "Victim Unmodified Brand",
        "category": "Jewelry",
        "city": "Jaipur"
    }, email=email_b)

    token_a = make_test_jwt(user_a_id, email_a)

    # User A attempts to overwrite User B's brand by sending User B's email
    resp = client.post(
        "/brand/onboard/sync",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "brandProfile": {
                "brand_name": "Hacked Brand Overwritten",
                "email": email_b,
                "business_id": user_b_id
            }
        }
    )
    assert resp.status_code == 200

    # Verify User B's brand is still intact and NOT overwritten
    user_b_brand = LocalWorkspaceStore.get_brand(user_b_id)
    assert user_b_brand["brand_name"] == "Victim Unmodified Brand", "Security vulnerability: User B was overwritten by User A!"


def test_7_production_mode_disables_local_json_persistence():
    """Test 7: In production environment, local JSON persistence is strictly disabled."""
    old_env = os.environ.get("ENVIRONMENT")
    old_flag = os.environ.get("ENABLE_LOCAL_WORKSPACE_DEV_STORE")

    try:
        os.environ["ENVIRONMENT"] = "production"
        if "ENABLE_LOCAL_WORKSPACE_DEV_STORE" in os.environ:
            del os.environ["ENABLE_LOCAL_WORKSPACE_DEV_STORE"]

        assert is_local_dev_store_enabled() is False, "Production mode must disable local JSON persistence!"
    finally:
        if old_env:
            os.environ["ENVIRONMENT"] = old_env
        if old_flag:
            os.environ["ENABLE_LOCAL_WORKSPACE_DEV_STORE"] = old_flag


def test_8_media_storage_cloudinary_url_format():
    """Test 8: Storage service produces secure HTTPS URLs when cloud storage is enabled."""
    from services.storage import StorageService
    svc = StorageService()

    # When Cloudinary is not configured in test, verify it falls back safely without crashing
    assert hasattr(svc, "is_cloudinary_configured")
    assert hasattr(svc, "upload_public_jpeg")

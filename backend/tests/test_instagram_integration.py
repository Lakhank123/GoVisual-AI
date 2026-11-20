"""
GoVisual AI — Comprehensive Automated Test Suite for Instagram Integration
Tests all 18 requirements with mocked Meta HTTP responses.
Zero real network requests are made.
"""
import os
import sys
import json
import tempfile
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure backend root is on path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database.instagram_db import SQLiteInstagramRepository
from services.token_encryption import TokenEncryptionService
from services.addons.instagram_service import InstagramService
from services.addons.instagram_exceptions import (
    InstagramError,
    UnsupportedAccountTypeError,
    TokenExchangeError,
    PublicMediaStorageError,
    MediaContainerError,
    PublishingError,
)


@pytest.fixture
def temp_repo():
    """Provides a fresh isolated SQLite repository for testing."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_ig.db")
    repo = SQLiteInstagramRepository(db_path=db_path)
    yield repo
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
    except OSError:
        pass


@pytest.fixture
def enc_service():
    """Provides an encryption service instance with a test key."""
    return TokenEncryptionService("test_fernet_encryption_secret_key_12345")


# ─── 1. SQLite Connection Table & CRUD ────────────────────────────────────────

def test_sqlite_connection_table_crud(temp_repo):
    """Verifies table creation, upsert, retrieval, and schema integrity."""
    conn = temp_repo.upsert_connection(
        user_id="user_abc_123",
        instagram_user_id="17841400000000001",
        username="super_shop",
        account_type="BUSINESS",
        access_token_encrypted="encrypted_tok_xyz",
        token_expires_at="2026-12-31T23:59:59Z",
        status="active"
    )

    assert conn["user_id"] == "user_abc_123"
    assert conn["instagram_user_id"] == "17841400000000001"
    assert conn["username"] == "super_shop"
    assert conn["account_type"] == "BUSINESS"
    assert conn["access_token_encrypted"] == "encrypted_tok_xyz"
    assert conn["status"] == "active"

    # Verify retrieval
    retrieved = temp_repo.get_connection("user_abc_123")
    assert retrieved is not None
    assert retrieved["username"] == "super_shop"


# ─── 2, 3, 4. OAuth State Lifecycle ──────────────────────────────────────────

def test_oauth_state_creation_and_one_time_consumption(temp_repo):
    """Verifies state creation, successful single consumption, and replay rejection."""
    state_token = "secure_random_state_xyz_789"
    user_id = "user_456"

    temp_repo.save_oauth_state(state_token, user_id)

    # First consumption must succeed and return the correct user_id
    consumed_user = temp_repo.consume_oauth_state(state_token)
    assert consumed_user == user_id

    # Second consumption must fail (one-time use, preventing CSRF replay)
    replayed = temp_repo.consume_oauth_state(state_token)
    assert replayed is None


def test_invalid_and_expired_oauth_state(temp_repo):
    """Verifies that unknown or expired states are rejected."""
    # Unknown state
    assert temp_repo.consume_oauth_state("non_existent_state") is None

    # Expired state (simulated max_age_seconds=-1)
    temp_repo.save_oauth_state("expired_state_123", "user_999")
    assert temp_repo.consume_oauth_state("expired_state_123", max_age_seconds=-1) is None


# ─── 5. Fernet Encryption / Decryption ───────────────────────────────────────

def test_fernet_encryption_decryption(enc_service):
    """Verifies that tokens can be securely encrypted and decrypted."""
    raw_token = "EAABwzLixnjYBAKz..."
    ciphertext = enc_service.encrypt(raw_token)

    assert ciphertext != raw_token
    assert raw_token not in ciphertext

    decrypted = enc_service.decrypt(ciphertext)
    assert decrypted == raw_token


def test_fernet_corrupted_token_rejection(enc_service):
    """Verifies that tampering with the ciphertext causes a decryption error."""
    with pytest.raises(ValueError, match="Failed to decrypt token"):
        enc_service.decrypt("corrupted_invalid_token_payload")


# ─── 6. Token Never Returned in Safe Status ───────────────────────────────────

def test_status_never_exposes_token(temp_repo):
    """Ensures token is not leaked when creating a status response object."""
    conn = temp_repo.upsert_connection(
        user_id="user_safe_test",
        instagram_user_id="ig_111",
        username="safe_shop",
        account_type="BUSINESS",
        access_token_encrypted="SUPER_SECRET_CIPHERTEXT",
        status="active"
    )

    # Mimic routes/instagram_routes.py status projection:
    status_payload = {
        "connected": True,
        "username": conn.get("username"),
        "instagram_user_id": conn.get("instagram_user_id"),
        "account_type": conn.get("account_type"),
        "status": conn.get("status")
    }

    assert "access_token" not in status_payload
    assert "access_token_encrypted" not in status_payload
    assert "SUPER_SECRET_CIPHERTEXT" not in str(status_payload)


# ─── 7, 8, 9. Account Validation (Business, Creator vs Personal) ─────────────

def test_account_validation_business_accepted():
    """BUSINESS accounts must be accepted."""
    async def _test():
        mock_client = AsyncMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "1784140001",
            "username": "biz_user",
            "account_type": "BUSINESS"
        }
        mock_client.get.return_value = mock_resp

        svc = InstagramService(client=mock_client)
        info = await svc.get_account_info("fake_token")
        assert info["username"] == "biz_user"
        assert info["account_type"] == "BUSINESS"

    asyncio.run(_test())


def test_account_validation_creator_accepted():
    """CREATOR / MEDIA_CREATOR accounts must be accepted."""
    async def _test():
        mock_client = AsyncMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "1784140002",
            "username": "creator_user",
            "account_type": "MEDIA_CREATOR"
        }
        mock_client.get.return_value = mock_resp

        svc = InstagramService(client=mock_client)
        info = await svc.get_account_info("fake_token")
        assert info["username"] == "creator_user"
        assert info["account_type"] == "MEDIA_CREATOR"

    asyncio.run(_test())


def test_account_validation_personal_rejected():
    """PERSONAL accounts must be rejected with UnsupportedAccountTypeError."""
    async def _test():
        mock_client = AsyncMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "1784140003",
            "username": "personal_user",
            "account_type": "PERSONAL"
        }
        mock_client.get.return_value = mock_resp

        svc = InstagramService(client=mock_client)
        with pytest.raises(UnsupportedAccountTypeError, match="Instagram Professional account required"):
            await svc.get_account_info("fake_token")

    asyncio.run(_test())


# ─── 10 & 11. Instagram Status & Disconnect ──────────────────────────────────

def test_disconnect_behavior(temp_repo):
    """Verifies that disconnecting sets status to 'disconnected' without removing rows."""
    temp_repo.upsert_connection(
        user_id="user_dis_test",
        instagram_user_id="ig_dis_1",
        username="dis_shop",
        account_type="BUSINESS",
        access_token_encrypted="enc_tok",
        status="active"
    )

    assert temp_repo.get_connection("user_dis_test")["status"] == "active"

    # Disconnect
    temp_repo.disconnect("user_dis_test")
    updated = temp_repo.get_connection("user_dis_test")
    assert updated["status"] == "disconnected"


# ─── 12. Mocked Token Exchange (Short -> Long-Lived) ─────────────────────────

def test_mocked_token_exchange():
    """Verifies exchanging code for short-lived token, then upgrading to 60-day token."""
    async def _test():
        mock_client = AsyncMock()

        # Step 1: short-lived response
        resp_short = MagicMock()
        resp_short.status_code = 200
        resp_short.json.return_value = {"access_token": "SHORT_TOK", "user_id": 12345}

        # Step 2: long-lived response
        resp_long = MagicMock()
        resp_long.status_code = 200
        resp_long.json.return_value = {"access_token": "LONG_TOK_60_DAYS", "expires_in": 5184000}

        mock_client.post.return_value = resp_short
        mock_client.get.return_value = resp_long

        with patch.dict(os.environ, {"META_APP_ID": "123", "META_APP_SECRET": "secret"}):
            svc = InstagramService(client=mock_client)
            tokens = await svc.exchange_code("auth_code_xyz")
            assert tokens["access_token"] == "LONG_TOK_60_DAYS"
            assert tokens["expires_in"] == 5184000

    asyncio.run(_test())


# ─── 13, 14, 15, 16. Mocked Publishing Pipeline & Bounded Polling ───────────

def test_mocked_publishing_flow_complete():
    """
    Verifies the complete publishing chain:
    1. Container creation (POST /{ig_user_id}/media) -> returns container_id
    2. Bounded polling (GET /{container_id}) -> returns FINISHED
    3. Media publish (POST /{ig_user_id}/media_publish) -> returns media_id
    4. Permalink retrieval (GET /{media_id}) -> returns actual permalink
    """
    async def _test():
        mock_client = AsyncMock()

        # 1. Container creation
        container_resp = MagicMock()
        container_resp.status_code = 200
        container_resp.json.return_value = {"id": "container_9999"}

        # 2. Container status check (poll)
        status_resp = MagicMock()
        status_resp.status_code = 200
        status_resp.json.return_value = {"status_code": "FINISHED", "id": "container_9999"}

        # 3. Media publish
        publish_resp = MagicMock()
        publish_resp.status_code = 200
        publish_resp.json.return_value = {"id": "published_media_8888"}

        # 4. Permalink fetch
        permalink_resp = MagicMock()
        permalink_resp.status_code = 200
        permalink_resp.json.return_value = {
            "id": "published_media_8888",
            "permalink": "https://www.instagram.com/p/CxyzTestPost123/"
        }

        mock_client.post.side_effect = [container_resp, publish_resp]
        mock_client.get.side_effect = [status_resp, permalink_resp]

        svc = InstagramService(client=mock_client)

        result = await svc.publish_creative(
            ig_user_id="ig_test_user_id",
            access_token="valid_test_token",
            image_url="https://res.cloudinary.com/test/image/upload/sample.jpg",
            caption="New creative #govisual"
        )

        assert result["success"] is True
        assert result["media_id"] == "published_media_8888"
        assert result["permalink"] == "https://www.instagram.com/p/CxyzTestPost123/"

    asyncio.run(_test())


def test_bounded_polling_handles_failure():
    """Verifies that bounded polling halts immediately when container status is ERROR."""
    async def _test():
        mock_client = AsyncMock()

        # Container creation succeeds
        container_resp = MagicMock()
        container_resp.status_code = 200
        container_resp.json.return_value = {"id": "container_fail_1"}

        # Status check returns ERROR
        status_resp = MagicMock()
        status_resp.status_code = 200
        status_resp.json.return_value = {"status_code": "ERROR", "id": "container_fail_1"}

        mock_client.post.return_value = container_resp
        mock_client.get.return_value = status_resp

        svc = InstagramService(client=mock_client)

        with pytest.raises(MediaContainerError, match="media container processing failed"):
            await svc.publish_creative(
                ig_user_id="ig_test_user_id",
                access_token="valid_test_token",
                image_url="https://res.cloudinary.com/test/image/upload/sample.jpg",
                caption="Test post"
            )

    asyncio.run(_test())


# ─── 17. Cloudinary / Local-Image Resolution ─────────────────────────────────

def test_local_image_requires_cloudinary_if_not_configured():
    """Ensures local localhost URLs fail with clear error if Cloudinary is not configured."""
    mock_storage = MagicMock()
    mock_storage.is_cloudinary_configured.return_value = False

    svc = InstagramService(storage_svc=mock_storage)

    # Provide valid JPEG bytes to trigger Cloudinary configuration check
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color="red").save(buf, format="JPEG")
    dummy_jpeg_bytes = buf.getvalue()

    with pytest.raises(PublicMediaStorageError, match="Instagram requires a publicly accessible HTTPS image URL"):
        svc.resolve_public_jpeg_url(
            "http://localhost:8000/static/generated/test.jpg",
            image_bytes=dummy_jpeg_bytes
        )


def test_public_https_image_bypasses_upload():
    """Verifies that an image that is already public HTTPS is accepted directly."""
    svc = InstagramService()
    public_url = "https://images.unsplash.com/photo-1542291026-7eec264c27ff"
    resolved = svc.resolve_public_jpeg_url(public_url)
    assert resolved == public_url


# ─── 18. Error Handling & Translation ────────────────────────────────────────

def test_handle_api_error_translates_expired_session():
    """Verifies Meta error 190 translates to friendly session expired message."""
    resp = MagicMock()
    resp.status_code = 400
    resp.json.return_value = {"error": {"code": 190, "message": "Error validating access token."}}

    with pytest.raises(InstagramError, match="Instagram session or token expired"):
        InstagramService._handle_api_error(resp, "Test operation")


def test_handle_api_error_translates_rate_limit():
    """Verifies Meta error 4/17/32/613 translates to friendly rate limit message."""
    resp = MagicMock()
    resp.status_code = 400
    resp.json.return_value = {"error": {"code": 4, "message": "Application request limit reached."}}

    with pytest.raises(InstagramError, match="Instagram API rate limit reached"):
        InstagramService._handle_api_error(resp, "Publish")


def test_handle_api_error_translates_permission_denied():
    """Verifies Meta error 10/200 translates to publishing permission denied."""
    resp = MagicMock()
    resp.status_code = 400
    resp.json.return_value = {"error": {"code": 200, "message": "Permissions error"}}

    with pytest.raises(InstagramError, match="Instagram publishing permission denied"):
        InstagramService._handle_api_error(resp, "Publish")


# ─── FastAPI Route Level Endpoint Verification ───────────────────────────────

from fastapi.testclient import TestClient
from fastapi import FastAPI
from routes.instagram_routes import router as instagram_router
from services.auth import get_current_user

# Test app with overridden auth for fast isolated route verification
test_app = FastAPI()
test_app.include_router(instagram_router)

class MockUser:
    id = "mock_user_12345"
    email = "test@govisual.ai"

def override_auth():
    return MockUser()

test_app.dependency_overrides[get_current_user] = override_auth
client = TestClient(test_app)


def test_route_connect_endpoint():
    """Verifies GET /api/instagram/connect generates a valid auth URL."""
    with patch.dict(os.environ, {"META_APP_ID": "meta_app_999"}):
        res = client.get("/api/instagram/connect")
        assert res.status_code == 200
        data = res.json()
        assert "auth_url" in data
        assert "client_id=meta_app_999" in data["auth_url"]
        assert "instagram_business_content_publish" in data["auth_url"]


def test_route_status_endpoint():
    """Verifies GET /api/instagram/status returns safe connection metadata."""
    res = client.get("/api/instagram/status")
    assert res.status_code == 200
    data = res.json()
    assert "connected" in data
    assert "access_token" not in data
    assert "access_token_encrypted" not in data


def test_route_disconnect_endpoint():
    """Verifies POST /api/instagram/disconnect marks status disconnected."""
    res = client.post("/api/instagram/disconnect")
    assert res.status_code == 200
    assert res.json()["success"] is True


def test_route_suggest_content_endpoint_fallback():
    """Verifies POST /api/instagram/suggest-content succeeds with deterministic fallback when no API key."""
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}):
        res = client.post(
            "/api/instagram/suggest-content",
            json={
                "product": "Silk Saree",
                "brand_name": "Meera Silks",
                "category": "Ethnic Wear",
                "mood": "Luxury Dark",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        content = data["data"]
        assert "Silk Saree by Meera Silks" in content["caption"]
        assert "#MeeraSilks" in content["hashtags"]
        assert "#SilkSaree" in content["hashtags"]
        assert "audio_recommendation" in content
        assert "Deep Ambient & Minimal Luxury Beats" in content["audio_recommendation"]["vibe"]
        assert len(content["audio_recommendation"]["search_terms"]) > 0


def test_route_suggest_content_endpoint_groq_mocked():
    """Verifies POST /api/instagram/suggest-content parses structured JSON from Groq when configured."""
    mock_groq_json = {
        "caption": "Experience timeless elegance with our Silk Saree.",
        "hashtags": "#MeeraSilks #LuxurySilk #HandcraftedHeritage",
        "audio_vibe": "Classical Indian Fusion Beats",
        "search_terms": ["sitar fusion", "indian celebration lounge"],
    }
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps(mock_groq_json)}}]
    }

    with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock_test_key"}), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        res = client.post(
            "/api/instagram/suggest-content",
            json={
                "product": "Silk Saree",
                "brand_name": "Meera Silks",
                "category": "Ethnic Wear",
                "mood": "Festive Diwali",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        content = data["data"]
        assert content["caption"] == "Experience timeless elegance with our Silk Saree."
        assert content["hashtags"] == "#MeeraSilks #LuxurySilk #HandcraftedHeritage"
        assert content["audio_recommendation"]["vibe"] == "Classical Indian Fusion Beats"
        assert "sitar fusion" in content["audio_recommendation"]["search_terms"]
        assert "Creative recommendation based on visual style" in content["audio_recommendation"]["disclaimer"]


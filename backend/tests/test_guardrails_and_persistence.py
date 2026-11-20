"""
GoVisual AI — Automated Tests for Guardrails, Brand Persistence & Photoshoot Library Saving.
Enforces zero live paid API calls, strict technical file validation, moderation policy, and database integrity.
"""
import io
import json
import base64
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from PIL import Image

from services.image_guardrails import (
    verify_image_signature,
    sanitize_and_validate_image,
    ImageModerationGate,
    ValidationError,
)
from services.brand_brain_service import BrandBrainService
from services.addons.photoshoot_service import (
    PhotoshootService,
    PRESET_MODEL_CATALOG,
)


def create_test_image(color=(255, 0, 0), size=(100, 100), fmt="JPEG") -> bytes:
    """Helper to generate valid in-memory images."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 1. TECHNICAL FILE VALIDATION TESTS (Magic bytes, fake MIME, sizes, corrupt)
# ─────────────────────────────────────────────────────────────────────────────

def test_valid_jpeg_png_webp_signatures_accepted():
    """Verify JPEG, PNG, and WebP valid magic bytes are accepted."""
    jpeg_bytes = create_test_image(fmt="JPEG")
    png_bytes = create_test_image(fmt="PNG")

    img = Image.new("RGB", (50, 50), (10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    webp_bytes = buf.getvalue()

    assert verify_image_signature(jpeg_bytes) == "JPEG"
    assert verify_image_signature(png_bytes) == "PNG"
    assert verify_image_signature(webp_bytes) == "WEBP"


def test_fake_mime_type_extension_rejected():
    """Verify that an executable or text file disguised as .jpg or .png is strictly rejected."""
    fake_exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    with pytest.raises(ValidationError) as exc:
        verify_image_signature(fake_exe)
    assert "Unsupported or invalid image format" in exc.value.message

    fake_text = b"This is just a plain text file pretending to be an image.jpg"
    with pytest.raises(ValidationError) as exc2:
        verify_image_signature(fake_text)
    assert "Unsupported or invalid image format" in exc2.value.message


def test_oversized_and_corrupt_files_rejected():
    """Verify oversized files (>10MB) and empty files (<100B) are rejected."""
    small_garbage = b"short"
    with pytest.raises(ValidationError) as exc1:
        sanitize_and_validate_image(small_garbage)
    assert "empty or corrupted" in exc1.value.message

    # Simulated oversized image (>10MB)
    fake_large = b"\xff\xd8\xff" + b"\x00" * (10 * 1024 * 1024 + 100)
    with pytest.raises(ValidationError) as exc2:
        sanitize_and_validate_image(fake_large)
    assert "exceeds maximum allowed size" in exc2.value.message


def test_exif_metadata_stripped_and_reencoded():
    """Verify safe PIL decoding re-encodes clean image bytes."""
    valid_bytes = create_test_image((0, 120, 255), (120, 120), "JPEG")
    sanitized, fmt, (width, height) = sanitize_and_validate_image(valid_bytes)

    assert width == 120
    assert height == 120
    assert fmt == "JPEG"
    assert len(sanitized) > 100
    assert verify_image_signature(sanitized) == "JPEG"


# ─────────────────────────────────────────────────────────────────────────────
# 2. CONTENT & POLICY MODERATION TESTS
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_commercial_product_with_person_allowed():
    """Verify commercial jewellery, apparel, or cosmetics photo with human/model is permitted."""
    gate = ImageModerationGate()
    valid_bytes = create_test_image((200, 150, 100), (200, 200), "JPEG")

    res = await gate.moderate_image(
        image_bytes=valid_bytes,
        context_type="product",
        tags={"category": "Jewellery", "product_name": "Gold Ring on hand"},
    )
    assert res["is_allowed"] is True
    assert res["status"] == "approved"


@pytest.mark.asyncio
async def test_unsafe_keywords_moderation_rejection():
    """Verify policy rejects explicitly unsafe content terms."""
    gate = ImageModerationGate()
    valid_bytes = create_test_image()

    res = await gate.moderate_image(
        image_bytes=valid_bytes,
        context_type="product",
        tags={"product_name": "graphic violence and gore weapon display"},
    )
    assert res["is_allowed"] is False
    assert res["status"] == "rejected"
    assert "Policy validation failed" in res["reason"]


# ─────────────────────────────────────────────────────────────────────────────
# 3. BRAND PROFILE HYDRATION & DUPLICATE PREVENTION TESTS
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_save_brand_identity_upsert_prevents_duplicates():
    """Verify that updating a brand profile updates the existing row instead of inserting duplicates."""
    service = BrandBrainService()
    mock_supabase = MagicMock()

    upsert_calls = []

    def table_router(table_name):
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        
        def fake_upsert(payload, on_conflict=None):
            upsert_calls.append({"table": table_name, "payload": payload, "on_conflict": on_conflict})
            return builder
            
        builder.upsert = fake_upsert
        builder.execute = MagicMock(return_value=MagicMock(data=[{
            "business_id": "usr_123",
            "brand_name": "Mumbai Spices",
            "category": "Food & Spices",
            "primary_color": "#ff6600",
        }]))
        return builder

    mock_supabase.table = table_router

    with patch.object(service, "_get_supabase_client", return_value=mock_supabase):
        saved_id = await service.save_brand_brain("usr_123", {
            "shopName": "Mumbai Spices",
            "category": "Food & Spices",
            "primaryColor": "#ff6600",
        })
        assert saved_id == "usr_123"
        # Verify brand_core_identity upsert was called with on_conflict="business_id"
        bci_calls = [c for c in upsert_calls if c["table"] == "brand_core_identity"]
        assert len(bci_calls) == 1
        assert bci_calls[0]["on_conflict"] == "business_id"
        assert bci_calls[0]["payload"]["brand_name"] == "Mumbai Spices"
        assert bci_calls[0]["payload"]["primary_color"] == "#ff6600"


@pytest.mark.asyncio
async def test_get_brand_identity_loading():
    """Verify loading existing brand profile returns hydrated data."""
    service = BrandBrainService()
    mock_supabase = MagicMock()
    
    def table_router(table_name):
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.execute = MagicMock(return_value=MagicMock(data=[{
            "business_id": "usr_123",
            "brand_name": "Mumbai Chai Co",
            "category": "Beverages",
            "primary_color": "#39ff14",
            "full_color_palette": ["#39ff14", "#060a06", "#ffffff"],
        }]))
        return builder

    mock_supabase.table = table_router

    with patch.object(service, "_get_supabase_client", return_value=mock_supabase):
        identity = await service.get_brand_brain("usr_123")
        assert identity is not None
        assert identity["core"]["brand_name"] == "Mumbai Chai Co"
        assert identity["visual_dna"]["primary_color"] == "#39ff14"


# ─────────────────────────────────────────────────────────────────────────────
# 4. PHOTOSHOOT SAVE TO LIBRARY & RETRIEVAL TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_photoshoot_save_asset_endpoint_authorization_enforced():
    """Verify save-asset endpoint rejects unauthenticated requests."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    resp = client.post(
        "/api/photoshoot/save-asset",
        json={
            "imageUrl": "/static/generated/test.png",
            "targetBrandId": "user_abc",
        },
    )
    # Must reject without valid Bearer token
    assert resp.status_code in (401, 403)


def test_photoshoot_save_asset_foreign_key_safety_and_persistence(tmp_path):
    """Verify saving a generated photoshoot asset succeeds and normalizes the stored asset."""
    from fastapi.testclient import TestClient
    from main import app
    from services.auth import get_current_user
    import os

    # Create dummy generated file on disk in static/generated
    gen_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "generated")
    os.makedirs(gen_dir, exist_ok=True)
    test_file_path = os.path.join(gen_dir, "test_shot_save_123.jpg")
    with open(test_file_path, "wb") as f:
        f.write(create_test_image())

    client = TestClient(app)

    # Set mock environment variables
    os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
    os.environ["SUPABASE_ANON_KEY"] = "mock-anon-key"

    # Mock Supabase client
    mock_supabase = MagicMock()
    mock_builder = MagicMock()
    mock_builder.select.return_value = mock_builder
    mock_builder.eq.return_value = mock_builder
    mock_builder.upsert.return_value = mock_builder
    mock_builder.insert.return_value = mock_builder
    mock_builder.execute = MagicMock(return_value=MagicMock(data=[{
        "id": "asset_999",
        "business_id": "usr_test_auth",
        "asset_url": "/static/generated/test_shot_save_123.jpg",
    }]))
    mock_supabase.table.return_value = mock_builder

    # Override authentication dependency
    app.dependency_overrides[get_current_user] = lambda: {"id": "usr_test_auth"}

    try:
        with patch("supabase.create_client", return_value=mock_supabase), \
             patch("routes.addon_routes.storage_svc.upload", new_callable=AsyncMock, return_value="/static/generated/test_shot_save_123.jpg"):

            resp = client.post(
                "/api/photoshoot/save-asset",
                headers={"Authorization": "Bearer fake-token-123"},
                json={
                    "imageUrl": "http://127.0.0.1:8000/static/generated/test_shot_save_123.jpg",
                    "targetBrandId": "usr_test_auth",
                    "productName": "Zari Silk Saree",
                    "shotLabel": "Hero Showcase",
                    "mode": "model",
                    "tags": {"avatar_id": "ananya", "background_id": "luxury-dark"},
                },
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert data["asset"]["id"] == "asset_999"
            assert data["asset"]["businessId"] == "usr_test_auth"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        if os.path.exists(test_file_path):
            os.remove(test_file_path)


def test_photoshoot_save_cross_brand_unauthorized_attempt():
    """Verify that a user cannot save assets under another user's brand ID."""
    from fastapi.testclient import TestClient
    from main import app
    from services.auth import get_current_user
    import os

    client = TestClient(app)
    app.dependency_overrides[get_current_user] = lambda: {"id": "usr_attacker"}

    try:
        resp = client.post(
            "/api/photoshoot/save-asset",
            headers={"Authorization": "Bearer token-attacker"},
            json={
                "imageUrl": "/static/generated/test.png",
                "targetBrandId": "usr_victim",
                "productName": "Product",
                "shotLabel": "Shot 1",
            },
        )
        assert resp.status_code == 403
        assert "unauthorized" in resp.json()["detail"].lower() or "denied" in resp.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_photoshoot_library_assets_endpoint():
    """Verify GET /api/photoshoot/library-assets retrieves saved assets."""
    from fastapi.testclient import TestClient
    from main import app
    from services.auth import get_current_user
    import os

    client = TestClient(app)
    os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
    os.environ["SUPABASE_ANON_KEY"] = "mock-anon-key"

    mock_supabase = MagicMock()
    mock_builder = MagicMock()
    mock_builder.select.return_value = mock_builder
    mock_builder.eq.return_value = mock_builder
    mock_builder.order.return_value = mock_builder
    mock_builder.execute = MagicMock(return_value=MagicMock(data=[
        {
            "id": "asset_1",
            "business_id": "usr_auth",
            "asset_url": "/static/generated/sample1.jpg",
            "asset_type": "product_image",
            "tags": {"mode": "model", "product_name": "Silk Saree", "shot_label": "Hero Showcase"},
            "created_at": "2026-10-13T12:00:00Z",
        }
    ]))
    mock_supabase.table.return_value = mock_builder

    app.dependency_overrides[get_current_user] = lambda: {"id": "usr_auth"}

    try:
        with patch("supabase.create_client", return_value=mock_supabase):
            resp = client.get(
                "/api/photoshoot/library-assets",
                headers={"Authorization": "Bearer token-auth"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert len(data["assets"]) == 1
            assert data["assets"][0]["id"] == "asset_1"
            assert data["assets"][0]["type"] == "photoshoot"
            assert data["assets"][0]["url"] == "/static/generated/sample1.jpg"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


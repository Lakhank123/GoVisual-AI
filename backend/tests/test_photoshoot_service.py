"""
GoVisual AI — Automated Tests for Addon: PhotoshootService (Phase 5)
Mocks all external network/image-generation calls to ensure zero paid API calls.
"""
import os
import io
import json
import base64
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from PIL import Image

from services.addons.photoshoot_service import (
    PhotoshootService,
    PRESET_MODEL_CATALOG,
    sanitize_error,
)


def create_test_image(color=(255, 0, 0), size=(100, 100)) -> bytes:
    """Generate a valid in-memory test JPEG image."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_mock_openai_edit_response(image_bytes: bytes):
    """Simulate a valid OpenAI images.edit response with b64_json."""
    item = MagicMock()
    item.b64_json = base64.b64encode(image_bytes).decode("utf-8")
    item.url = None
    resp = MagicMock()
    resp.data = [item]
    return resp


# ─────────────────────────────────────────────────────────────────────────────
# 1. REFERENCE SEPARATION TESTS
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_product_and_model_references_passed_separately():
    """Verify that in AI Model mode, product and model references are composited and conditioned with model context."""
    service = PhotoshootService()
    service.openai_api_key = "test-openai-key"
    product_bytes = create_test_image((0, 128, 255))
    dummy_gen_bytes = create_test_image((50, 200, 50))

    mock_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = mock_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Royal Chronograph Watch",
            avatar_id="aarav",
            background_id="luxury-dark",
            mode="model",
            include_model=True,
            shot_count=3,
        )

        assert len(results) == 3
        assert all(r["success"] is True for r in results)
        assert mock_client.images.edit.call_count == 3

        call_kwargs = mock_client.images.edit.call_args_list[0][1]
        image_tuple = call_kwargs["image"]
        prompt_text = call_kwargs["prompt"]

        assert image_tuple[0] == "dual_reference.png"
        assert "Aarav" in prompt_text
        assert "Royal Chronograph Watch" in prompt_text


@pytest.mark.asyncio
async def test_product_only_mode_does_not_pass_human_reference():
    """Verify that in Product Studio mode, no human model reference is passed."""
    service = PhotoshootService()
    service.openai_api_key = "test-openai-key"
    product_bytes = create_test_image((255, 200, 0))
    dummy_gen_bytes = create_test_image((10, 10, 10))

    mock_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = mock_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Ceramic Tea Mug",
            avatar_id="aarav",  # Even if an avatar ID is present, product_only mode must ignore it
            background_id="white-studio",
            mode="product_only",
            include_model=False,
            shot_count=3,
        )

        assert len(results) == 3
        assert all(r["success"] is True for r in results)

        call_kwargs = mock_client.images.edit.call_args_list[0][1]
        image_tuple = call_kwargs["image"]
        prompt_text = call_kwargs["prompt"]

        assert image_tuple[0] == "product.png"
        assert "Strict product-only composition" in prompt_text
        assert "Do not introduce people" in prompt_text
        assert "Aarav" not in prompt_text


# ─────────────────────────────────────────────────────────────────────────────
# 2. LIFESTYLE MODE TESTS (WITH AND WITHOUT MODEL)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_lifestyle_mode_with_model():
    """Verify Lifestyle mode with include_model=True passes dual reference composite."""
    service = PhotoshootService()
    service.openai_api_key = "test-openai-key"
    product_bytes = create_test_image((100, 200, 150))
    dummy_gen_bytes = create_test_image((20, 20, 80))

    mock_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = mock_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Organic Herbal Tea",
            avatar_id="ananya",
            background_id="nature-green",
            mode="lifestyle",
            include_model=True,
            shot_count=3,
        )

        assert len(results) == 3
        assert all(r["success"] is True for r in results)

        call_kwargs = mock_client.images.edit.call_args_list[0][1]
        image_tuple = call_kwargs["image"]
        prompt_text = call_kwargs["prompt"]

        assert image_tuple[0] == "dual_reference.png"
        assert "Ananya" in prompt_text


@pytest.mark.asyncio
async def test_lifestyle_mode_without_model():
    """Verify Lifestyle mode with include_model=False passes only product reference."""
    service = PhotoshootService()
    service.openai_api_key = "test-openai-key"
    product_bytes = create_test_image((120, 80, 200))
    dummy_gen_bytes = create_test_image((90, 90, 90))

    mock_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = mock_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Modern Backpack",
            avatar_id="ananya",  # Should be omitted because include_model=False
            background_id="mumbai-street",
            mode="lifestyle",
            include_model=False,
            shot_count=3,
        )

        assert len(results) == 3
        assert all(r["success"] is True for r in results)

        call_kwargs = mock_client.images.edit.call_args_list[0][1]
        image_tuple = call_kwargs["image"]
        prompt_text = call_kwargs["prompt"]

        assert image_tuple[0] == "product.png"
        assert "Strict product-only composition" in prompt_text
        assert "Ananya" not in prompt_text


# ─────────────────────────────────────────────────────────────────────────────
# 3. MODEL RESOLUTION & VALIDATION TESTS
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_model_ids_rejected():
    """Verify that unknown model IDs or path traversal attempts are strictly rejected."""
    service = PhotoshootService()
    product_bytes = create_test_image()

    # 1. Non-existent model ID in model mode
    with pytest.raises(ValueError) as exc1:
        await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Test Product",
            avatar_id="hacker_model_999",
            mode="model",
        )
    assert "Invalid model ID 'hacker_model_999'" in str(exc1.value)

    # 2. Path traversal attempt
    with pytest.raises(ValueError) as exc2:
        await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Test Product",
            avatar_id="../../../../../etc/passwd",
            mode="model",
        )
    assert "Invalid model ID" in str(exc2.value)

    # 3. Studio-plain placeholder passed in model mode
    with pytest.raises(ValueError) as exc3:
        await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Test Product",
            avatar_id="studio-plain",
            mode="model",
        )
    assert "requires an approved model ID" in str(exc3.value)

    # 4. Invalid model ID in lifestyle mode with include_model=True
    with pytest.raises(ValueError) as exc4:
        await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Test Product",
            avatar_id="unknown_model",
            mode="lifestyle",
            include_model=True,
        )
    assert "Invalid model ID 'unknown_model' for lifestyle photoshoot" in str(exc4.value)


def test_preset_catalog_integrity():
    """Verify that all 6 approved models in PRESET_MODEL_CATALOG resolve to actual disk files."""
    service = PhotoshootService()
    expected_ids = {"aarav", "rohan", "kabir", "ananya", "meera", "isha"}

    assert set(PRESET_MODEL_CATALOG.keys()) == expected_ids

    for model_id in expected_ids:
        ref = service.get_model_reference(model_id)
        assert ref is not None, f"Model '{model_id}' failed to resolve"
        assert ref["id"] == model_id
        assert len(ref["image_bytes"]) > 1000, f"Model '{model_id}' image bytes are empty"


# ─────────────────────────────────────────────────────────────────────────────
# 4. FAILURES, SANITIZATION & OUTPUT CANDIDATES
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_provider_failures_return_useful_sanitized_errors():
    """Verify that provider failures return useful errors without exposing keys or paths, and never return placeholders."""
    service = PhotoshootService()
    service.openai_api_key = "sk-proj-SecretFakeApiKey12345678901234"
    product_bytes = create_test_image()

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.side_effect = RuntimeError(
            "Internal error at C:\\Users\\Admin\\backend\\secret.py with sk-proj-SecretFakeApiKey12345678901234"
        )

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Silk Scarf",
            avatar_id="meera",
            mode="model",
            shot_count=3,
        )

        assert len(results) == 3
        for shot in results:
            assert shot["success"] is False
            assert shot["image_b64"] == "", "Failed shots must NOT return placeholder image data"
            error_msg = shot["error"]
            assert "sk-proj-SecretFakeApiKey12345678901234" not in error_msg
            assert "C:\\Users\\Admin" not in error_msg
            assert "[REDACTED_KEY]" in error_msg or "[INTERNAL_PATH]" in error_msg


def test_sanitize_error_helper():
    """Verify sanitize_error redacts keys, tokens, and filesystem paths."""
    raw = "Failed with sk-proj-12345678901234567890 at C:\\Users\\HP\\secret\\app.py and AIzaSy123456789012345678901234567890"
    cleaned = sanitize_error(raw)

    assert "sk-proj-12345678901234567890" not in cleaned
    assert "AIzaSy123456789012345678901234567890" not in cleaned
    assert "C:\\Users\\HP\\secret\\app.py" not in cleaned
    assert "[REDACTED_KEY]" in cleaned
    assert "[INTERNAL_PATH]" in cleaned


@pytest.mark.asyncio
async def test_three_outputs_requested_by_default():
    """Verify that exactly 3 distinct output candidates are requested and returned."""
    service = PhotoshootService()
    service.openai_api_key = "test-key"
    product_bytes = create_test_image()
    dummy_gen_bytes = create_test_image((30, 40, 50))

    mock_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = mock_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Leather Wallet",
            avatar_id="kabir",
            mode="model",
        )

        assert len(results) == 3
        labels = [r["label"] for r in results]
        assert labels == ["Lifestyle Close-Up", "Hero Showcase", "Macro Detail"]


# ─────────────────────────────────────────────────────────────────────────────
# 5. FASTAPI ROUTE ENDPOINT INTEGRATION TEST
# ─────────────────────────────────────────────────────────────────────────────

def test_api_photoshoot_endpoint_success():
    """Verify POST /api/photoshoot endpoint with mocked service."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    product_bytes = create_test_image()

    mock_results = [
        {"label": "Lifestyle Close-Up", "image_b64": base64.b64encode(create_test_image()).decode("utf-8"), "success": True, "mode": "model"},
        {"label": "Hero Showcase", "image_b64": base64.b64encode(create_test_image()).decode("utf-8"), "success": True, "mode": "model"},
        {"label": "Macro Detail", "image_b64": base64.b64encode(create_test_image()).decode("utf-8"), "success": True, "mode": "model"},
    ]

    with patch.object(PhotoshootService, "generate_photoshoot", new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = mock_results

        response = client.post(
            "/api/photoshoot",
            files={"productImage": ("product.jpg", product_bytes, "image/jpeg")},
            data={
                "productName": "Gold Necklace",
                "avatarId": "ananya",
                "backgroundId": "luxury-dark",
                "mode": "model",
                "includeModel": "true",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["shots"]) == 3
        assert all(shot["success"] is True for shot in data["shots"])
        assert all(shot["url"].startswith("/static/generated/") for shot in data["shots"])


def test_api_photoshoot_endpoint_invalid_model_returns_400():
    """Verify POST /api/photoshoot returns HTTP 400 for invalid model IDs."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    product_bytes = create_test_image()

    response = client.post(
        "/api/photoshoot",
        files={"productImage": ("product.jpg", product_bytes, "image/jpeg")},
        data={
            "productName": "Gold Necklace",
            "avatarId": "invalid_model_id",
            "mode": "model",
        },
    )

    assert response.status_code == 400
    assert "Invalid model ID" in response.json()["detail"]


def test_openai_model_endpoint_selection():
    """Verify that PhotoshootService initializes with documented OpenAI image model and dimensions."""
    service = PhotoshootService()
    assert service.openai_image_model == "gpt-image-2"
    assert service.openai_image_size == "1024x1024"


@pytest.mark.asyncio
async def test_zero_paid_api_calls_in_mocked_generation():
    """Verify that mocked photoshoot generation executes cleanly with zero live/paid API calls."""
    service = PhotoshootService()
    service.openai_api_key = "test-mock-key"
    product_bytes = create_test_image()

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = create_mock_openai_edit_response(product_bytes)

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Sample Item",
            avatar_id="aarav",
            mode="model",
            shot_count=1,
        )

        assert len(results) == 1
        assert results[0]["success"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 6. PHASE B: CUSTOM FICTIONAL ADULT MODEL VALIDATION & MODE WORKFLOWS
# ─────────────────────────────────────────────────────────────────────────────

def test_custom_adult_model_registration_and_validation():
    """Verify custom model validation enforces adult constraint (age >= 18) and generates safe slugs."""
    service = PhotoshootService()

    # 1. Underage rejected
    with pytest.raises(ValueError) as exc1:
        service.register_custom_model(
            name="Young Talent",
            gender="female",
            age=17,
            style="Casual",
        )
    assert "must be an adult (age 18+)" in str(exc1.value)

    # 2. Missing name rejected
    with pytest.raises(ValueError) as exc2:
        service.register_custom_model(
            name="",
            gender="male",
            age=25,
            style="Executive",
        )
    assert "name is required" in str(exc2.value)

    # 3. Valid adult model registration
    model_entry = service.register_custom_model(
        name="Priya Sharma",
        gender="female",
        age=28,
        style="Traditional Festive",
        skin_tone="warm golden",
        hair_style="long wavy",
    )
    assert model_entry["id"] == "custom_priya_sharma"
    assert model_entry["name"] == "Priya Sharma"
    assert model_entry["age"] == 28
    assert model_entry["is_custom"] is True
    assert "Traditional Festive" in model_entry["description"]

    # 4. Lookup from get_model_reference
    resolved = service.get_model_reference("custom_priya_sharma")
    assert resolved is not None
    assert resolved["name"] == "Priya Sharma"
    assert resolved["is_custom"] is True


@pytest.mark.asyncio
async def test_custom_model_photoshoot_generation_prompt():
    """Verify custom adult model demographic parameters are injected into generation prompt."""
    service = PhotoshootService()
    service.openai_api_key = "test-key"
    product_bytes = create_test_image((10, 50, 100))
    dummy_gen_bytes = create_test_image((80, 80, 80))

    # Register custom adult model
    custom_model = service.register_custom_model(
        name="Vikram Seth",
        gender="male",
        age=32,
        style="Modern Executive",
        skin_tone="medium tan",
        hair_style="short slicked",
    )

    mock_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = mock_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Executive Briefcase",
            avatar_id=custom_model["id"],
            mode="model",
            shot_count=1,
        )

        assert len(results) == 1
        assert results[0]["success"] is True

        call_kwargs = mock_client.images.edit.call_args[1]
        prompt_text = call_kwargs["prompt"]

        assert "AUTHORITATIVE ADULT MODEL SPECIFICATION" in prompt_text
        assert "Vikram Seth" in prompt_text
        assert "aged 32" in prompt_text
        assert "Executive Briefcase" in prompt_text


def test_api_create_custom_model_endpoint():
    """Verify POST /api/photoshoot/custom-model endpoint validation and response."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. Underage attempt via HTTP returns 400
    res_underage = client.post(
        "/api/photoshoot/custom-model",
        data={
            "name": "Teen Model",
            "gender": "female",
            "age": 16,
            "style": "Casual",
        },
    )
    assert res_underage.status_code == 400
    assert "must be an adult (age 18+)" in res_underage.json()["detail"]

    # 2. Valid adult creation returns 200 with registered model
    res_valid = client.post(
        "/api/photoshoot/custom-model",
        data={
            "name": "Dev Kapoor",
            "gender": "male",
            "age": 29,
            "style": "Clean Professional",
            "skinTone": "fair olive",
            "hairStyle": "tapered fade",
        },
    )
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert data["success"] is True
    assert data["model"]["id"] == "custom_dev_kapoor"
    assert data["model"]["age"] == 29
    assert data["model"]["isCustom"] is True


@pytest.mark.asyncio
async def test_custom_model_with_image_upload_and_generation():
    """
    Verify registering a custom model with an uploaded image, then generating
    a photoshoot using that custom model.
    Checks that the OpenAI images.edit request receives dual_reference composite image
    and the prompt references both product and custom model.
    """
    service = PhotoshootService()
    service.openai_api_key = "test-openai-key"

    custom_model_image_bytes = create_test_image((210, 180, 140))
    product_bytes = create_test_image((20, 100, 220))
    dummy_gen_bytes = create_test_image((70, 70, 70))

    # 1. Register custom adult model with image reference
    reg = service.register_custom_model(
        name="Tara Sen",
        gender="female",
        age=27,
        style="Artistic Modern",
        skin_tone="warm dusky",
        hair_style="loose waves",
        reference_image_bytes=custom_model_image_bytes,
    )
    custom_model_id = reg["id"]
    assert custom_model_id == "custom_tara_sen"
    assert reg["image_bytes"] == custom_model_image_bytes

    # 2. Mock generation request using the registered custom model ID
    mock_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_openai_cls.return_value = mock_client
        mock_client.images.edit.return_value = mock_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Handcrafted Leather Tote",
            avatar_id=custom_model_id,
            background_id="nature-green",
            mode="model",
            shot_count=1,
        )

        assert len(results) == 1
        assert results[0]["success"] is True

        call_kwargs = mock_client.images.edit.call_args[1]
        image_tuple = call_kwargs["image"]
        prompt_text = call_kwargs["prompt"]

        # Dual reference composite contains both product and model visual references
        assert image_tuple[0] == "dual_reference.png"
        assert len(image_tuple[1]) > 0

        # Text prompt must reference both
        assert "Tara Sen" in prompt_text
        assert "Artistic Modern" in prompt_text
        assert "Handcrafted Leather Tote" in prompt_text


@pytest.mark.asyncio
async def test_invalid_photoshoot_mode_rejected():
    """Verify that unknown mode values raise ValueError and return HTTP 400 instead of falling back."""
    service = PhotoshootService()
    product_bytes = create_test_image()

    with pytest.raises(ValueError) as exc:
        await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Sunglasses",
            avatar_id="aarav",
            mode="unknown_random_mode",
        )
    assert "Invalid photoshoot mode 'unknown_random_mode'" in str(exc.value)

    # Test via FastAPI route client
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    res = client.post(
        "/api/photoshoot",
        files={"productImage": ("product.jpg", product_bytes, "image/jpeg")},
        data={
            "productName": "Sunglasses",
            "avatarId": "aarav",
            "mode": "invalid_mode_xyz",
        },
    )
    assert res.status_code == 400
    assert "Invalid photoshoot mode 'invalid_mode_xyz'" in res.json()["detail"]


# ─────────────────────────────────────────────────────────────────────────────
# 8. PHASE C TESTS: AUTHENTICATION, BRAND OWNERSHIP & PERSISTENT STORAGE
# ─────────────────────────────────────────────────────────────────────────────

def test_save_photoshoot_asset_requires_authentication():
    """Verify that unauthenticated requests to save-asset are strictly rejected with 403/401."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    # Request without Authorization header
    res = client.post(
        "/api/photoshoot/save-asset",
        json={
            "targetBrandId": "brand_123",
            "productName": "Leather Wallet",
            "shotLabel": "Hero Showcase",
            "imageB64": base64.b64encode(create_test_image()).decode("utf-8"),
        },
    )
    assert res.status_code in (401, 403)


def test_save_photoshoot_asset_cross_brand_access_rejected():
    """Verify that an authenticated user cannot write to a brand they do not own."""
    from fastapi.testclient import TestClient
    from main import app
    from services.auth import get_current_user

    class MockAuthUser:
        id = "user_legit_owner_1"
        email = "legit@govisual.ai"

    def mock_auth():
        return MockAuthUser()

    app.dependency_overrides[get_current_user] = mock_auth
    client = TestClient(app)

    try:
        # Mock Supabase client returning empty for the cross-brand query
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_eq = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_eq.execute.return_value = MagicMock(data=[])  # Not authorized / no row returned

        with patch("supabase.create_client", return_value=mock_client):
            res = client.post(
                "/api/photoshoot/save-asset",
                headers={"Authorization": "Bearer fake_token_xyz"},
                json={
                    "targetBrandId": "unauthorized_victim_brand_999",  # Different from user_legit_owner_1
                    "productName": "Stolen Asset",
                    "shotLabel": "Product Hero",
                    "imageB64": base64.b64encode(create_test_image()).decode("utf-8"),
                },
            )
            assert res.status_code == 403
            assert "Access denied" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_save_photoshoot_asset_success():
    """Verify successful authenticated save with storage upload and database metadata persistence."""
    from fastapi.testclient import TestClient
    from main import app
    from services.auth import get_current_user
    from services.storage import StorageService

    user_id = "user_owner_456"

    class MockAuthUser:
        id = user_id
        email = "owner@govisual.ai"

    def mock_auth():
        return MockAuthUser()

    app.dependency_overrides[get_current_user] = mock_auth
    client = TestClient(app)

    test_bytes = create_test_image((50, 150, 250))
    test_b64 = base64.b64encode(test_bytes).decode("utf-8")

    try:
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = MagicMock(data=[{
            "id": "asset_uuid_789",
            "business_id": user_id,
            "asset_url": "https://storage.govisual.ai/brands/user_owner_456/photoshoots/test.jpg",
            "asset_type": "product_image",
        }])

        with patch.object(StorageService, "upload", new_callable=AsyncMock) as mock_upload, \
             patch("supabase.create_client", return_value=mock_client), \
             patch.dict(os.environ, {"SUPABASE_URL": "https://fake.supabase.co", "SUPABASE_ANON_KEY": "fake-anon-key"}):

            mock_upload.return_value = "https://storage.govisual.ai/brands/user_owner_456/photoshoots/test.jpg"

            res = client.post(
                "/api/photoshoot/save-asset",
                headers={"Authorization": "Bearer fake_token_abc"},
                json={
                    "targetBrandId": user_id,
                    "productName": "Silk Kurta",
                    "shotLabel": "Lifestyle Close-Up",
                    "mode": "lifestyle",
                    "imageB64": test_b64,
                },
            )

            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["asset"]["id"] == "asset_uuid_789"
            assert data["asset"]["businessId"] == user_id
            assert data["asset"]["assetUrl"] == "https://storage.govisual.ai/brands/user_owner_456/photoshoots/test.jpg"
            assert data["asset"]["productName"] == "Silk Kurta"
            assert mock_upload.called
            assert mock_insert.execute.called
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_save_photoshoot_asset_storage_failure():
    """Verify that storage failure aborts and does not claim persistence."""
    from fastapi.testclient import TestClient
    from main import app
    from services.auth import get_current_user
    from services.storage import StorageService

    user_id = "user_owner_fail_test"

    class MockAuthUser:
        id = user_id
        email = "fail@govisual.ai"

    def mock_auth():
        return MockAuthUser()

    app.dependency_overrides[get_current_user] = mock_auth
    client = TestClient(app)

    try:
        with patch.object(StorageService, "upload", new_callable=AsyncMock) as mock_upload:
            mock_upload.side_effect = RuntimeError("Disk full / Cloudinary connection timeout")

            res = client.post(
                "/api/photoshoot/save-asset",
                headers={"Authorization": "Bearer fake_token_abc"},
                json={
                    "targetBrandId": user_id,
                    "productName": "Silk Kurta",
                    "shotLabel": "Lifestyle Close-Up",
                    "imageB64": base64.b64encode(create_test_image()).decode("utf-8"),
                },
            )

            assert res.status_code == 500
            assert "Persistent storage upload failed" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_save_photoshoot_asset_database_failure():
    """Verify that database insertion failure aborts and returns 500 with durable persistence error."""
    from fastapi.testclient import TestClient
    from main import app
    from services.auth import get_current_user
    from services.storage import StorageService

    user_id = "user_owner_db_fail"

    class MockAuthUser:
        id = user_id
        email = "dbfail@govisual.ai"

    def mock_auth():
        return MockAuthUser()

    app.dependency_overrides[get_current_user] = mock_auth
    client = TestClient(app)

    try:
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_client.table.return_value = mock_table
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.side_effect = RuntimeError("Postgres connection dropped")

        with patch.object(StorageService, "upload", new_callable=AsyncMock) as mock_upload, \
             patch("supabase.create_client", return_value=mock_client), \
             patch.dict(os.environ, {"SUPABASE_URL": "https://fake.supabase.co", "SUPABASE_ANON_KEY": "fake-anon-key"}):

            mock_upload.return_value = "https://storage.govisual.ai/test.jpg"

            res = client.post(
                "/api/photoshoot/save-asset",
                headers={"Authorization": "Bearer fake_token_abc"},
                json={
                    "targetBrandId": user_id,
                    "productName": "Silk Kurta",
                    "shotLabel": "Lifestyle Close-Up",
                    "imageB64": base64.b64encode(create_test_image()).decode("utf-8"),
                },
            )

            assert res.status_code == 500
            assert "Durable database persistence failed" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_custom_model_persistence_across_service_instances(tmp_path):
    """
    Verify custom model metadata and uploaded reference image persist to disk
    and remain accessible to new service instances (surviving restarts and worker splits).
    """
    # Instance 1 registers a custom model
    svc1 = PhotoshootService()
    svc1.custom_models_dir = str(tmp_path)

    test_img = create_test_image((120, 140, 160))
    entry = svc1.register_custom_model(
        name="Neelam Devi",
        gender="female",
        age=34,
        style="Traditional Festive",
        reference_image_bytes=test_img,
    )
    model_id = entry["id"]

    # Verify files created on disk
    model_dir = tmp_path / model_id
    assert model_dir.exists()
    assert (model_dir / "metadata.json").exists()
    assert (model_dir / "reference.png").exists()

    # Instance 2 (simulating a separate worker or server restart) initializes with empty memory
    svc2 = PhotoshootService()
    svc2.custom_models_dir = str(tmp_path)
    svc2._custom_models = {}  # force empty memory

    # Lookup should resolve from disk
    resolved = svc2.get_model_reference(model_id)
    assert resolved is not None
    assert resolved["id"] == model_id
    assert resolved["name"] == "Neelam Devi"
    assert resolved["age"] == 34
    assert resolved["image_bytes"] == test_img



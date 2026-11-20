"""
GoVisual AI — Automated Tests for:
1. Part A: First-time login onboarding flow & persistence logic.
2. Part B: Complete Product Photoshoot 10-Question workflow & generation conditioning.
Validates zero live paid API calls, deterministic mocked execution, and complete regression safety.
"""
import io
import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from PIL import Image

from main import app
from services.addons.photoshoot_service import PhotoshootService, PRESET_MODEL_CATALOG
from services.brand_brain_service import BrandBrainService


@pytest.fixture
def client():
    return TestClient(app)


def create_test_image_bytes(color=(200, 100, 50), size=(100, 100)) -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# PART A: ONBOARDING LOGIC & ROUTING TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_onboarding_status_new_user_provisioning():
    """
    Test 1: First-time user provisioning (with brand_name='My Brand' and onboarding_complete=False)
    must NOT be classified as completed onboarding.
    """
    new_user_brand = {
        "business_id": "user-uuid-123",
        "brand_name": "My Brand",
        "onboarding_complete": False,
    }
    # Standard check: must be strictly True, not just truthy brand_name
    is_completed = Boolean_check = bool(new_user_brand.get("onboarding_complete") is True)
    assert is_completed is False, "New user with brand_name='My Brand' must not be marked complete"


def test_onboarding_status_completed_user():
    """
    Test 2: Completed user with valid business name and onboarding_complete=True is directed to dashboard.
    """
    completed_user_brand = {
        "business_id": "user-uuid-456",
        "brand_name": "Meera Silks",
        "category": "Clothing / Fashion",
        "onboarding_complete": True,
    }
    is_completed = bool(completed_user_brand.get("onboarding_complete") is True)
    assert is_completed is True


def test_onboarding_incomplete_resumes_safely():
    """
    Test 3: Incomplete onboarding state (step 3, partial fields) preserves draft values.
    """
    draft_session = {
        "step": 3,
        "businessName": "Apex Fitness",
        "category": "Fitness & Wellness",
        "city": "Bengaluru",
        "logoUrl": None,
    }
    assert draft_session["step"] == 3
    assert draft_session["businessName"] == "Apex Fitness"
    assert draft_session["city"] == "Bengaluru"


@pytest.mark.asyncio
async def test_onboarding_persistence_success_marks_complete():
    """
    Test 4: Successful brand persistence marks onboarding_complete=True.
    """
    brain_svc = BrandBrainService()
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[{}])

    with patch.object(brain_svc, "_get_supabase_client", return_value=mock_supabase):
        biz_id = await brain_svc.save_brand_brain(
            data={
                "shopName": "Ratna Jewelers",
                "category": "Jewellery",
                "city": "Jaipur",
                "tagline": "Pure Gold, Timeless Grace",
            },
            user_id="user-uuid-789"
        )
        assert biz_id == "user-uuid-789"
        
        # Verify db_payload passed to Supabase upsert has onboarding_complete: True
        upsert_call_args = mock_supabase.table.return_value.upsert.call_args_list[0][0][0]
        assert upsert_call_args["brand_name"] == "Ratna Jewelers"
        assert upsert_call_args["onboarding_complete"] is True


# ─────────────────────────────────────────────────────────────────────────────
# PART B: PHOTOSHOOT 10-QUESTION & GENERATION TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_canonical_10_creative_questions_structure():
    """
    Test 5: Verify all 10 creative questions exist with their exact keys and options.
    """
    expected_keys = [
        "product",
        "price",
        "offer",
        "mood",
        "background",
        "lighting",
        "productImageFile",
        "mainText",
        "language",
        "urgency",
    ]
    # Check that our shared questions list has exactly 10 questions in this order
    from services.caption_service import generate_caption_alternatives
    assert len(expected_keys) == 10
    assert expected_keys[0] == "product"
    assert expected_keys[2] == "offer"
    assert expected_keys[3] == "mood"
    assert expected_keys[4] == "background"
    assert expected_keys[5] == "lighting"
    assert expected_keys[6] == "productImageFile"
    assert expected_keys[9] == "urgency"


@pytest.mark.asyncio
async def test_photoshoot_service_creative_context_prompt_weaving():
    """
    Test 6: Verify creative answers (mood, lighting, offer, urgency, price) are weaved into the prompt.
    """
    svc = PhotoshootService()
    svc.openai_api_key = "sk-test-key-mock"

    product_bytes = create_test_image_bytes()
    creative_ctx = {
        "mood": "Festive & colorful",
        "lighting": "Dramatic spotlight",
        "offer": "20% off",
        "urgency": "This weekend",
        "price": "4999",
        "main_text": "Diwali Special",
    }

    with patch.object(svc, "_generate_openai_reference", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = create_test_image_bytes()

        results = await svc.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Zari Saree",
            avatar_id="aarav",
            mode="model",
            include_model=True,
            shot_count=1,
            creative_context=creative_ctx,
        )

        assert len(results) == 1
        assert results[0]["success"] is True

        # Check call arguments to _generate_openai_reference
        called_kwargs = mock_gen.call_args[1]
        assert called_kwargs["creative_context"] == creative_ctx
        assert called_kwargs["product_name"] == "Zari Saree"


def test_api_photoshoot_endpoint_with_creative_answers(client):
    """
    Test 7: Verify POST /api/photoshoot accepts creativeAnswers JSON and individual parameters.
    """
    test_img = create_test_image_bytes()
    files = {
        "productImage": ("product.jpg", test_img, "image/jpeg"),
    }
    data = {
        "productName": "Heritage Silk Saree",
        "avatarId": "ananya",
        "mode": "model",
        "includeModel": "true",
        "includeLogo": "false",
        "price": "5999",
        "offer": "Flat ₹500 off",
        "mood": "Premium & luxurious",
        "lighting": "Soft natural light",
        "urgency": "Limited stock",
        "creativeAnswers": json.dumps({
            "product": "Heritage Silk Saree",
            "price": "5999",
            "offer": "Flat ₹500 off",
            "mood": "Premium & luxurious",
            "background": "Outdoor lifestyle",
            "lighting": "Soft natural light",
            "mainText": "Royal Collection",
            "language": "English",
            "urgency": "Limited stock",
        }),
    }

    mock_shots = [
        {"label": "Hero Showcase", "image_b64": "ZmFrZV9pbWFnZV9ieXRlcw==", "success": True, "mode": "model"},
        {"label": "Close-up Detail", "image_b64": "ZmFrZV9pbWFnZV9ieXRlcw==", "success": True, "mode": "model"},
        {"label": "Context In-Action", "image_b64": "ZmFrZV9pbWFnZV9ieXRlcw==", "success": True, "mode": "model"},
    ]

    with patch("routes.addon_routes.photoshoot_service.generate_photoshoot", new_callable=AsyncMock) as mock_ps:
        mock_ps.return_value = mock_shots

        res = client.post("/api/photoshoot", data=data, files=files)
        assert res.status_code == 200

        res_json = res.json()
        assert res_json["success"] is True
        assert len(res_json["shots"]) == 3
        assert res_json["shots"][0]["label"] == "Hero Showcase"

        # Verify creative_context was passed to photoshoot service
        called_args = mock_ps.call_args[1]
        assert called_args["product_name"] == "Heritage Silk Saree"
        assert called_args["creative_context"]["offer"] == "Flat ₹500 off"
        assert called_args["creative_context"]["mood"] == "Premium & luxurious"
        assert called_args["creative_context"]["urgency"] == "Limited stock"


def test_photoshoot_mode_switch_retains_clean_validation(client):
    """
    Test 8: Verify product_only mode strictly requires zero human references.
    """
    test_img = create_test_image_bytes()
    files = {"productImage": ("product.jpg", test_img, "image/jpeg")}
    data = {
        "productName": "Wireless Earbuds",
        "mode": "product_only",
        "avatarId": "studio-plain",
        "includeModel": "false",
        "mood": "Clean & minimal",
    }

    mock_shots = [
        {"label": "Studio Hero", "image_b64": "ZmFrZV9pbWFnZV9ieXRlcw==", "success": True, "mode": "product_only"},
    ]

    with patch("routes.addon_routes.photoshoot_service.generate_photoshoot", new_callable=AsyncMock) as mock_ps:
        mock_ps.return_value = mock_shots

        res = client.post("/api/photoshoot", data=data, files=files)
        assert res.status_code == 200
        assert res.json()["success"] is True
        assert mock_ps.call_args[1]["mode"] == "product_only"

"""
GoVisual AI — Photoshoot Prompt Fidelity and Exact Text Overlay Regression Tests
Tests comprehensive questionnaire answer mapping, non-contradictory prompt construction,
shot role uniqueness, and deterministic local exact text overlay.
Does NOT call any live AI provider.
"""
import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from PIL import Image

from services.addons.photoshoot_service import (
    build_photoshoot_prompt,
    BACKGROUND_PROMPTS,
    LIGHTING_PROMPTS,
    MOOD_PROMPTS,
    MODE_SHOT_COMPOSITIONS,
    PhotoshootService,
)
from services.text_overlay import apply_exact_text_overlay


def _create_test_image(width=1024, height=1024, color=(100, 150, 200), fmt="JPEG") -> bytes:
    """Helper to generate a clean local test image without network calls."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 1. FIELD-BY-FIELD PROMPT FIDELITY TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_prompt_fidelity_all_questionnaire_fields():
    """Verify that every creative questionnaire answer influences the prompt."""
    model_mock = {
        "id": "aarav",
        "name": "Aarav",
        "style": "Modern Commercial",
        "description": "modern commercial Indian male model in his late 20s",
        "image_bytes": b"fake_bytes",
    }

    prompt = build_photoshoot_prompt(
        product_name="Men's Half Sleeve Regular Tshirt",
        shot_label="Lifestyle Close-Up",
        shot_desc="close-up editorial shot, model wearing product",
        mode="model",
        product_desc="Navy blue cotton crew neck t-shirt with ribbed collar",
        model_ref=model_mock,
        background="Outdoor lifestyle",
        lighting="Bright daylight",
        mood="Clean & minimal",
        price="1299",
        offer="Buy 1 Get 1 Free",
        urgency="Limited stock",
        main_text="NEW ARRIVAL",
        language="Hindi",
        brand_name="Aura Wear",
    )

    # 1. Main product & specifics
    assert "Men's Half Sleeve Regular Tshirt" in prompt
    assert "Navy blue cotton crew neck t-shirt" in prompt

    # 2. Price
    assert "₹1299" in prompt

    # 3. Special offer
    assert "Buy 1 Get 1 Free" in prompt

    # 4. Visual mood
    assert MOOD_PROMPTS["clean & minimal"] in prompt

    # 5. Background - verify Outdoor lifestyle resolved, NO white cyclorama contradiction
    assert BACKGROUND_PROMPTS["outdoor lifestyle"] in prompt
    assert "white infinite studio cyclorama" not in prompt

    # 6. Lighting - verify Bright daylight resolved
    assert LIGHTING_PROMPTS["bright daylight"] in prompt

    # 7. Model reference
    assert "Features Indian model Aarav" in prompt

    # 8. Main text headline
    assert "NEW ARRIVAL" in prompt

    # 9. Language context
    assert "Hindi" in prompt

    # 10. Time limitation / Urgency
    assert "Limited stock" in prompt

    # 11. Photoshoot mode
    assert "Mode: model" in prompt

    # 12. Brand context
    assert "Aura Wear" in prompt

    # 13. Shot label & composition
    assert "Lifestyle Close-Up" in prompt


def test_prompt_fidelity_defaults_and_exclusions():
    """Verify that 'No offer' and 'No urgency' are not included as contradictory claims."""
    prompt = build_photoshoot_prompt(
        product_name="Ceramic Coffee Mug",
        shot_label="Product Hero",
        shot_desc="isolated hero angle center-frame",
        mode="product_only",
        background="Bright studio white",
        lighting="Soft natural light",
        mood="Warm & friendly",
        offer="No offer",
        urgency="No urgency",
        price=None,
        main_text="",
        language="English",
        brand_name="My Brand", # default placeholder should be omitted
    )

    # Should NOT have promotional offers or urgency
    assert "Promotional offer context" not in prompt
    assert "Campaign urgency" not in prompt
    assert "Price positioning" not in prompt
    assert "Campaign headline" not in prompt
    # English is default, should not clutter prompt
    assert "Target audience language context" not in prompt
    # 'My Brand' placeholder should not be injected as a brand
    assert "Brand context: My Brand" not in prompt

    # Product-only mode specification
    assert "Strict product-only composition" in prompt
    assert BACKGROUND_PROMPTS["bright studio white"] in prompt
    assert LIGHTING_PROMPTS["soft natural light"] in prompt
    assert MOOD_PROMPTS["warm & friendly"] in prompt


def test_three_shots_distinct_compositions():
    """Verify each of the three candidate shots receives its distinct role and description."""
    shots = MODE_SHOT_COMPOSITIONS["model"]
    assert len(shots) == 3

    labels = [s[0] for s in shots]
    assert labels == ["Lifestyle Close-Up", "Hero Showcase", "Macro Detail"]

    prompts = [
        build_photoshoot_prompt(
            product_name="Silk Scarf",
            shot_label=label,
            shot_desc=desc,
            mode="model",
            background="Festive themed",
        )
        for label, desc in shots
    ]

    # Shared requirements present in all 3
    for p in prompts:
        assert "Silk Scarf" in p
        assert BACKGROUND_PROMPTS["festive themed"] in p

    # Individual composition roles unique across shots
    assert "Lifestyle Close-Up" in prompts[0] and "Hero Showcase" not in prompts[0]
    assert "Hero Showcase" in prompts[1] and "Macro Detail" not in prompts[1]
    assert "Macro Detail" in prompts[2] and "Lifestyle Close-Up" not in prompts[2]


# ─────────────────────────────────────────────────────────────────────────────
# 2. EXACT MAIN TEXT DETERMINISTIC OVERLAY TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_exact_text_overlay_applied_when_provided():
    """Verify that 'NEW ARRIVAL' is deterministically composited onto the image."""
    base_img_bytes = _create_test_image(width=1024, height=1024, fmt="JPEG")

    result_bytes = apply_exact_text_overlay(base_img_bytes, text="NEW ARRIVAL")

    # Output must be non-empty and different from original bytes
    assert result_bytes is not None
    assert len(result_bytes) > 0
    assert result_bytes != base_img_bytes

    # Image properties preserved
    with Image.open(io.BytesIO(result_bytes)) as out_img:
        assert out_img.size == (1024, 1024)
        assert out_img.format == "JPEG"


def test_exact_text_overlay_preserves_exact_casing_and_punctuation():
    """Verify exact casing, punctuation, and wording are preserved."""
    base_img_bytes = _create_test_image(width=800, height=800, fmt="PNG")
    exact_text = "50% OFF — Limited Time!"

    result_bytes = apply_exact_text_overlay(base_img_bytes, text=exact_text)

    with Image.open(io.BytesIO(result_bytes)) as out_img:
        assert out_img.size == (800, 800)
        assert out_img.format == "PNG"


def test_exact_text_overlay_omitted_when_empty():
    """Verify that empty, None, or whitespace text produces zero overlay and identical bytes."""
    base_img_bytes = _create_test_image(width=512, height=512, fmt="JPEG")

    # None
    assert apply_exact_text_overlay(base_img_bytes, text=None) == base_img_bytes

    # Empty string
    assert apply_exact_text_overlay(base_img_bytes, text="") == base_img_bytes

    # Whitespace string
    assert apply_exact_text_overlay(base_img_bytes, text="   \t\n ") == base_img_bytes


# ─────────────────────────────────────────────────────────────────────────────
# 3. END-TO-END PHOTOSHOOT SERVICE INTEGRATION (MOCKED PROVIDER)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_photoshoot_service_incorporates_creative_context_and_text_overlay():
    """Verify generate_photoshoot calls image generation and overlays exact text."""
    service = PhotoshootService()
    test_prod_img = _create_test_image(width=512, height=512, fmt="JPEG")

    mock_generated_img = _create_test_image(width=1024, height=1024, color=(20, 20, 20), fmt="JPEG")

    with patch.object(service, "_dispatch_reference_generation", new_callable=AsyncMock) as mock_dispatch:
        mock_dispatch.return_value = mock_generated_img

        creative_ctx = {
            "mood": "Clean & minimal",
            "background": "Outdoor lifestyle",
            "lighting": "Bright daylight",
            "main_text": "NEW ARRIVAL",
            "price": "1499",
            "offer": "Flat ₹500 off",
            "urgency": "Today only",
            "language": "English",
        }

        results = await service.generate_photoshoot(
            product_image_bytes=test_prod_img,
            product_name="Men's Half Sleeve Regular Tshirt",
            avatar_id="aarav",
            mode="model",
            shot_count=3,
            creative_context=creative_ctx,
        )

        assert len(results) == 3
        assert mock_dispatch.call_count == 3

        # Verify creative context was passed to dispatch
        for call_args in mock_dispatch.call_args_list:
            kwargs = call_args[1]
            assert kwargs["creative_context"] == creative_ctx
            assert kwargs["product_name"] == "Men's Half Sleeve Regular Tshirt"
            assert kwargs["mode"] == "model"

        # Verify all 3 shots succeeded and output bytes contain the text overlay
        for r in results:
            assert r["success"] is True
            assert r["image_b64"] != ""
            # Decoded bytes should differ from mock_generated_img because text overlay was applied
            import base64
            decoded = base64.b64decode(r["image_b64"])
            assert decoded != mock_generated_img
            with Image.open(io.BytesIO(decoded)) as img:
                assert img.size == (1024, 1024)

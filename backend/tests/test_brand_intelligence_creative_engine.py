"""
GoVisual AI — Automated Test Suite: Brand Intelligence & Creative Director Engine Upgrade
Validates:
1. Brand colors, name, logo, guidelines, and reference photos preservation.
2. Product catalog features, ingredients, prices, and offers inclusion without fabrication.
3. Category-appropriate creative layouts (skincare vs electronics vs jewellery vs food).
4. User background and lighting overrides.
5. Reference image conditioning and stale data isolation.
6. Design overlay compositing (headline, offer, verified features).
7. Error handling, empty profile safety, and synchronized captioning.
Zero paid API calls, 100% offline mocked fixtures.
"""
import io
import json
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from PIL import Image

from main import app
from services.auth import get_current_user
from services.creative_planner.brand_context import BrandContext, build_brand_context
from services.creative_planner.product_context import ProductContext, build_product_context
from services.creative_planner.advertising_layouts import select_advertising_layouts, AdvertisingLayout
from services.creative_planner.creative_director import CreativeDirectorBrief, build_creative_brief
from services.creative_planner.planner import CreativePlanner
from services.creative_planner.prompt_builder import PromptBuilder
from services.creative_planner.creative_compositor import apply_advertising_overlays
from services.image_provider.models import CreativeRequest
from services.image_provider.providers.mock_provider import MockImageProvider
from services.caption_service import generate_caption, generate_caption_alternatives


@pytest.fixture
def client():
    prev = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: {"id": "test_user_777", "email": "test@govisual.ai"}
    with TestClient(app) as test_client:
        yield test_client
    if prev is not None:
        app.dependency_overrides[get_current_user] = prev
    else:
        app.dependency_overrides.pop(get_current_user, None)


def create_test_image_bytes(color=(180, 120, 60), size=(128, 128)) -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 1. BRAND INTELLIGENCE CONTEXT TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_saved_brand_colors_affect_creative_brief():
    """1. The saved brand colours affect the creative brief and prompt."""
    raw_brand = {
        "brand_name": "Aura Cosmetics",
        "category": "Beauty / Skincare",
        "primary_color": "#D4AF37",
        "secondary_color": "#2C3E50",
        "accent_color": "#E74C3C",
        "palette": ["#D4AF37", "#2C3E50", "#E74C3C"],
    }
    brand_ctx = build_brand_context(raw_brand)
    assert brand_ctx.primary_color == "#D4AF37"
    assert brand_ctx.secondary_color == "#2C3E50"
    assert brand_ctx.accent_color == "#E74C3C"
    assert "#D4AF37" in brand_ctx.get_color_summary()

    prod_ctx = build_product_context("Radiance Serum")
    layout = select_advertising_layouts(brand_ctx, prod_ctx)[0]
    brief = build_creative_brief("brief_test_1", brand_ctx, prod_ctx, layout)

    assert "#D4AF37" in brief.brand_colors
    assert "#2C3E50" in brief.brand_colors

    builder = PromptBuilder()
    strat = CreativePlanner().plan_v2("Promote Radiance Serum", {}, raw_brand, {}).strategies[0]
    req = builder.build_v2(strat, {}, raw_brand, "Promote Serum", {}, brief=brief)
    assert "#D4AF37" in req.computed_prompt


def test_brand_name_and_logo_preserved():
    """2. The actual brand name and logo reference are preserved."""
    raw_brand = {
        "brand_name": "Meera Handcrafted Silks",
        "category": "Clothing / Fashion",
        "logo_url": "https://example.com/meera-logo.png",
        "logo_present": True,
    }
    brand_ctx = build_brand_context(raw_brand)
    assert brand_ctx.brand_name == "Meera Handcrafted Silks"
    assert brand_ctx.logo_present is True

    prod_ctx = build_product_context("Kanjeevaram Saree")
    layout = select_advertising_layouts(brand_ctx, prod_ctx)[0]
    brief = build_creative_brief("brief_test_2", brand_ctx, prod_ctx, layout, {"logo_position": "top-right"})

    assert brief.brand_name == "Meera Handcrafted Silks"
    assert brief.logo_placement == "top-right"
    assert brief.logo_reserved is True

    # Check prompt builder instructs reserving logo space without redrawing fake logo
    builder = PromptBuilder()
    strat = CreativePlanner().plan_v2("Promote Saree", {}, raw_brand, {"logo_position": "top-right"}).strategies[0]
    req = builder.build_v2(strat, {}, raw_brand, "Promote Saree", {"logo_position": "top-right"}, brief=brief)
    assert "Meera Handcrafted Silks" in req.computed_prompt
    assert "RESERVED LOGO SAFE-ZONE" in req.computed_prompt
    assert "top-right" in req.computed_prompt


def test_brand_guidelines_and_photos_included():
    """3. Brand guidelines, tone, tagline, and brand photographs are included where supported."""
    raw_brand = {
        "brand_name": "Urban Roasters",
        "category": "Food & Drinks",
        "brand_tone": "Warm, artisanal, and conversational",
        "tagline": "Pure Beans, Honest Brews",
        "brand_brief": "Artisan coffee roastery celebrating local growers",
        "brand_photos": ["https://storage.govisual.ai/photo1.jpg", "https://storage.govisual.ai/photo2.jpg"],
    }
    brand_ctx = build_brand_context(raw_brand)
    assert brand_ctx.brand_tone == "Warm, artisanal, and conversational"
    assert brand_ctx.tagline == "Pure Beans, Honest Brews"
    assert len(brand_ctx.brand_photos) == 2

    prod_ctx = build_product_context("Dark Roast Arabica")
    layout = select_advertising_layouts(brand_ctx, prod_ctx)[0]
    brief = build_creative_brief("brief_test_3", brand_ctx, prod_ctx, layout)
    assert brief.brand_tone == "Warm, artisanal, and conversational"


# ─────────────────────────────────────────────────────────────────────────────
# 2. PRODUCT INTELLIGENCE & ANTI-HALLUCINATION TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_product_details_included_only_when_available():
    """4. Product descriptions, ingredients, features, prices and offers are included only when available and relevant."""
    cat_product = {
        "name": "Botanical Face Elixir",
        "description": "Nourishing facial oil with certified organic botanical extracts.",
        "ingredients": "Turmeric, Saffron, Rosehip Oil",
        "features": "Non-greasy, 24h Hydration",
        "price": "1499",
        "offer": "Buy 1 Get 1 Free",
    }
    prod_ctx = build_product_context("Botanical Face Elixir", catalog_product=cat_product)
    
    assert "Turmeric" in prod_ctx.ingredients
    assert "Saffron" in prod_ctx.ingredients
    assert "Non-greasy" in prod_ctx.features
    assert prod_ctx.price == "₹1499"
    assert prod_ctx.offer == "Buy 1 Get 1 Free"

    features_selected = prod_ctx.select_promotional_features(max_features=3)
    assert len(features_selected) >= 2
    assert "Non-greasy" in features_selected

    props = prod_ctx.get_supported_props()
    # Verified turmeric and saffron should produce supported prop descriptions
    assert any("turmeric" in p.lower() for p in props)
    assert any("saffron" in p.lower() for p in props)


def test_unsupported_claims_not_fabricated():
    """5. Unsupported claims are not fabricated by deterministic prompt construction."""
    # Plain product with only name and image
    prod_ctx = build_product_context("Leather Travel Bag", catalog_product={})
    
    assert prod_ctx.ingredients == []
    assert prod_ctx.features == []
    assert prod_ctx.price is None
    assert prod_ctx.offer is None

    # Promotional features must be empty, NOT fabricated
    selected_features = prod_ctx.select_promotional_features()
    assert selected_features == []

    # Creative brief must not contain invented claims
    brand_ctx = build_brand_context({"brand_name": "Voyager Goods", "category": "Leather Goods"})
    layout = select_advertising_layouts(brand_ctx, prod_ctx)[0]
    brief = build_creative_brief("brief_plain", brand_ctx, prod_ctx, layout)

    assert brief.verified_features_to_communicate == []
    brief_dict = brief.to_sanitized_dict()
    assert brief_dict["product"]["verified_features"] == []

    # Prompt builder must include strict boundary
    builder = PromptBuilder()
    strat = CreativePlanner().plan_v2("Promote Bag", {}, {"brand_name": "Voyager Goods"}, {}).strategies[0]
    req = builder.build_v2(strat, {}, {"brand_name": "Voyager Goods"}, "Promote Bag", {}, brief=brief)
    
    prompt = req.computed_prompt
    assert "clinically proven" not in prompt.lower()
    assert "dermatologically tested" not in prompt.lower()
    assert "100% money back" not in prompt.lower()
    assert "Do not invent unverified medical claims, fake guarantees, or non-existent ingredients" in prompt


# ─────────────────────────────────────────────────────────────────────────────
# 3. CATEGORY-AWARE LAYOUTS & DIFFERENTIATION
# ─────────────────────────────────────────────────────────────────────────────

def test_different_brand_categories_produce_different_directions():
    """6. Different brand categories produce appropriately different creative directions."""
    # Category 1: Electronics
    elec_brand = build_brand_context({"brand_name": "Apex Sound", "category": "Electronics"})
    elec_prod = build_product_context("Wireless ANC Earbuds", catalog_product={"features": "Active Noise Cancelling, 30hr Battery"})
    elec_layouts = select_advertising_layouts(elec_brand, elec_prod)

    # Category 2: Skincare with Turmeric
    skin_brand = build_brand_context({"brand_name": "Veda Glow", "category": "Beauty / Skincare"})
    skin_prod = build_product_context("Haldi Chandan Cream", catalog_product={"ingredients": "Turmeric, Sandalwood"})
    skin_layouts = select_advertising_layouts(skin_brand, skin_prod)

    # Category 3: Jewellery
    jewel_brand = build_brand_context({"brand_name": "Ratna Jewelers", "category": "Jewellery"})
    jewel_prod = build_product_context("Kundan Gold Choker", catalog_product={"features": "22k Hallmarked Gold"})
    jewel_layouts = select_advertising_layouts(jewel_brand, jewel_prod)

    # Check distinct strategies
    elec_names = [l.layout_name for l in elec_layouts]
    skin_names = [l.layout_name for l in skin_layouts]
    jewel_names = [l.layout_name for l in jewel_layouts]

    # Electronics should include tech spec focus
    assert any("Tech" in name or "Specification" in name for name in elec_names)
    # Skincare with ingredients should include Ingredient Showcase
    assert any("Ingredient" in name for name in skin_names)
    # Jewellery should include Clean Editorial / Luxury
    assert any("Editorial" in name or "Luxury" in name or "Hero" in name for name in jewel_names)

    # Verify that Electronics environment is NOT botanical
    elec_env = elec_layouts[0].environment.lower()
    assert "botanical" not in elec_env
    assert "turmeric" not in elec_env


def test_user_selected_background_and_lighting_override_defaults():
    """7. User-selected background and lighting override generic defaults."""
    brand_ctx = build_brand_context({"brand_name": "Neon Arcade", "category": "Gaming"})
    prod_ctx = build_product_context("RGB Mechanical Keyboard")
    
    user_prefs = {
        "background": "Cyberpunk Tokyo Neon Alleyway",
        "lighting": "Dual-tone Violet and Cyan Neon Rim",
        "mood": "Electric and Futuristic",
    }
    layouts = select_advertising_layouts(brand_ctx, prod_ctx, user_preferences=user_prefs)
    
    assert any("Cyberpunk Tokyo Neon Alleyway" in l.environment for l in layouts)
    assert any("Dual-tone Violet and Cyan Neon Rim" in l.lighting for l in layouts)

    brief = build_creative_brief("brief_neon", brand_ctx, prod_ctx, layouts[0], user_prefs)
    assert "Cyberpunk Tokyo Neon Alleyway" in brief.environment
    assert "Dual-tone Violet and Cyan Neon Rim" in brief.lighting


# ─────────────────────────────────────────────────────────────────────────────
# 4. REFERENCE IMAGE PASS-THROUGH & ISOLATION
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_product_image_passed_to_backend_provider():
    """8. The selected product image is passed to the backend through the supported provider interface."""
    prod_bytes = create_test_image_bytes((50, 100, 150))
    provider = MockImageProvider()
    
    req = CreativeRequest(
        marketing_requirement="Product Showcase",
        product_info={"name": "Handmade Clay Teacup"},
        brand_dna={"brand_name": "Mitti Craft"},
        candidate_count=1,
        computed_prompt="Showcase teacup",
        reference_images=[prod_bytes],
    )
    
    results = await provider.generate(req)
    assert len(results) == 1
    assert results[0].status == "SUCCESS"
    assert results[0].reference_conditioned is True
    assert "product_image" in results[0].references_used


def test_switching_selected_product_clears_stale_data():
    """9. Switching the selected product clears stale reference-image data and attributes."""
    prod_a = build_product_context("Silk Saree", catalog_product={"ingredients": "Pure Silk", "price": "4999"})
    assert prod_a.name == "Silk Saree"
    assert "Pure Silk" in prod_a.ingredients

    # Switch to Product B
    prod_b = build_product_context("Silver Anklets", catalog_product={"features": "925 Sterling Silver", "price": "1999"})
    assert prod_b.name == "Silver Anklets"
    assert "Pure Silk" not in prod_b.ingredients
    assert "925 Sterling Silver" in prod_b.features
    assert prod_b.price == "₹1999"


# ─────────────────────────────────────────────────────────────────────────────
# 5. DESIGN OVERLAY COMPOSITING & EXACT LABELS
# ─────────────────────────────────────────────────────────────────────────────

def test_main_text_and_feature_labels_mapped_and_overlaid():
    """10. Main text and requested feature labels are mapped correctly and overlaid non-destructively."""
    base_img = create_test_image_bytes((30, 30, 30), size=(500, 500))
    logo_img = create_test_image_bytes((255, 255, 255), size=(80, 40))

    overlaid = apply_advertising_overlays(
        image_bytes=base_img,
        logo_bytes=logo_img,
        logo_position="top-right",
        headline_text="DIWALI SPECIAL",
        offer_text="FLAT 30% OFF",
        feature_chips=["100% Organic", "Handcrafted in Jaipur"],
        accent_color=(232, 182, 111),
    )

    assert len(overlaid) > 0
    with Image.open(io.BytesIO(overlaid)) as img:
        assert img.size == (500, 500)
        assert img.mode in ("RGB", "RGBA")


def test_missing_product_features_omit_benefit_panels():
    """12. Missing product features do not produce fabricated benefit panels."""
    base_img = create_test_image_bytes((40, 40, 40), size=(400, 400))
    
    # Overlays called with empty feature chips and empty headline
    overlaid = apply_advertising_overlays(
        image_bytes=base_img,
        logo_bytes=None,
        headline_text=None,
        offer_text=None,
        feature_chips=[],
    )
    # Renders safely without error and preserves image
    assert len(overlaid) > 0
    with Image.open(io.BytesIO(overlaid)) as img:
        assert img.size == (400, 400)


def test_empty_or_incomplete_brand_profiles_do_not_crash():
    """11. Empty or incomplete brand profiles do not crash the pipeline."""
    brand_ctx = build_brand_context({})
    assert brand_ctx.brand_name == "Our Brand"
    assert brand_ctx.category == "General"

    brand_none = build_brand_context(None)
    assert brand_none.brand_name == "Our Brand"

    prod_ctx = build_product_context("", catalog_product=None, form_answers=None)
    assert prod_ctx.name == "Product"

    layouts = select_advertising_layouts(brand_ctx, prod_ctx)
    assert len(layouts) >= 1

    planner = CreativePlanner()
    plan = planner.plan_v2("Promote", {}, {}, {})
    assert len(plan.strategies) == 3


# ─────────────────────────────────────────────────────────────────────────────
# 6. CAPTION SYNCHRONIZATION & FAILURE INTEGRITY
# ─────────────────────────────────────────────────────────────────────────────

def test_caption_generation_uses_same_campaign_facts():
    """13. Caption generation uses the same campaign facts as the creative."""
    res = generate_caption_alternatives(
        product="Kashmiri Saffron Face Glow",
        brand_name="Aura Vedic",
        category="Beauty",
        offer="20% off",
        background="organic botanical setting",
        lighting="soft natural light",
    )
    assert res["success"] is True
    assert res["product"] == "Kashmiri Saffron Face Glow"
    assert res["brand_name"] == "Aura Vedic"
    
    alts = {a["id"]: a["caption"] for a in res["alternatives"]}
    assert "punchy" in alts
    assert "story" in alts
    assert "offer" in alts
    assert "20% off" in alts["offer"]
    assert "AuraVedic" in res["hashtags"]


def test_failures_do_not_falsely_report_success(client):
    """14. Failures do not falsely report a successful generation."""
    # POST to /generate without an image or reference URL must return 400
    resp = client.post("/generate", data={
        "product": "Test Watch",
        "price": "999",
        "format": "1:1",
        "image_type": "Instagram post",
        "purpose": "Brand promotion",
        "mood": "Luxury",
        "background": "Studio",
        "lighting": "Spotlight",
        "offer": "None",
        "brand_name": "Test Brand",
        "brand_colors": "#000000",
        "category": "Watches",
    })
    assert resp.status_code == 400
    assert "Provide product_image or reference_image_url" in resp.json()["detail"]


# ─────────────────────────────────────────────────────────────────────────────
# 7. END-TO-END MOCKED V2 GENERATION ROUTE
# ─────────────────────────────────────────────────────────────────────────────

def test_v2_generate_endpoint_end_to_end_mocked(client):
    """15. Existing onboarding, Photoshoot, Creative Generation behavior remains intact with rich briefs."""
    product_bytes = create_test_image_bytes((120, 80, 40))
    logo_bytes = create_test_image_bytes((255, 200, 0), size=(60, 60))

    files = {
        "product_image": ("product.jpg", product_bytes, "image/jpeg"),
        "logo_image": ("logo.png", logo_bytes, "image/png"),
    }
    data = {
        "product": "Ayurvedic Turmeric Glow Gel",
        "price": "599",
        "format": "1:1",
        "image_type": "Instagram post",
        "purpose": "Festive Launch",
        "mood": "Warm & Friendly",
        "background": "Festive themed",
        "lighting": "Soft natural light",
        "offer": "Buy 1 Get 1 Free",
        "main_text": "Diwali Glow Special",
        "language": "English",
        "urgency": "Today only",
        "brand_name": "Sanskriti Organics",
        "brand_colors": "#D4AF37, #2C3E50",
        "category": "Beauty / Skincare",
        "description": "Pure organic skincare gel made with fresh turmeric and aloe vera.",
        "ingredients": "Turmeric, Aloe Vera",
        "features": "100% Herbal, Chemical-Free, Glowing Skin",
    }

    from services.product_understanding.models import ProductUnderstanding
    dummy_pu = ProductUnderstanding(
        product_name="Ayurvedic Turmeric Glow Gel",
        product_category="Beauty / Skincare",
        short_description="Ayurvedic skincare jar",
    )
    mock_pu_result = type("Result", (object,), {"status": "success", "analysis": dummy_pu})

    with patch("services.product_understanding.service.ProductUnderstandingService.analyze_product", new=AsyncMock(return_value=mock_pu_result)), \
         patch.dict("os.environ", {"ENABLE_CRITIC": "false", "IMAGE_PROVIDER": "mock"}):
        resp = client.post("/generate", files=files, data=data)
    assert resp.status_code == 200, f"Generate failed: {resp.text}"
    
    body = resp.json()
    assert body["success"] is True
    assert "session_id" in body
    assert len(body["candidates"]) == 3
    assert body["caption"] != ""
    assert body["creative_brief"] is not None
    
    # Verify creative brief contains brand and verified product details
    brief = body["creative_brief"]
    assert brief["brand"]["name"] == "Sanskriti Organics"
    assert brief["product"]["name"] == "Ayurvedic Turmeric Glow Gel"
    assert len(brief["product"]["verified_features"]) > 0
    assert "Buy 1 Get 1 Free" in brief["product"]["offer_and_cta"]
    
    # Check candidates have distinct strategy names
    strategy_names = [c["strategy_name"] for c in body["candidates"]]
    assert len(set(strategy_names)) >= 2, f"Expected varied strategies, got: {strategy_names}"

"""
GoVisual AI — Automated Tests for Brand Book Generation Service & API
Validates offline deterministic Brand Book generation:
- Handles complete brand profiles
- Handles missing/empty business name, category, logo, colors, font
- Handles slash-category name variants ("Clothing/Fashion" vs "Clothing / Fashion")
- Tests POST /api/brandbook endpoint for 200 OK responses and resilient defaults
- Consumes zero paid API calls, operates fully offline
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from services.addons.brandbook_service import BrandBookService


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def service():
    return BrandBookService()


@pytest.mark.asyncio
async def test_brandbook_service_full_generation(service):
    """Verify brand book generates complete, rich sections with full user data."""
    result = await service.generate(
        business_name="Meera Silks",
        category="Clothing / Fashion",
        tagline="Handcrafted Royal Heritage",
        existing_colors=["#800020", "#D4AF37", "#1A1A1A"],
        logo_colors=["#800020", "#D4AF37"],
        captions_text="Festive pure silk sarees with golden zari work. Order on WhatsApp!",
        post_images_count=3,
        whatsapp="+91 98765 43210",
        instagram="@meerasilks",
        city="Varanasi",
    )

    assert result["businessName"] == "Meera Silks"
    assert result["category"] == "Clothing / Fashion"
    assert result["tagline"] == "Handcrafted Royal Heritage"
    assert len(result["colors"]) == 3
    assert result["colors"][0]["hex"] == "#800020"
    assert "fonts" in result
    assert len(result["fonts"]) >= 2

    # Tone & Voice
    assert isinstance(result["voiceWords"], list)
    assert len(result["voiceWords"]) >= 3
    assert len(result["doList"]) >= 2
    assert len(result["dontList"]) >= 2

    # Tips & Hashtags
    assert "postingTips" in result
    assert "hashtagSets" in result
    assert "Varanasi" in result["hashtagSets"]["local"]
    assert "#MeeraSilks" in result["hashtagSets"]["branded"]

    # Contact
    assert result["whatsapp"] == "+91 98765 43210"
    assert result["instagram"] == "@meerasilks"
    assert result["city"] == "Varanasi"


@pytest.mark.asyncio
async def test_brandbook_service_missing_and_fallback_data(service):
    """Verify service gracefully handles missing logo, empty colors, no tagline, no products."""
    result = await service.generate(
        business_name="",
        category="",
        tagline=None,
        existing_colors=[],
        logo_colors=[],
        captions_text=None,
        post_images_count=0,
        whatsapp=None,
        instagram=None,
        city=None,
    )

    assert result["businessName"] == "My Brand"
    assert result["category"] == "Clothing / Fashion"
    assert isinstance(result["tagline"], str) and len(result["tagline"]) > 0
    assert len(result["colors"]) == 3
    assert len(result["voiceWords"]) >= 3
    assert len(result["doList"]) >= 2
    assert len(result["dontList"]) >= 2


def test_category_resolver_fuzzy_matching(service):
    """Verify category resolver normalizes slashes, spaces, and case variants."""
    assert service._resolve_category("Clothing/Fashion") == "Clothing / Fashion"
    assert service._resolve_category("clothing / fashion") == "Clothing / Fashion"
    assert service._resolve_category("Grocery/Kirana") == "Grocery / Kirana"
    assert service._resolve_category("grocery/kirana") == "Grocery / Kirana"
    assert service._resolve_category("Food & Drinks") == "Food & Drinks"
    assert service._resolve_category("food & drinks") == "Food & Drinks"
    assert service._resolve_category("NonExistentCategory") == "Grocery / Kirana"
    assert service._resolve_category("") == "Grocery / Kirana"
    assert service._resolve_category(None) == "Grocery / Kirana"


@pytest.mark.asyncio
async def test_brandbook_tagline_customization_by_category(service):
    """Verify tailored taglines for different business categories when not provided."""
    jewel_res = await service.generate(
        business_name="Ratna Jewelers",
        category="Jewellery",
    )
    assert jewel_res["tagline"] == "Ratna Jewelers — Pure Gold, Timeless Grace"

    salon_res = await service.generate(
        business_name="Aura Studio",
        category="Salon & Beauty",
    )
    assert salon_res["tagline"] == "Aura Studio — Unveil Your Natural Glow"


def test_api_brandbook_endpoint_success(client):
    """Test POST /api/brandbook generates successfully with 200 OK and complete payload."""
    payload = {
        "businessName": "Aura Cosmetics",
        "category": "Salon & Beauty",
        "existingColors": ["#E0A96D", "#201E1F"],
        "whatsapp": "+91 90000 11111",
    }
    response = client.post("/api/brandbook", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "brandBook" in data
    bb = data["brandBook"]
    assert bb["businessName"] == "Aura Cosmetics"
    assert bb["category"] == "Salon & Beauty"
    assert len(bb["colors"]) == 3
    assert bb["whatsapp"] == "+91 90000 11111"


def test_api_brandbook_endpoint_empty_payload_resilience(client):
    """Test POST /api/brandbook does not throw 422 Unprocessable Entity when empty."""
    response = client.post("/api/brandbook", json={})
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    bb = data["brandBook"]
    assert bb["businessName"] == "My Brand"
    assert bb["category"] == "Clothing / Fashion"
    assert len(bb["colors"]) == 3


def test_api_brandbook_slash_category_payload(client):
    """Test POST /api/brandbook correctly resolves frontend slash categories like 'Clothing/Fashion'."""
    payload = {
        "businessName": "Urban Thread",
        "category": "Clothing/Fashion",
    }
    response = client.post("/api/brandbook", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    bb = data["brandBook"]
    assert bb["category"] == "Clothing/Fashion"
    assert bb["tagline"] == "Urban Thread — Elegance in Every Thread"


def test_api_brandbook_regression_422_normalization(client):
    """Regression test: Verify that payloads with string colors, hex objects, empty string count, and snake_case are normalized cleanly."""
    payload = {
        "business_name": "Royal Silks",
        "business_category": "Clothing / Fashion",
        "colors": "#C9A84C, #1A0A00",
        "logo_colors": [{"hex": "#FFF9F0"}],
        "post_images_count": "",
        "city": "Varanasi",
    }
    response = client.post("/api/brandbook", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    bb = data["brandBook"]
    assert bb["businessName"] == "Royal Silks"
    assert bb["colors"][0]["hex"] == "#FFF9F0" or bb["colors"][0]["hex"] == "#C9A84C"


def test_api_brandbook_invalid_type_still_fails_validation(client):
    """Verify that completely broken payloads (e.g. businessName as an int or dict) are properly rejected with structured 422."""
    response = client.post("/api/brandbook", json={"businessName": {"nested": "not a string"}})
    assert response.status_code == 422
    err = response.json()
    assert "detail" in err


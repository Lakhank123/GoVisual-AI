"""
GoVisual AI — Automated Tests for Requirement E (Caption Alternatives & Image-Aware Copy)
Validates offline deterministic caption generation with 3 alternatives and hashtag recommendations.
Consumes zero paid API calls.
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from services.caption_service import generate_caption_alternatives


def test_caption_alternatives_structure_and_styles():
    """Verify generate_caption_alternatives produces 3 distinct styles without paid API calls."""
    res = generate_caption_alternatives(
        product="Zari Silk Saree",
        brand_name="Meera Silks",
        category="Traditional Wear",
        shot_label="Hero Showcase",
        tone="Premium & Luxurious",
        offer="Festive 20% Off",
    )

    assert res["success"] is True
    assert res["product"] == "Zari Silk Saree"
    assert res["brand_name"] == "Meera Silks"
    assert len(res["alternatives"]) == 3

    ids = [alt["id"] for alt in res["alternatives"]]
    assert "punchy" in ids
    assert "story" in ids
    assert "offer" in ids

    # Punchy alternative should be concise
    punchy = next(a for a in res["alternatives"] if a["id"] == "punchy")
    assert "Zari Silk Saree" in punchy["caption"]
    assert len(punchy["caption"].split()) <= 15

    # Story alternative should reflect craft & heritage
    story = next(a for a in res["alternatives"] if a["id"] == "story")
    assert "Zari Silk Saree" in story["caption"]
    assert len(story["caption"].split()) >= 15

    # Offer alternative should highlight the promo
    offer_alt = next(a for a in res["alternatives"] if a["id"] == "offer")
    assert "Festive 20% Off" in offer_alt["caption"]

    # Hashtags should be cleanly formatted
    assert "#MeeraSilks" in res["hashtags"]
    assert "#ZariSilkSaree" in res["hashtags"]


def test_caption_alternatives_without_offer():
    """Verify fallback behavior when no offer is provided."""
    res = generate_caption_alternatives(
        product="Handmade Ceramic Mug",
        brand_name="Clay Studio",
        category="Home & Living",
    )

    assert res["success"] is True
    offer_alt = next(a for a in res["alternatives"] if a["id"] == "offer")
    assert "order" in offer_alt["caption"].lower() or "shop" in offer_alt["caption"].lower()
    assert "#ClayStudio" in res["hashtags"]


def test_caption_alternatives_with_visual_description():
    """Verify visual_description weaves directly into the generated caption styles."""
    res = generate_caption_alternatives(
        product="Kanjivaram Silk Saree",
        brand_name="Heritage Silks",
        category="Apparel",
        visual_description="Golden zari borders gleaming under warm festive studio light",
        background="Palace Courtyard",
    )

    assert res["success"] is True
    punchy = next(a for a in res["alternatives"] if a["id"] == "punchy")
    assert "Golden zari borders" in punchy["caption"]

    story = next(a for a in res["alternatives"] if a["id"] == "story")
    assert "golden zari borders" in story["caption"].lower()


def test_api_captions_alternatives_endpoint():
    """Verify POST /api/captions/alternatives endpoint responds with 200 and schema."""
    client = TestClient(app)
    resp = client.post(
        "/api/captions/alternatives",
        json={
            "product": "Handcrafted Leather Tote",
            "brandName": "Urban Craft",
            "category": "Accessories",
            "shotLabel": "Editorial Lifestyle",
            "tone": "Modern & Minimal",
            "offer": "Free Shipping this weekend",
            "visualDescription": "Rich brown full-grain leather against minimalist textured stone",
            "background": "Textured Stone",
            "lighting": "Golden Hour",
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["alternatives"]) == 3
    assert "UrbanCraft" in data["hashtags"]
    punchy = next(a for a in data["alternatives"] if a["id"] == "punchy")
    assert "Rich brown" in punchy["caption"]


import os
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes.addon_routes import (
    router as addon_router,
    _get_deterministic_minisite_suggestions,
    sanitize_minisite_slug,
    MinisiteSuggestRequest,
    MinisiteData,
)

app_under_test = FastAPI()
app_under_test.include_router(addon_router)
client = TestClient(app_under_test)


def test_deterministic_suggestions_across_categories():
    """Verify deterministic brand suggestions generate distinct themes, copy, and products per category."""
    # 1. Electronics category -> bold_contrast
    req_elec = MinisiteSuggestRequest(
        shopName="boAt Nirvana Audio",
        category="Electronics",
        audience="Tech lovers & gamers",
        objective="Direct WhatsApp Orders",
    )
    electronics = _get_deterministic_minisite_suggestions(req_elec)
    assert electronics["theme"] == "bold_contrast"
    assert electronics["primaryColor"] == "#38bdf8"
    assert "Performance" in electronics["heroHeadline"] or "Life" in electronics["heroHeadline"]
    assert len(electronics["products"]) >= 3
    assert any("Earbuds" in p["name"] or "Power" in p["name"] for p in electronics["products"])
    assert len(electronics["differentiators"]) == 3

    # 2. Jewellery category -> luxury_editorial
    req_jewel = MinisiteSuggestRequest(
        shopName="Kalyan Royal Jewels",
        category="Jewellery",
    )
    jewellery = _get_deterministic_minisite_suggestions(req_jewel)
    assert jewellery["theme"] == "luxury_editorial"
    assert jewellery["primaryColor"] in ["#C49B5A", "#E8B66F"]
    assert "Elegance" in jewellery["tagline"] or "Purity" in jewellery["heroHeadline"]
    assert any("Gold" in p["name"] or "Crystal" in p["name"] or "Kundan" in p["name"] for p in jewellery["products"])

    # 3. Food & Drinks category -> warm_vibrant
    req_food = MinisiteSuggestRequest(
        shopName="Artisan Chai & Bakery",
        category="Food & Drinks",
    )
    food = _get_deterministic_minisite_suggestions(req_food)
    assert food["theme"] == "warm_vibrant"
    assert food["primaryColor"] == "#f97316"
    assert any("Coffee" in p["name"] or "Chai" in p["name"] or "Bakery" in p["name"] or "Cake" in p["name"] or "Croissant" in p["name"] for p in food["products"])

    # 4. Home Decor / General category -> clean_minimal
    req_home = MinisiteSuggestRequest(
        shopName="Minimal Living Co",
        category="Home Decor",
    )
    home = _get_deterministic_minisite_suggestions(req_home)
    assert home["theme"] == "clean_minimal"
    assert home["primaryColor"] == "#10b981"


def test_ai_suggest_endpoint_deterministic_fallback():
    """Verify POST /api/minisite/ai-suggest falls back deterministically when OpenAI is not configured."""
    with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
        resp = client.post(
            "/api/minisite/ai-suggest",
            json={
                "shopName": "Nova Sound Lab",
                "category": "Electronics",
                "audience": "Young professionals and audiophiles",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["theme"] == "bold_contrast"
        assert len(data["products"]) >= 3
        assert len(data["differentiators"]) == 3
        assert "heroHeadline" in data
        assert "heroDescription" in data


def test_slug_sanitization_rules():
    """Verify slug sanitization strips harmful characters, spaces, and path traversals."""
    assert sanitize_minisite_slug("boAt Audio Store!") == "boat-audio-store"
    assert sanitize_minisite_slug("Sharma & Sons (Kirana)") == "sharma-sons-kirana"
    assert sanitize_minisite_slug("../../../etc/passwd") == "etc-passwd"
    assert sanitize_minisite_slug("...bad...slug...") == "bad-slug"
    assert sanitize_minisite_slug("") == "storefront"


def test_create_and_fetch_minisite_with_real_images_and_theme():
    """Verify creating a full-featured brand landing page and retrieving it via GET /s/{slug}."""
    test_slug = "test-boat-audio-showcase"
    payload = {
        "shopName": "boAt Audio Lab",
        "slug": test_slug,
        "category": "Electronics",
        "theme": "bold_contrast",
        "primaryColor": "#38bdf8",
        "secondaryColor": "#06090e",
        "whatsapp": "919876543210",
        "instagram": "@boat.audio",
        "address": "Shop 101, High Street Phoenix, Mumbai",
        "hours": "Mon-Sat: 10:00 AM - 9:00 PM",
        "upiId": "boat@upi",
        "heroBadge": "⚡ BASSHEADS EXCLUSIVE",
        "heroHeadline": "Plug Into Nirvana. Pure Sound.",
        "heroDescription": "Engineered for deep bass, crystal highs, and supreme battery endurance.",
        "primaryCtaText": "Claim WhatsApp Offer",
        "secondaryCtaText": "Explore Headphones",
        "brandStory": "Founded to make premium audio gear accessible to every Indian music lover.",
        "differentiators": [
            {"title": "1-Year Brand Replacement Guarantee", "desc": "Direct official warranty support"},
            {"title": "boAt Signature Bass", "desc": "Custom tuned 40mm acoustic drivers"},
            {"title": "Fast Store Dispatch", "desc": "Same-day dispatch from our warehouse"},
        ],
        "products": [
            {
                "name": "Rockerz 450 Pro Headphones",
                "price": "1,999",
                "badge": "Best Seller",
                "description": "40mm dynamic drivers with 70 hours playback.",
                "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
                "emoji": "🎧",
            },
            {
                "name": "Airdopes 141 ANC",
                "price": "1,499",
                "badge": "Trending",
                "description": "Active Noise Cancellation with 42ms low latency.",
                "imageUrl": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500",
                "emoji": "🎧",
            },
        ],
    }

    # Save Minisite
    create_resp = client.post("/api/minisite", json=payload)
    assert create_resp.status_code == 200
    create_data = create_resp.json()
    assert create_data["success"] is True
    assert create_data["slug"] == test_slug

    # Fetch Minisite via public /s/{slug} route
    fetch_resp = client.get(f"/s/{test_slug}")
    assert fetch_resp.status_code == 200
    site = fetch_resp.json()
    assert site["shopName"] == "boAt Audio Lab"
    assert site["theme"] == "bold_contrast"
    assert len(site["products"]) == 2
    assert site["products"][0]["imageUrl"].startswith("https://")
    assert site["products"][0]["badge"] == "Best Seller"
    assert site["primaryCtaText"] == "Claim WhatsApp Offer"


def test_products_without_images_or_prices_are_valid():
    """Verify products with missing images, null prices, or minimal fields are valid and handled cleanly."""
    slug = "test-minimal-products-store"
    payload = {
        "shopName": "Minimal Corner",
        "slug": slug,
        "category": "Retail",
        "whatsapp": "919000000000",
        "products": [
            {
                "name": "Custom Handcrafted Mug",
                "price": "",
                "imageUrl": None,
                "description": "Made to order ceramic mug",
            },
            {
                "name": "Artisan Tea Coaster Set",
            },
        ],
    }

    create_resp = client.post("/api/minisite", json=payload)
    assert create_resp.status_code == 200

    fetch_resp = client.get(f"/s/{slug}")
    assert fetch_resp.status_code == 200
    saved = fetch_resp.json()
    assert len(saved["products"]) == 2
    assert saved["products"][0].get("imageUrl") is None
    assert saved["products"][0].get("price") == ""
    assert saved["products"][1]["name"] == "Artisan Tea Coaster Set"


def test_path_traversal_prevention_on_get_and_post():
    """Ensure malicious directory traversal attempts return 400 or 404 and cannot escape directory."""
    # Attempting to fetch with directory traversal
    resp1 = client.get("/s/../../etc/passwd")
    assert resp1.status_code in [400, 404]

    resp2 = client.get("/s/..%2F..%2Fwindows%2Fsystem.ini")
    assert resp2.status_code in [400, 404]

    # Attempting to create with traversal slug
    resp3 = client.post(
        "/api/minisite",
        json={
            "shopName": "Malicious Shop",
            "slug": "../../evil_escape",
            "category": "Retail",
            "whatsapp": "919876543210",
        },
    )
    # The slug gets sanitized to "evil-escape" safely within the minisites folder
    assert resp3.status_code == 200
    data = resp3.json()
    assert ".." not in data["slug"]
    assert "/" not in data["slug"]
    assert "\\" not in data["slug"]


def test_missing_minisite_returns_404():
    """Ensure non-existent slug returns standard 404."""
    resp = client.get("/s/definitely-does-not-exist-99999999")
    assert resp.status_code == 404
    assert "Website not found" in resp.json()["detail"]


def test_invalid_post_payload_fails_validation():
    """Ensure missing required fields (e.g. shopName or whatsapp) return 422 Unprocessable Entity."""
    # Missing whatsapp
    resp1 = client.post(
        "/api/minisite",
        json={
            "shopName": "No Whatsapp Store",
            "category": "Electronics",
        },
    )
    assert resp1.status_code == 422

    # Missing shopName
    resp2 = client.post(
        "/api/minisite",
        json={
            "whatsapp": "919876543210",
            "category": "Electronics",
        },
    )
    assert resp2.status_code == 422

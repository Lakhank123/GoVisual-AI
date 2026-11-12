"""
GoVisual AI — Addon: Brand Book Service
Generates a complete brand identity kit for a local Indian business
Deterministic, fast, resilient, and offline-safe.
"""
import os, re, httpx, json
from typing import Optional, List, Dict, Any

GEMINI_TEXT_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")

CATEGORY_DEFAULTS = {
    "Electronics":        {"colors": ["#1a73e8", "#202124", "#ffffff"], "vibe": "tech-forward, trustworthy, modern"},
    "Clothing / Fashion": {"colors": ["#e91e63", "#212121", "#fafafa"], "vibe": "stylish, trendy, aspirational"},
    "Food & Drinks":      {"colors": ["#ff6d00", "#1b1b1b", "#fff8e1"], "vibe": "warm, appetising, authentic"},
    "Jewellery":          {"colors": ["#c9a84c", "#1a0a00", "#fff9f0"], "vibe": "luxurious, precious, traditional"},
    "Pharmacy":           {"colors": ["#00897b", "#ffffff", "#e0f2f1"], "vibe": "clean, trustworthy, health-focused"},
    "Home Decor":         {"colors": ["#8d6e63", "#212121", "#fafafa"], "vibe": "warm, aesthetic, comfortable"},
    "Salon & Beauty":     {"colors": ["#ad1457", "#212121", "#fce4ec"], "vibe": "glamorous, confident, self-care"},
    "Furniture":          {"colors": ["#5d4037", "#1c1c1c", "#fdf6ec"], "vibe": "solid, premium, reliable"},
    "Grocery / Kirana":   {"colors": ["#388e3c", "#1b1b1b", "#f1f8e9"], "vibe": "fresh, local, everyday trusted"},
    "Mobile Repair":      {"colors": ["#1565c0", "#111", "#e3f2fd"],    "vibe": "quick, reliable, tech-savvy"},
}

TAGLINES_BY_CATEGORY = {
    "Electronics":        "{name} — Smart Tech, Honest Prices",
    "Clothing / Fashion": "{name} — Elegance in Every Thread",
    "Food & Drinks":      "{name} — Authentic Taste, Fresh Daily",
    "Jewellery":          "{name} — Pure Gold, Timeless Grace",
    "Pharmacy":           "{name} — Care and Wellness You Can Trust",
    "Home Decor":         "{name} — Beautiful Living for Modern Homes",
    "Salon & Beauty":     "{name} — Unveil Your Natural Glow",
    "Furniture":          "{name} — Crafted for Comfort and Life",
    "Grocery / Kirana":   "{name} — Fresh Essentials for Every Home",
    "Mobile Repair":      "{name} — Quick and Reliable Service",
    "default":            "{name} — Quality You Can Trust",
}

FONTS = {
    "Electronics":        [("Poppins Bold", "Headlines"), ("Roboto Mono", "Prices & specs"), ("Inter", "Body copy")],
    "Clothing / Fashion": [("Playfair Display", "Headlines"), ("Lato", "Body"), ("Great Vibes", "Accent / luxury")],
    "Food & Drinks":      [("Pacifico", "Headlines"), ("Nunito", "Body"), ("Oswald", "Prices")],
    "Jewellery":          [("Cormorant Garamond", "Headlines"), ("EB Garamond", "Body"), ("Cinzel", "Accent")],
    "default":            [("Poppins Bold", "Headlines"), ("Inter Regular", "Body"), ("Noto Sans Devanagari", "Hindi/Marathi text")],
}

DOS_BY_CATEGORY = {
    "Electronics":   ["Always show MRP and offer price clearly", "Add 'Warranty included' badge", "Post unboxing videos on Instagram Reels"],
    "Food & Drinks": ["Show fresh ingredients and preparation", "Post during 11 AM–1 PM (lunch) and 6–8 PM (dinner)", "Add 'Order on WhatsApp' CTA"],
    "Jewellery":     ["Shoot jewellery on model, not flat lay only", "Post during wedding seasons (Oct–Feb)", "Add 'Hallmarked gold' trust badge"],
    "default":       ["Always show the price — local customers value transparency", "Use conversational language for captions", "Include WhatsApp number in every creative"],
}

DONTS_BY_CATEGORY = {
    "Electronics":   ["Don't post blurry product images", "Don't hide the price", "Don't post without a warranty mention"],
    "Food & Drinks": ["Don't post cold or unappetising food photos", "Don't ignore delivery time in captions", "Don't use stock photos — use real food"],
    "default":       ["Don't use more than 3 colors in one creative", "Don't ignore DMs and comments", "Don't post at random times"],
}


class BrandBookService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10)

    def _resolve_category(self, cat: Optional[str]) -> str:
        """Resolve category flexibly handling slashes, spaces, and case differences."""
        if not cat or not cat.strip():
            return "Grocery / Kirana"
        clean = re.sub(r"[^a-zA-Z]", "", cat).lower()
        for standard_cat in CATEGORY_DEFAULTS.keys():
            std_clean = re.sub(r"[^a-zA-Z]", "", standard_cat).lower()
            if clean == std_clean or clean in std_clean or std_clean in clean:
                return standard_cat
        return "Grocery / Kirana"

    async def generate(
        self,
        business_name: str,
        category: str,
        tagline: str | None = None,
        existing_colors: list[str] | None = None,
        logo_colors: list[str] | None = None,
        captions_text: str | None = None,
        post_images_count: int = 0,
        whatsapp: str | None = None,
        instagram: str | None = None,
        city: str | None = None,
    ) -> dict:
        clean_name = (business_name or "").strip() or "My Brand"
        clean_cat  = (category or "").strip() or "Clothing / Fashion"
        resolved_cat = self._resolve_category(clean_cat)

        defaults = CATEGORY_DEFAULTS.get(resolved_cat, CATEGORY_DEFAULTS["Grocery / Kirana"])
        fonts    = FONTS.get(resolved_cat, FONTS["default"])
        dos      = DOS_BY_CATEGORY.get(resolved_cat, DOS_BY_CATEGORY["default"])
        donts    = DONTS_BY_CATEGORY.get(resolved_cat, DONTS_BY_CATEGORY["default"])

        # Use extracted logo colors if available, else existing colors, else defaults
        candidate_colors = logo_colors if (logo_colors and len(logo_colors) > 0) else (
            existing_colors if (existing_colors and len(existing_colors) > 0) else defaults["colors"]
        )
        
        # Ensure at least 3 valid colors exist
        colors_hex = list(candidate_colors) if candidate_colors else []
        for def_c in defaults["colors"]:
            if len(colors_hex) < 3:
                colors_hex.append(def_c)

        # Generate tagline if not provided
        if not tagline or not tagline.strip():
            tagline = await self._generate_tagline(clean_name, resolved_cat, defaults["vibe"])

        color_names = ["Primary", "Secondary", "Accent"]
        color_uses  = [
            "Main brand color — buttons, headings, highlights",
            "Background — gives depth and contrast",
            "Supporting color — borders, icons, tags",
        ]

        caption_analysis = await self._analyse_captions(captions_text)
        voice_words = caption_analysis.get("voice_words") or self._voice_words(resolved_cat)

        return {
            "businessName": clean_name,
            "category":     clean_cat,
            "tagline":      tagline,
            "vibe":         defaults["vibe"],
            "colors": [
                {"hex": colors_hex[i] if i < len(colors_hex) else defaults["colors"][i], "name": color_names[i], "use": color_uses[i]}
                for i in range(3)
            ],
            "fonts": [
                {"name": f[0], "use": f[1], "style": "Google Fonts — free to use"}
                for f in fonts
            ],
            "voiceWords": voice_words[:5] if voice_words else ["Trustworthy", "Affordable", "Local", "Premium", "Fast"],
            "doList":     dos,
            "dontList":   donts,
            "postingTips": self._posting_tips(resolved_cat),
            "hashtagSets": self._hashtags(clean_name, clean_cat, city),
            "city":        city or "Local",
            "logoColors":  logo_colors or [],
            "captionAnalysis": caption_analysis,
            "whatsapp":    whatsapp or "",
            "instagram":   instagram or "",
        }

    async def _analyse_captions(self, captions_text: str | None) -> dict:
        default_res = {
            "tone": "Friendly",
            "avg_length": "Medium",
            "themes": ["Products", "Offers", "Local"],
            "voice_words": ["Trustworthy", "Affordable", "Local", "Premium", "Fast"]
        }
        if not captions_text or not captions_text.strip():
            return default_res

        # Fast deterministic keyword analysis
        text_lower = captions_text.lower()
        tone = "Friendly"
        if any(k in text_lower for k in ["offer", "sale", "discount", "off", "deal", "limited"]):
            tone = "Promotional"
        elif any(k in text_lower for k in ["diwali", "festive", "celebrate", "pooja", "eid", "christmas"]):
            tone = "Festive"
        elif any(k in text_lower for k in ["luxury", "handcrafted", "pure", "gold", "silk", "bespoke"]):
            tone = "Luxurious"
        elif any(k in text_lower for k in ["fast", "urgent", "hurry", "quick", "today"]):
            tone = "Energetic"

        words = re.findall(r"\b[A-Za-z]{4,}\b", captions_text)
        avg_len = "Short" if len(words) < 20 else ("Medium" if len(words) < 60 else "Long")

        return {
            "tone": tone,
            "avg_length": avg_len,
            "themes": ["Products", "Offers", "Craftsmanship"],
            "voice_words": ["Trustworthy", "Affordable", "Authentic", "Local", "Quality"]
        }

    async def _generate_tagline(self, name: str, category: str, vibe: str) -> str:
        """Deterministic offline tagline generation with clean formatting."""
        template = TAGLINES_BY_CATEGORY.get(category, TAGLINES_BY_CATEGORY["default"])
        return template.format(name=name)

    def _voice_words(self, category: str) -> list[str]:
        mapping = {
            "Electronics":        ["Reliable", "Tech-Forward", "Affordable", "Warranted", "Modern"],
            "Clothing / Fashion": ["Stylish", "Trendy", "Affordable", "Local", "Fashionable"],
            "Food & Drinks":      ["Fresh", "Delicious", "Homemade", "Quick", "Hygienic"],
            "Jewellery":          ["Precious", "Elegant", "Hallmarked", "Traditional", "Gifting"],
            "Pharmacy":           ["Trusted", "Genuine", "Health-First", "Expert", "Safe"],
            "default":            ["Trustworthy", "Affordable", "Local", "Premium", "Fast"],
        }
        return mapping.get(category, mapping["default"])

    def _posting_tips(self, category: str) -> list[str]:
        return [
            "Best posting times: 9 AM, 1 PM, 7 PM IST",
            "Use Instagram Reels for 3× more reach than static posts",
            "Add WhatsApp link in your bio for direct orders",
            "Post at least 4 times per week for consistent growth",
            "Use GoVisual AI to create all 4 posts in under 10 minutes",
        ]

    def _hashtags(self, name: str, category: str, city: str | None = None) -> dict:
        clean_city = re.sub(r"[^a-zA-Z0-9]", "", city or "Local") or "Local"
        city_tags = f"#{clean_city} #{clean_city}Shopping #{clean_city}Local #{clean_city}Business #ShopLocal"
        cat_tags_map = {
            "Electronics":        "#Electronics #MobileShop #Gadgets #TechDeals #ElectronicsShop",
            "Clothing / Fashion": "#Fashion #IndianFashion #Boutique #StyleIndia #EthnicWear",
            "Food & Drinks":      f"#{clean_city}Foodie #StreetFood #HomeMade #FoodLovers #LocalFood",
            "Jewellery":          "#Jewellery #GoldJewellery #BridalJewellery #IndianJewellery #Hallmark",
            "default":            f"#ShopLocal #SmallBusiness #{clean_city}SMB #SupportLocal #LocalBusiness",
        }
        cat_tags  = cat_tags_map.get(category, cat_tags_map["default"])
        clean_shop = re.sub(r"[^a-zA-Z0-9]", "", name) or "MyBrand"
        shop_tag  = f"#{clean_shop}"
        return {
            "local":    city_tags,
            "category": cat_tags,
            "branded":  f"{shop_tag} #GoVisualAI",
            "combined": f"{city_tags} {cat_tags} {shop_tag}",
        }

"""
GoVisual AI — Addon: Brand Book Service
Generates a complete brand identity kit for a local Indian business
"""
import os, httpx, json

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
    "default":       ["Always show the price — Mumbai customers value transparency", "Use Hinglish or Marathi for captions", "Include WhatsApp number in every creative"],
}

DONTS_BY_CATEGORY = {
    "Electronics":   ["Don't post blurry product images", "Don't hide the price", "Don't post without a warranty mention"],
    "Food & Drinks": ["Don't post cold or unappetising food photos", "Don't ignore delivery time in captions", "Don't use stock photos — use real food"],
    "default":       ["Don't use more than 3 colors in one creative", "Don't ignore DMs and comments", "Don't post at random times"],
}

class BrandBookService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30)

    async def generate(
        self,
        business_name: str,
        category: str,
        tagline: str | None,
        existing_colors: list[str] | None = None,
        logo_colors: list[str] | None = None,
        captions_text: str | None = None,
        post_images_count: int = 0,
        whatsapp: str | None = None,
        instagram: str | None = None
    ) -> dict:
        defaults  = CATEGORY_DEFAULTS.get(category, CATEGORY_DEFAULTS["Grocery / Kirana"])
        fonts     = FONTS.get(category, FONTS["default"])
        dos       = DOS_BY_CATEGORY.get(category, DOS_BY_CATEGORY["default"])
        donts     = DONTS_BY_CATEGORY.get(category, DONTS_BY_CATEGORY["default"])

        # Use extracted colors if available, else category defaults
        colors_hex = logo_colors if logo_colors else (existing_colors if existing_colors else defaults["colors"])

        # Generate tagline via Gemini if not provided
        if not tagline:
            tagline = await self._generate_tagline(business_name, category, defaults["vibe"])

        color_names = ["Primary", "Secondary", "Accent"]
        color_uses  = [
            "Main brand color — buttons, headings, highlights",
            "Background — gives depth and contrast",
            "Supporting color — borders, icons, tags",
        ]

        caption_analysis = await self._analyse_captions(captions_text)
        voice_words = caption_analysis.get("voice_words", self._voice_words(category))

        return {
            "businessName": business_name,
            "category":     category,
            "tagline":      tagline,
            "vibe":         defaults["vibe"],
            "colors": [
                {"hex": h, "name": color_names[i], "use": color_uses[i]}
                for i, h in enumerate(colors_hex[:3])
            ],
            "fonts": [
                {"name": f[0], "use": f[1], "style": "Google Fonts — free to use"}
                for f in fonts
            ],
            "voiceWords": voice_words[:5],
            "doList":     dos,
            "dontList":   donts,
            "postingTips": self._posting_tips(category),
            "hashtagSets": self._hashtags(business_name, category),
            "logoColors": logo_colors or [],
            "captionAnalysis": caption_analysis,
            "whatsapp": whatsapp,
            "instagram": instagram,
        }

    async def _analyse_captions(self, captions_text: str | None) -> dict:
        default_res = {
            "tone": "Friendly",
            "avg_length": "Medium",
            "themes": ["Products", "Offers", "Local"],
            "voice_words": ["Trustworthy", "Affordable", "Local", "Premium", "Fast"]
        }
        if not OPENAI_API_KEY and (not GEMINI_API_KEY or not captions_text):
            return default_res
        if not captions_text:
            return default_res
        
        # If OpenAI is present, use OpenAI
        if OPENAI_API_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "user", "content": (
                            f"Analyse these social media captions from an Indian local business. "
                            f"Return a JSON object with these exact fields: "
                            f"\"tone\" (one of: Friendly, Professional, Festive, Casual, Energetic), "
                            f"\"avg_length\" (one of: Short, Medium, Long), "
                            f"\"themes\" (array of 3 strings describing content themes), "
                            f"\"voice_words\" (array of 5 adjectives describing brand voice). "
                            f"Captions: {captions_text}"
                        )}
                    ],
                    "response_format": {"type": "json_object"}
                }
                resp = await self.client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
                if resp.status_code == 200:
                    text = resp.json()["choices"][0]["message"]["content"].strip()
                    result = json.loads(text)
                    if all(k in result for k in ["tone", "avg_length", "themes", "voice_words"]):
                        return result
            except Exception as e:
                print(f"Error in _analyse_captions with OpenAI: {e}")

        # Fallback to Gemini
        if GEMINI_API_KEY:
            try:
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": (
                                f"Analyse these social media captions from an Indian local business. "
                                f"Return a JSON object with these fields: "
                                f"tone (one of: Friendly, Professional, Festive, Casual, Energetic), "
                                f"avg_length (one of: Short, Medium, Long), "
                                f"themes (array of 3 strings describing content themes), "
                                f"voice_words (array of 5 adjectives describing brand voice). "
                                f"Captions: {captions_text}"
                            )
                        }]
                    }],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }
                resp = await self.client.post(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                    json=payload,
                    headers={"x-goog-api-key": GEMINI_API_KEY}
                )
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                    result = json.loads(text)
                    if all(k in result for k in ["tone", "avg_length", "themes", "voice_words"]):
                        return result
            except Exception as e:
                print(f"Error in _analyse_captions with Gemini: {e}")

        return default_res

    async def _generate_tagline(self, name: str, category: str, vibe: str) -> str:
        if not OPENAI_API_KEY and not GEMINI_API_KEY:
            return f"{name} — Quality You Can Trust"

        # If OpenAI is present, use OpenAI
        if OPENAI_API_KEY:
            try:
                headers = {
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "user", "content": (
                            f"Generate a short, catchy tagline for an Indian local business. "
                            f"Business name: {name}. Category: {category}. Vibe: {vibe}. "
                            f"The tagline should be 5-10 words, optionally mixing English and Hindi. "
                            f"Return only the tagline, nothing else."
                        )}
                    ]
                }
                resp = await self.client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip().strip('"')
            except Exception as e:
                print(f"Error in _generate_tagline with OpenAI: {e}")

        # Fallback to Gemini
        if GEMINI_API_KEY:
            try:
                payload = {"contents": [{"parts": [{"text":
                    f"Generate a short, catchy tagline for an Indian local business. "
                    f"Business name: {name}. Category: {category}. Vibe: {vibe}. "
                    f"The tagline should be 5-10 words, optionally mixing English and Hindi. "
                    f"Return only the tagline, nothing else."
                }]}]}
                resp = await self.client.post(GEMINI_TEXT_URL, json=payload, headers={"x-goog-api-key": GEMINI_API_KEY})
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip().strip('"')
            except Exception as e:
                print(f"Error in _generate_tagline with Gemini: {e}")

        return f"{name} — Trusted by Mumbai"

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

    def _hashtags(self, name: str, category: str) -> dict:
        city_tags    = "#Mumbai #MumbaiShopping #MumbaiLocal #MumbaiBusiness #LocalMumbai"
        cat_tags_map = {
            "Electronics":        "#Electronics #MobileShop #Gadgets #TechDeals #ElectronicsShop",
            "Clothing / Fashion": "#Fashion #IndianFashion #Boutique #StyleIndia #EthnicWear",
            "Food & Drinks":      "#MumbaiFoodie #StreetFood #HomeMade #FoodLovers #MumbaiFood",
            "Jewellery":          "#Jewellery #GoldJewellery #BridalJewellery #IndianJewellery #Hallmark",
            "default":            "#ShopLocal #SmallBusiness #MumbaiSMB #SupportLocal #IndianBusiness",
        }
        cat_tags  = cat_tags_map.get(category, cat_tags_map["default"])
        shop_tag  = f"#{name.replace(' ', '').replace('.', '')}"
        return {
            "local":    city_tags,
            "category": cat_tags,
            "branded":  f"{shop_tag} #GoVisualAI",
            "combined": f"{city_tags} {cat_tags} {shop_tag}",
        }

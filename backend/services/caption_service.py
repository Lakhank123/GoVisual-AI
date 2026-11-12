import json
import os
import re
from typing import Any, Dict, List, Optional

import httpx


def _fallback_caption(product: str, brand_name: str, offer: str) -> str:
    offer_text = f" {offer}" if offer and offer.lower() not in {"no", "no offer"} else ""
    return f"{product} by {brand_name}.{offer_text} Shop now."


def _fallback_post_content(
    product: str,
    brand_name: str,
    category: str = "",
    mood: str = "",
    offer: str = "",
) -> Dict[str, Any]:
    """Generates structured, high-quality fallback copy without requiring API calls."""
    caption = _fallback_caption(product, brand_name, offer)

    # Derive clean hashtags from brand, product, and category
    clean_brand = re.sub(r"[^a-zA-Z0-9]", "", brand_name) or "GoVisual"
    clean_product = re.sub(r"[^a-zA-Z0-9]", "", product) or "Product"
    clean_category = re.sub(r"[^a-zA-Z0-9]", "", category) or "Marketing"

    tags = [
        f"#{clean_brand}",
        f"#{clean_product}",
        f"#{clean_category}",
        "#NewArrivals",
        "#ShopLocal",
        "#VisualMarketing",
    ]
    hashtags = " ".join(dict.fromkeys(tags))

    # Mood-based creative audio recommendation (creative guideline only, not live trend data)
    mood_lower = (mood or "").lower()
    if "luxury" in mood_lower or "premium" in mood_lower or "dark" in mood_lower:
        vibe = "Deep Ambient & Minimal Luxury Beats"
        search_terms = ["luxury beats", "deep lounge", "minimal aesthetic", "editorial fashion"]
    elif "festive" in mood_lower or "diwali" in mood_lower:
        vibe = "Warm Acoustic & Festive Celebration Beats"
        search_terms = ["festive instrumental", "celebration acoustic", "indian folk fusion", "warm ambient"]
    elif "nature" in mood_lower or "organic" in mood_lower or "green" in mood_lower:
        vibe = "Organic Acoustic & Fresh Morning Chill"
        search_terms = ["organic acoustic", "nature ambient", "warm morning guitar", "calm instrumental"]
    elif "bold" in mood_lower or "editorial" in mood_lower or "energetic" in mood_lower:
        vibe = "High-Energy Synth & Modern Street Rhythm"
        search_terms = ["street rhythm", "urban beat", "upbeat electronic", "commercial synth"]
    else:
        vibe = "Modern Commercial & Upbeat Acoustic"
        search_terms = ["upbeat acoustic", "clean commercial pop", "positive indie beat", "feel good instrumental"]

    return {
        "caption": caption,
        "hashtags": hashtags,
        "audio_recommendation": {
            "vibe": vibe,
            "search_terms": search_terms,
            "disclaimer": "Creative recommendation based on visual style. GoVisual AI does not license or automatically attach copyrighted music; choose in Instagram app.",
        },
    }


async def generate_caption(
    product: str,
    brand_name: str,
    offer: str,
    purpose: str,
    language: str = "English",
) -> str:
    """Generate short marketing copy with the configured Groq key, with a local fallback."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return _fallback_caption(product, brand_name, offer)

    prompt = (
        f"Write one concise {language} marketing caption for {product} by {brand_name}. "
        f"Goal: {purpose}. Offer: {offer}. Return caption text only, under 20 words."
    )
    payload = {
        "model": os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b"),
        "messages": [
            {"role": "system", "content": "You write concise, accurate marketing captions."},
            {"role": "user", "content": prompt},
        ],
        "max_completion_tokens": 96,
        "temperature": 0.4,
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"].strip()
            return content or _fallback_caption(product, brand_name, offer)
    except Exception:
        return _fallback_caption(product, brand_name, offer)


async def generate_instagram_post_content(
    product: str,
    brand_name: str,
    category: str = "",
    mood: str = "",
    purpose: str = "",
    offer: str = "",
    language: str = "English",
) -> Dict[str, Any]:
    """
    Generates structured Instagram caption, hashtag suggestions, and audio mood recommendations.
    Uses Groq JSON mode when configured, with a deterministic fallback.
    Never invents live trend statistics or claims music licensing.
    """
    fallback = _fallback_post_content(
        product=product,
        brand_name=brand_name,
        category=category,
        mood=mood,
        offer=offer,
    )

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return fallback

    prompt = (
        f"Generate an engaging Instagram post for a local business.\n"
        f"Product: {product}\n"
        f"Brand Name: {brand_name}\n"
        f"Category: {category or 'General'}\n"
        f"Visual Mood: {mood or 'Modern Commercial'}\n"
        f"Campaign Purpose: {purpose or 'Brand Showcase'}\n"
        f"Offer: {offer or 'None'}\n"
        f"Language: {language}\n\n"
        f"Return ONLY valid JSON with this exact schema:\n"
        f"{{\n"
        f'  "caption": "1 to 2 engaging sentences suited for Instagram feed, max 35 words",\n'
        f'  "hashtags": "5 to 8 relevant hashtags separated by spaces starting with #",\n'
        f'  "audio_vibe": "Short descriptive vibe for background music",\n'
        f'  "search_terms": ["2 to 4 recommended audio search terms for Instagram reels/posts"]\n'
        f"}}"
    )

    payload = {
        "model": os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b"),
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a professional social media marketing copywriter. "
                    "Output clean, valid JSON only. Never claim hashtags are 'trending' without proof. "
                    "Provide creative musical styling recommendations only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
        "max_completion_tokens": 256,
        "temperature": 0.5,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            raw_text = response.json()["choices"][0]["message"]["content"].strip()
            data = json.loads(raw_text)

            caption = (data.get("caption") or fallback["caption"]).strip()
            hashtags = (data.get("hashtags") or fallback["hashtags"]).strip()
            vibe = data.get("audio_vibe") or fallback["audio_recommendation"]["vibe"]
            search_terms = data.get("search_terms") or fallback["audio_recommendation"]["search_terms"]

            if not isinstance(search_terms, list):
                search_terms = [str(search_terms)]

            return {
                "caption": caption,
                "hashtags": hashtags,
                "audio_recommendation": {
                    "vibe": vibe,
                    "search_terms": search_terms,
                    "disclaimer": "Creative recommendation based on visual style. GoVisual AI does not license or automatically attach copyrighted music; choose in Instagram app.",
                },
            }
    except Exception:
        return fallback


def generate_instagram_strategy(
    category: str = "Retail",
    business_name: str = "Local Business",
    goal: str = "Increase Sales",
) -> Dict[str, Any]:
    """
    Generates an actionable, easy-to-follow Instagram content strategy
    for small-business owners without prompt engineering jargon.
    Explains what to post, which format to choose, when to post, and how to maintain brand consistency.
    """
    clean_cat = category.strip() if category else "Retail"
    clean_biz = business_name.strip() if business_name else "Your Shop"

    pillars = [
        {
            "name": "Product Spotlight & Craftsmanship",
            "weight": "40%",
            "purpose": "Showcase fine materials, real benefits, and clear pricing.",
            "recommended_format": "Photoshoot Studio Shot (1:1 Feed Post or Carousel)",
            "tip": "Keep the product front and center. Use clean studio or lifestyle backdrops."
        },
        {
            "name": "Offers & Urgent Promotions",
            "weight": "30%",
            "purpose": "Drive sales conversion, festival discounts, and seasonal offers.",
            "recommended_format": "Campaign Creative (1:1 Feed or 9:16 Story)",
            "tip": "Highlight the discount or CTA prominently with a deadline."
        },
        {
            "name": "Behind the Scenes & Brand Story",
            "weight": "20%",
            "purpose": "Build trust, authentic connection, and customer loyalty.",
            "recommended_format": "Lifestyle in-use or Reels video",
            "tip": "Show packing orders, customer favorites, or how products are made."
        },
        {
            "name": "Customer Love & Social Proof",
            "weight": "10%",
            "purpose": "Validate quality through reviews, unboxing, and mentions.",
            "recommended_format": "Stories & Highlight Re-shares",
            "tip": "Save top reviews into an 'Our Customers' Story Highlight."
        }
    ]

    cadence = {
        "weekly_frequency": "3 to 4 posts per week",
        "best_times": ["11:00 AM - 1:00 PM (Lunch break)", "7:00 PM - 9:30 PM (Evening leisure)"],
        "recommended_mix": "2 Feed Posts (Product + Offer), 1 Reel / Video, 3-5 Daily Stories",
        "consistency_rule": "Post on consistent days (e.g., Tuesday, Thursday, Saturday) to train the algorithm and your audience."
    }

    return {
        "business_name": clean_biz,
        "category": clean_cat,
        "primary_goal": goal,
        "content_pillars": pillars,
        "posting_cadence": cadence,
        "actionable_checklist": [
            "Always include a clear Call-to-Action (e.g. 'DM to order', 'Click link in bio').",
            "Use 5-8 hyper-relevant hashtags instead of 30 generic tags.",
            "Pick matching background music inside Instagram for extra reach.",
            "Reply to all comments and inquiries within the first hour of posting."
        ]
    }


def generate_caption_alternatives(
    product: str,
    brand_name: str,
    category: str = "",
    shot_label: str = "",
    tone: str = "",
    offer: str = "",
    purpose: str = "",
    language: str = "English",
    visual_description: str = "",
    background: str = "",
    lighting: str = "",
) -> Dict[str, Any]:
    """
    Generates 3 distinct, image-aware caption alternatives:
    1. Short & Punchy (under 12 words, high impact)
    2. Storytelling / Emotional (connects craftsmanship, identity, and visual appeal)
    3. Promotional / Offer-driven (clear CTA, value proposition, conversion focus)
    Returns structured alternatives with labels, descriptions, and hashtags.
    Deterministic, offline-safe, and consumes zero credits.
    """
    clean_p = product.strip() if product else "Product"
    clean_b = brand_name.strip() if brand_name else "Our Shop"
    clean_cat = category.strip() if category else "Collection"
    clean_shot = shot_label.strip() if shot_label else "Showcase"
    clean_tone = tone.strip() if tone else "Premium"
    clean_vis = visual_description.strip() if visual_description else ""
    clean_bg = background.strip() if background else ""
    has_offer = bool(offer and offer.strip() and offer.lower() not in {"no", "no offer", "none"})

    # Alternative 1: Short & Punchy
    if clean_vis:
        punchy_caption = f"{clean_vis.rstrip('.')}. Discover {clean_p} by {clean_b}. ✨"
    elif clean_bg:
        punchy_caption = f"Framed in {clean_bg.lower()}. The {clean_p} by {clean_b}. 🌟"
    else:
        punchy_templates = [
            f"Pure craft. Timeless grace. Discover {clean_p} by {clean_b}. ✨",
            f"Simplicity speaks loudest. The all-new {clean_p} is here. 🌟",
            f"Elevate your daily style with {clean_p} by {clean_b}. 🔥",
        ]
        punchy_idx = abs(hash(clean_p + clean_shot)) % len(punchy_templates)
        punchy_caption = punchy_templates[punchy_idx]

    # Alternative 2: Storytelling / Emotional
    if clean_vis:
        story_caption = f"Captured in {clean_vis.lower()}, every contour of {clean_p} speaks to dedicated artistry. Handcrafted by {clean_b} to bring authentic luxury and warmth to your world. ✨🌿"
    elif clean_bg:
        story_caption = f"Set against {clean_bg.lower()}, {clean_p} brings together timeless Indian heritage and modern sensibilities. Designed by {clean_b} to make every occasion memorable. 🪔✨"
    else:
        story_templates = [
            f"Behind every fold of {clean_p} lies an obsession with detail. Handcrafted with passion by {clean_b} to bring authentic warmth and luxury to your everyday moments. Step into elegance that lasts. ✨🌿",
            f"Crafted for those who appreciate understated elegance. {clean_p} brings together timeless Indian heritage and modern sensibilities. Designed by {clean_b} to make every occasion memorable. 🪔✨",
            f"When passion meets fine craftsmanship. {clean_p} by {clean_b} is more than just a product—it's a story of devotion, quality, and style you can feel. 💛",
        ]
        story_idx = abs(hash(clean_p + clean_b + clean_cat)) % len(story_templates)
        story_caption = story_templates[story_idx]

    # Alternative 3: Promotional / Offer-driven
    if has_offer:
        offer_caption = f"Exclusive limited-time drop! {clean_p} by {clean_b} is now available with {offer.strip()}. Tap link in bio or send a direct message to secure yours before stocks run out! 🛍️✨"
    elif clean_bg:
        offer_caption = f"Styled in {clean_bg.lower()}: {clean_p} by {clean_b} is ready to order with fast dispatch. Tap the link in bio to shop now! 🚀📦"
    else:
        offer_caption = f"Ready to experience {clean_p}? Handcrafted by {clean_b} with premium materials and fast shipping. Order directly via DM or click the link in bio to shop now! 🚀📦"

    # Hashtags
    c_b = re.sub(r"[^a-zA-Z0-9]", "", clean_b) or "GoVisual"
    c_p = re.sub(r"[^a-zA-Z0-9]", "", clean_p) or "Product"
    c_c = re.sub(r"[^a-zA-Z0-9]", "", clean_cat) or "Fashion"
    hashtags = f"#{c_b} #{c_p} #{c_c} #ShopLocal #NewArrivals #Handcrafted #IndianBrand"

    return {
        "success": True,
        "product": clean_p,
        "brand_name": clean_b,
        "shot_label": clean_shot,
        "alternatives": [
            {
                "id": "punchy",
                "label": "Short & Punchy",
                "badge": "High Reach",
                "tone": "Impactful",
                "caption": punchy_caption,
                "description": "Concise, thumb-stopping hook ideal for quick feed scanning."
            },
            {
                "id": "story",
                "label": "Storytelling & Craft",
                "badge": "Brand Connection",
                "tone": "Warm & Authentic",
                "caption": story_caption,
                "description": "Evocative narrative highlighting craftsmanship, tradition, and emotion."
            },
            {
                "id": "offer",
                "label": "Promotional & Offer",
                "badge": "Conversion Focus",
                "tone": "Action-Oriented",
                "caption": offer_caption,
                "description": "Direct call-to-action tailored to drive orders, inquiries, or link clicks."
            }
        ],
        "hashtags": hashtags,
    }



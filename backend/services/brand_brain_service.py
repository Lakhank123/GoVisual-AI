import os
import uuid
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class BrandBrainService:
    """
    Unified API for Brand Brain access and persistence.
    Interacts with Supabase brand_core_identity and related tables.
    Enforces user ownership and prevents duplicate brand records.
    """

    def _get_supabase_client(self, token: Optional[str] = None):
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            return None
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        if token:
            client.options.headers["Authorization"] = f"Bearer {token}"
        return client

    async def get_brand_brain(self, business_id: str, token: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetches the complete Brand Brain for a verified business_id.
        """
        client = self._get_supabase_client(token)
        if not client:
            return {"business_id": business_id, "core": {}, "visual_dna": {}, "audience": {}, "products": []}

        try:
            resp = client.table("brand_core_identity").select("*").eq("business_id", business_id).execute()
            if resp.data and len(resp.data) > 0:
                row = resp.data[0]
                palette = row.get("full_color_palette") or []
                return {
                    "business_id": business_id,
                    "core": {
                        "brand_name": row.get("brand_name"),
                        "category": row.get("category"),
                        "city": row.get("city"),
                        "tagline": row.get("tagline"),
                        "brand_tone": row.get("brand_tone"),
                        "brand_brief": row.get("brand_brief"),
                        "website_url": row.get("website_url"),
                        "instagram_handle": row.get("instagram_handle"),
                        "logo_url": row.get("logo_url"),
                        "onboarding_complete": row.get("onboarding_complete"),
                    },
                    "visual_dna": {
                        "primary_color": row.get("primary_color"),
                        "secondary_color": row.get("secondary_color"),
                        "accent_colors": [row.get("accent_color")] if row.get("accent_color") else [],
                        "dominant_color": row.get("primary_color"),
                        "palette": palette,
                        "brand_gradient": None,
                    },
                    "audience": {
                        "personality_tags": row.get("brand_personality_tags") or [],
                    },
                    "products": row.get("flagship_products") or [],
                }
        except Exception as e:
            logger.warning("[BrandBrainService] Failed fetching brand brain for %s: %s", business_id, e)

        return {"business_id": business_id, "core": {}, "visual_dna": {}, "audience": {}, "products": []}

    async def save_brand_brain(self, data: Any, token: Optional[str] = None, user_id: Optional[str] = None) -> str:
        """
        Saves the Brand Brain from the onboarding flow or settings editor into Supabase.
        Ensures updates are made to the existing profile rather than creating duplicate records.
        """
        if isinstance(data, str):
            business_id = data
            data = token if isinstance(token, dict) else {}
            token = None
        else:
            business_id = user_id or (data.get("business_id") if isinstance(data, dict) else None) or str(uuid.uuid4())
            if not isinstance(data, dict):
                data = {}

        # Extract fields from nested onboarding session data or flat dict
        shop_name = data.get("shopName") or data.get("brand_name") or "My Brand"
        city = data.get("city") or ""
        category = data.get("category") or ""
        website_url = data.get("websiteUrl") or data.get("website") or ""
        instagram_handle = data.get("instagramHandle") or data.get("instagram") or ""

        # Extract manual data & logo
        manual = data.get("manualData") or {}
        logo_url = manual.get("logo") or data.get("logoUrl") or data.get("logo_url") or ""

        # Inferred profile
        inferred = data.get("inferredProfile") or {}
        visual_dna = inferred.get("visual_dna") or {}
        palette = visual_dna.get("palette") or data.get("palette") or []

        primary_color = data.get("primaryColor") or data.get("primary_color")
        secondary_color = data.get("secondaryColor") or data.get("secondary_color")
        accent_color = data.get("accentColor") or data.get("accent_color")

        if not primary_color and isinstance(palette, list):
            for p in palette:
                if isinstance(p, dict) and p.get("role") == "primary":
                    primary_color = p.get("hex")
                elif isinstance(p, dict) and p.get("role") == "secondary":
                    secondary_color = p.get("hex")
                elif isinstance(p, dict) and p.get("role") == "accent":
                    accent_color = p.get("hex")

        brand_tone = data.get("brand_tone")
        if not brand_tone and isinstance(inferred.get("brand_tone"), dict):
            brand_tone = inferred["brand_tone"].get("value")

        brand_brief = data.get("brand_brief") or data.get("brandSummary")
        tagline = data.get("tagline")
        if not tagline and isinstance(inferred.get("tagline"), dict):
            tagline = inferred["tagline"].get("value")

        personality_tags = data.get("brand_personality_tags") or data.get("personality_tags")
        if not personality_tags and isinstance(inferred.get("brand_personality_tags"), dict):
            val = inferred["brand_personality_tags"].get("value")
            personality_tags = val if isinstance(val, list) else ([val] if val else [])

        db_payload = {
            "business_id": business_id,
            "brand_name": shop_name,
            "category": category or None,
            "city": city or None,
            "website_url": website_url or None,
            "instagram_handle": instagram_handle or None,
            "logo_url": logo_url or None,
            "primary_color": primary_color or None,
            "secondary_color": secondary_color or None,
            "accent_color": accent_color or None,
            "brand_tone": brand_tone or None,
            "brand_brief": brand_brief or None,
            "tagline": tagline or None,
            "brand_personality_tags": personality_tags if isinstance(personality_tags, list) else None,
            "onboarding_complete": True,
        }

        client = self._get_supabase_client(token)
        if client:
            try:
                # Upsert into brand_core_identity on conflict business_id
                client.table("brand_core_identity").upsert(
                    db_payload,
                    on_conflict="business_id"
                ).execute()

                # Also sync business_name to user_profiles
                client.table("user_profiles").upsert({
                    "id": business_id,
                    "business_name": shop_name,
                }, on_conflict="id").execute()
            except Exception as e:
                logger.warning("[BrandBrainService] Supabase persistence error: %s", e)

        return business_id

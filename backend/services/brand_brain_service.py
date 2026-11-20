import os
import json
import uuid
import logging
from typing import Dict, Any, Optional
from database.local_workspace_store import LocalWorkspaceStore

logger = logging.getLogger(__name__)

class BrandBrainService:
    """
    Interacts with Supabase database and local persistent storage to fetch and save complete Brand Brain state.
    """

    def _get_supabase_client(self, token: Optional[str] = None):
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            return None
        try:
            from supabase import create_client
            client = create_client(supabase_url, supabase_key)
            if token:
                try:
                    client.postgrest.session.headers["Authorization"] = f"Bearer {token}"
                except Exception:
                    pass
            return client
        except Exception as e:
            logger.debug(f"Error creating Supabase client: {e}")
            return None

    async def get_brand_brain(self, business_id: str, token: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetches the complete Brand Brain for a verified business_id.
        Tries Supabase first; if uninitialized or failing, seamlessly falls back to LocalWorkspaceStore.
        """
        client = self._get_supabase_client(token)
        row = None

        if client:
            try:
                resp = client.table("brand_core_identity").select("*").eq("business_id", business_id).execute()
                if resp.data and len(resp.data) > 0:
                    cand = resp.data[0]
                    # If brand_name is valid and not placeholder, use it
                    b_name = cand.get("brand_name")
                    if b_name and b_name.lower() not in ["my brand", "your shop", "sample business"]:
                        row = cand
            except Exception as e:
                logger.info("[BrandBrainService] Supabase get notice, checking local store: %s", e)

        # Fallback to local store if Supabase was empty, erroring, or had placeholder
        if not row:
            local_brand = LocalWorkspaceStore.get_brand(business_id) or (LocalWorkspaceStore.get_brand(email) if email else None)
            if local_brand:
                row = local_brand

        if row:
            palette = row.get("full_color_palette") or []
            city = row.get("city")
            logo_url = row.get("logo_url")
            website_url = row.get("website_url")
            instagram_handle = row.get("instagram_handle")
            tagline = row.get("tagline")
            brand_brief = row.get("brand_brief")
            personality_tags = row.get("brand_personality_tags") or []
            onboarding_complete = row.get("onboarding_complete")

            if brand_brief and isinstance(brand_brief, str):
                try:
                    parsed = json.loads(brand_brief)
                    if isinstance(parsed, dict):
                        city = city or parsed.get("city")
                        logo_url = logo_url or parsed.get("logo_url")
                        website_url = website_url or parsed.get("website_url")
                        instagram_handle = instagram_handle or parsed.get("instagram_handle")
                        tagline = tagline or parsed.get("tagline")
                        personality_tags = personality_tags or parsed.get("personality_tags", [])
                        if onboarding_complete is None:
                            onboarding_complete = parsed.get("onboarding_complete", True)
                        brand_brief = parsed.get("summary", brand_brief)
                except Exception:
                    pass

            return {
                "business_id": business_id,
                "core": {
                    "brand_name": row.get("brand_name") or row.get("shopName"),
                    "category": row.get("category"),
                    "city": city,
                    "tagline": tagline,
                    "brand_tone": row.get("brand_tone"),
                    "brand_brief": brand_brief,
                    "website_url": website_url,
                    "instagram_handle": instagram_handle,
                    "logo_url": logo_url,
                    "onboarding_complete": onboarding_complete if onboarding_complete is not None else True,
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
                    "brand_personality_tags": personality_tags if isinstance(personality_tags, list) else [],
                },
                "products": [],
            }

        return {
            "business_id": business_id,
            "core": {},
            "visual_dna": {},
            "audience": {},
            "products": []
        }

    async def save_brand_brain(self, data: Any, token: Optional[str] = None, user_id: Optional[str] = None, email: Optional[str] = None) -> str:
        """
        Saves the Brand Brain from the onboarding flow into LocalStore and Supabase.
        """
        if isinstance(data, str):
            business_id = data
            data = token if isinstance(token, dict) else {}
            token = None
        else:
            business_id = user_id or (data.get("business_id") if isinstance(data, dict) else None) or str(uuid.uuid4())
            if not isinstance(data, dict):
                data = {}

        resolved_email = email or data.get("email")

        # Extract fields
        shop_name = data.get("shopName") or data.get("brand_name") or "My Brand"
        city = data.get("city") or ""
        category = data.get("category") or ""
        website_url = data.get("websiteUrl") or data.get("website") or ""
        instagram_handle = data.get("instagramHandle") or data.get("instagram") or ""

        manual = data.get("manualData") or {}
        logo_url = manual.get("logo") or data.get("logoUrl") or data.get("logo_url") or ""

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

        brief_envelope = json.dumps({
            "summary": brand_brief or "",
            "city": city or "",
            "logo_url": logo_url or "",
            "website_url": website_url or "",
            "instagram_handle": instagram_handle or "",
            "tagline": tagline or "",
            "personality_tags": personality_tags if isinstance(personality_tags, list) else [],
            "onboarding_complete": True,
        })

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
            "brand_brief": brief_envelope,
            "tagline": tagline or None,
            "brand_personality_tags": personality_tags if isinstance(personality_tags, list) else None,
            "onboarding_complete": True,
            "email": resolved_email,
        }

        # 1. ALWAYS persist immediately to LocalWorkspaceStore (zero failure mode)
        LocalWorkspaceStore.save_brand(business_id, db_payload, email=resolved_email)
        LocalWorkspaceStore.save_user(business_id, {
            "business_name": shop_name,
            "category": category,
            "city": city,
            "onboarding_complete": True,
        }, email=resolved_email)

        # 2. Synchronize to Supabase if available
        client = self._get_supabase_client(token)
        if client:
            saved = False
            try:
                client.table("brand_core_identity").upsert(
                    db_payload,
                    on_conflict="business_id"
                ).execute()
                saved = True
            except Exception as e:
                logger.info("[BrandBrainService] Full upsert fallback to core columns: %s", e)

            if not saved:
                try:
                    core_payload = {
                        "business_id": business_id,
                        "brand_name": shop_name,
                        "category": category or None,
                        "primary_color": primary_color or None,
                        "secondary_color": secondary_color or None,
                        "accent_color": accent_color or None,
                        "brand_tone": brand_tone or None,
                        "brand_brief": brief_envelope,
                    }
                    client.table("brand_core_identity").upsert(
                        core_payload,
                        on_conflict="business_id"
                    ).execute()
                except Exception as ce:
                    logger.debug("[BrandBrainService] Core upsert notice: %s", ce)

            try:
                client.table("user_profiles").upsert({
                    "id": business_id,
                    "business_name": shop_name,
                }, on_conflict="id").execute()
            except Exception as ue:
                logger.debug("[BrandBrainService] user_profiles sync notice: %s", ue)

        return business_id

"""
GoVisual AI — Brand Intelligence Context
Builds a robust, normalized brand context from verified brand data (Supabase, Onboarding, or Session).
Preserves brand identity without hallucination or arbitrary brand substitution.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


CATEGORY_FONTS: Dict[str, List[str]] = {
    "electronics": ["Poppins Bold", "Roboto Mono", "Inter"],
    "clothing": ["Playfair Display", "Lato", "Great Vibes"],
    "food": ["Pacifico", "Nunito", "Oswald"],
    "jewellery": ["Cormorant Garamond", "Cinzel", "EB Garamond"],
    "pharmacy": ["Inter", "Roboto", "Segoe UI"],
    "home_decor": ["Playfair Display", "Inter", "Lato"],
    "salon": ["Cinzel", "Poppins", "Montserrat"],
    "default": ["Poppins Bold", "Inter Regular", "Noto Sans"],
}


class BrandContext(BaseModel):
    """Normalized, verified brand context used by the creative engine."""
    brand_name: str = "Our Brand"
    category: str = "General"
    sub_category: Optional[str] = None
    logo_url: Optional[str] = None
    logo_present: bool = False
    
    # Colors
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    palette: List[str] = Field(default_factory=list)
    
    # Brand guidelines & voice
    visual_style: Optional[str] = None
    brand_tone: Optional[str] = None
    tagline: Optional[str] = None
    brand_brief: Optional[str] = None
    unique_selling_point: Optional[str] = None
    
    # Typography
    recommended_fonts: List[str] = Field(default_factory=list)
    
    # Audience & Personality
    target_audience: Optional[str] = None
    personality_tags: List[str] = Field(default_factory=list)
    
    # Online & Social
    website_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    city: Optional[str] = None
    
    # Brand reference photos
    brand_photos: List[str] = Field(default_factory=list)
    
    def get_color_summary(self) -> str:
        """Returns a concise description of available brand colors."""
        active_colors = []
        if self.primary_color:
            active_colors.append(f"Primary: {self.primary_color}")
        if self.secondary_color:
            active_colors.append(f"Secondary: {self.secondary_color}")
        if self.accent_color:
            active_colors.append(f"Accent: {self.accent_color}")
        if not active_colors and self.palette:
            active_colors = self.palette[:3]
        return ", ".join(active_colors) if active_colors else ""


def build_brand_context(raw_data: Optional[Dict[str, Any]] = None) -> BrandContext:
    """
    Constructs a verified BrandContext from raw inputs (brand_dna, Supabase row, or session).
    Strips unknown / placeholder fields, guarantees graceful fallback, never invents facts.
    """
    if not raw_data:
        return BrandContext()

    data = dict(raw_data)
    
    # 1. Brand name resolution
    b_name = (
        data.get("brand_name")
        or data.get("businessName")
        or data.get("business_name")
        or data.get("shopName")
        or "Our Brand"
    )
    if isinstance(b_name, str):
        b_name = b_name.strip()
    if not b_name or b_name.lower() in ("my brand", "your brand", "unknown"):
        b_name = "Our Brand"

    # 2. Category resolution
    cat = (
        data.get("category")
        or data.get("businessCategory")
        or data.get("business_category")
        or "General"
    )
    if isinstance(cat, str):
        cat = cat.strip()

    # 3. Colors resolution
    colors_raw = data.get("colors") or data.get("brand_colors") or data.get("palette") or []
    palette: List[str] = []
    if isinstance(colors_raw, str):
        palette = [c.strip() for c in colors_raw.replace("&", ",").split(",") if c.strip()]
    elif isinstance(colors_raw, list):
        for item in colors_raw:
            if isinstance(item, str) and item.strip():
                palette.append(item.strip())
            elif isinstance(item, dict) and item.get("hex"):
                palette.append(str(item["hex"]).strip())

    primary_color = data.get("primary_color") or data.get("primaryColor") or (palette[0] if palette else None)
    secondary_color = data.get("secondary_color") or data.get("secondaryColor") or (palette[1] if len(palette) > 1 else None)
    accent_color = data.get("accent_color") or data.get("accentColor") or (palette[2] if len(palette) > 2 else None)

    # Clean unknown / None string values
    def _clean_str(val: Any) -> Optional[str]:
        if val is None:
            return None
        s = str(val).strip()
        if not s or s.lower() in ("unknown", "none", "null", "undefined"):
            return None
        return s

    # 4. Brand tone and copy
    brand_tone = _clean_str(data.get("brand_tone") or data.get("brandTone"))
    tagline = _clean_str(data.get("tagline"))
    brand_brief = _clean_str(data.get("brand_brief") or data.get("brandBrief") or data.get("brandSummary"))
    usp = _clean_str(data.get("unique_selling_point") or data.get("uniqueSellingPoint") or data.get("differentiators"))
    vis_style = _clean_str(data.get("visual_style") or data.get("visualStyle"))

    # 5. Fonts
    cat_key = cat.lower().replace(" ", "_").replace("/", "_")
    matched_fonts = CATEGORY_FONTS.get(cat_key, CATEGORY_FONTS["default"])

    # 6. Audience
    target_audience = _clean_str(data.get("target_audience") or data.get("targetAudience") or data.get("audience"))
    raw_tags = data.get("personality_tags") or data.get("brand_personality_tags") or []
    personality_tags = [str(t).strip() for t in raw_tags if str(t).strip() and str(t).lower() != "unknown"] if isinstance(raw_tags, list) else []

    # 7. Logo & Photos
    logo_url = _clean_str(data.get("logo_url") or data.get("logoUrl") or data.get("logo"))
    logo_present = bool(data.get("logo_present") or logo_url or data.get("logo_bytes"))
    
    brand_photos = []
    raw_photos = data.get("brand_photos") or data.get("photos") or []
    if isinstance(raw_photos, list):
        for p in raw_photos:
            if isinstance(p, str) and p.startswith("http"):
                brand_photos.append(p)
            elif isinstance(p, dict) and p.get("url"):
                brand_photos.append(str(p["url"]))

    return BrandContext(
        brand_name=b_name,
        category=cat,
        sub_category=_clean_str(data.get("sub_category")),
        logo_url=logo_url,
        logo_present=logo_present,
        primary_color=primary_color,
        secondary_color=secondary_color,
        accent_color=accent_color,
        palette=palette,
        visual_style=vis_style,
        brand_tone=brand_tone,
        tagline=tagline,
        brand_brief=brand_brief,
        unique_selling_point=usp,
        recommended_fonts=matched_fonts,
        target_audience=target_audience,
        personality_tags=personality_tags,
        website_url=_clean_str(data.get("website_url") or data.get("website")),
        instagram_handle=_clean_str(data.get("instagram_handle") or data.get("instagram")),
        city=_clean_str(data.get("city")),
        brand_photos=brand_photos[:3],
    )

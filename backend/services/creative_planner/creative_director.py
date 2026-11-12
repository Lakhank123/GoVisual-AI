"""
GoVisual AI — Creative Director Engine
Constructs a comprehensive, structured Creative Director Brief prior to prompt generation.
Acts as an intelligent advertising creative director rather than a simple product-image generator.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from .brand_context import BrandContext
from .product_context import ProductContext
from .advertising_layouts import AdvertisingLayout


class CreativeDirectorBrief(BaseModel):
    """
    Structured Advertising Creative Brief containing complete creative direction,
    visual hierarchy, verified features, brand assets, and negative constraints.
    """
    brief_id: str
    advertisement_objective: str
    intended_audience: str
    
    # Brand Identity
    brand_name: str
    brand_category: str
    brand_colors: List[str] = Field(default_factory=list)
    brand_tone: Optional[str] = None
    brand_typography: List[str] = Field(default_factory=list)
    logo_placement: str = "top-right"
    logo_reserved: bool = True
    
    # Product Identity & Preservation
    product_name: str
    product_reference_required: bool = True
    preservation_rules: List[str] = Field(default_factory=list)
    
    # Message & Messaging Hierarchy
    core_headline: Optional[str] = None
    offer_and_cta: Optional[str] = None
    verified_features_to_communicate: List[str] = Field(default_factory=list)
    benefit_callout_style: Optional[str] = None
    
    # Visual Setting & Composition
    layout_name: str
    composition_hierarchy: str
    environment: str
    lighting: str
    camera_direction: str
    mood: str
    relevant_props: List[str] = Field(default_factory=list)
    
    # Technical Parameters
    aspect_ratio: str = "1:1"
    output_dimensions: str = "1024x1024"
    
    # Boundaries
    elements_to_preserve: List[str] = Field(default_factory=list)
    elements_to_avoid: List[str] = Field(default_factory=list)

    def to_sanitized_dict(self) -> Dict[str, Any]:
        """
        Returns a clean dictionary safe for audit logging and frontend inspection.
        Strips any potential API keys, sensitive tokens, or private paths.
        """
        return {
            "brief_id": self.brief_id,
            "objective": self.advertisement_objective,
            "audience": self.intended_audience,
            "brand": {
                "name": self.brand_name,
                "category": self.brand_category,
                "colors": self.brand_colors,
                "tone": self.brand_tone,
                "typography": self.brand_typography,
                "logo_placement": self.logo_placement,
            },
            "product": {
                "name": self.product_name,
                "reference_required": self.product_reference_required,
                "verified_features": self.verified_features_to_communicate,
                "offer_and_cta": self.offer_and_cta,
            },
            "creative_direction": {
                "layout": self.layout_name,
                "composition": self.composition_hierarchy,
                "environment": self.environment,
                "lighting": self.lighting,
                "camera_direction": self.camera_direction,
                "mood": self.mood,
                "relevant_props": self.relevant_props,
                "headline": self.core_headline,
            },
            "specifications": {
                "aspect_ratio": self.aspect_ratio,
                "dimensions": self.output_dimensions,
                "preserved_elements": self.elements_to_preserve,
                "avoid_elements": self.elements_to_avoid,
            }
        }


def build_creative_brief(
    brief_id: str,
    brand_ctx: BrandContext,
    product_ctx: ProductContext,
    layout: AdvertisingLayout,
    form_answers: Optional[Dict[str, Any]] = None,
) -> CreativeDirectorBrief:
    """
    Constructs an advertising CreativeDirectorBrief respecting the 6-tier priority hierarchy:
    1. Actual product identity and product-reference image
    2. Explicit user instructions for the current creative
    3. Verified brand identity and brand assets
    4. Product-specific facts, features, and approved offers
    5. Category-appropriate creative direction
    6. General visual-quality and composition guidelines.
    """
    answers = form_answers or {}
    
    # 1. Objective resolution (User explicit instruction has priority)
    raw_purpose = answers.get("purpose") or answers.get("goal") or "Commercial Brand Promotion"
    objective = str(raw_purpose).strip()
    
    # 2. Audience resolution
    raw_aud = answers.get("audience") or brand_ctx.target_audience
    audience = str(raw_aud).strip() if raw_aud else "Quality-conscious everyday customers"

    # 3. Headline & Messaging (User explicit instruction has priority)
    headline = product_ctx.explicit_main_text
    if not headline:
        if product_ctx.offer:
            headline = f"Special Offer: {product_ctx.offer}"
        elif brand_ctx.tagline:
            headline = brand_ctx.tagline
        elif "festival" in objective.lower():
            headline = "Festive Special"
        else:
            headline = f"Introducing {product_ctx.name}"

    # 4. CTA and Offer
    offer_cta_parts = []
    if product_ctx.offer:
        offer_cta_parts.append(product_ctx.offer)
    if product_ctx.price:
        offer_cta_parts.append(f"At {product_ctx.price}")
    if product_ctx.urgency:
        offer_cta_parts.append(f"({product_ctx.urgency})")
    
    cta_user = answers.get("cta")
    if cta_user and str(cta_user).strip().lower() not in ("no offer", "none"):
        offer_cta_parts.append(str(cta_user).strip())
    
    offer_and_cta = " • ".join(offer_cta_parts) if offer_cta_parts else None

    # 5. Verified features (selected strictly from verified data)
    verified_features = product_ctx.select_promotional_features(max_features=3)

    # 6. Props (derived from verified ingredients/category)
    props = product_ctx.get_supported_props()

    # 7. Preservation rules
    preservation = [
        "Exact physical product shape, silhouette, geometry, and proportions",
        "Original product labeling, primary colors, and physical material finishes",
        "Clean designated negative space for exact brand logo compositing",
    ]

    # 8. Negative constraints / Elements to avoid
    elements_to_avoid = [
        "Do not invent or fabricate unverified certifications, discounts, or medical claims",
        "Do not redraw, distort, or hallucinate an artificial brand logo in the scene",
        "Do not replace the product with a generic competitor or different brand equivalent",
        "Do not clutter the image with excessive decorative text or illegible small labels",
        "Avoid muddy lighting, distorted proportions, or low-resolution textures",
    ]
    if not props:
        elements_to_avoid.append("Do not introduce random disconnected botanical or culinary props")

    # 9. Format & Dimensions
    format_raw = answers.get("format") or answers.get("platform") or "1:1"
    dimensions = "1024x1024"
    if "9:16" in format_raw or "Story" in format_raw:
        format_clean = "9:16"
        dimensions = "1024x1792"
    elif "16:9" in format_raw:
        format_clean = "16:9"
        dimensions = "1792x1024"
    elif "4:5" in format_raw:
        format_clean = "4:5"
        dimensions = "1024x1280"
    else:
        format_clean = "1:1"
        dimensions = "1024x1024"

    logo_pos = answers.get("logo_position") or "top-right"

    return CreativeDirectorBrief(
        brief_id=brief_id,
        advertisement_objective=objective,
        intended_audience=audience,
        brand_name=brand_ctx.brand_name,
        brand_category=product_ctx.category or brand_ctx.category,
        brand_colors=brand_ctx.palette or ([brand_ctx.primary_color] if brand_ctx.primary_color else []),
        brand_tone=brand_ctx.brand_tone,
        brand_typography=brand_ctx.recommended_fonts,
        logo_placement=logo_pos,
        logo_reserved=brand_ctx.logo_present,
        product_name=product_ctx.name,
        product_reference_required=product_ctx.reference_image_provided,
        preservation_rules=preservation,
        core_headline=headline,
        offer_and_cta=offer_and_cta,
        verified_features_to_communicate=verified_features,
        benefit_callout_style=layout.feature_callout_style,
        layout_name=layout.layout_name,
        composition_hierarchy=layout.composition,
        environment=layout.environment,
        lighting=layout.lighting,
        camera_direction=layout.camera_direction,
        mood=layout.mood,
        relevant_props=props,
        aspect_ratio=format_clean,
        output_dimensions=dimensions,
        elements_to_preserve=preservation,
        elements_to_avoid=elements_to_avoid,
    )

import sys
import os
from typing import Optional, Dict, Any, List

# Add backend to path so we can import services.image_provider.models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from services.image_provider.models import CreativeRequest
from .creative_strategy import CreativeStrategy
from .creative_plan import CreativePlan
from .brand_context import BrandContext, build_brand_context
from .product_context import ProductContext, build_product_context
from .creative_director import CreativeDirectorBrief, build_creative_brief


class PromptBuilder:
    """
    Transforms Creative Strategy, Brand Intelligence, and Product Intelligence
    into a structured advertising generation prompt.
    Strictly follows the 6-tier priority hierarchy and enforces anti-hallucination boundaries.
    """
    
    def build(self, strategy: CreativeStrategy, plan: CreativePlan) -> CreativeRequest:
        """Legacy builder interface preserved for backwards compatibility."""
        prompt_parts = []
        
        # 1. Product Facts
        product_name = plan.product_context.get("name")
        product_desc = plan.product_context.get("description")
        
        if product_name:
            prompt_parts.append(f"Product: {product_name}.")
        if product_desc:
            prompt_parts.append(f"Product Description: {product_desc}.")
            
        # 2. Brand Requirements
        brand_name = plan.brand_context.get("brand_name")
        if brand_name:
            prompt_parts.append(f"Brand: {brand_name}.")
            
        colors = plan.brand_context.get("colors") or plan.brand_context.get("palette")
        if colors and isinstance(colors, list) and len(colors) > 0:
            color_str = ", ".join(colors)
            prompt_parts.append(f"Brand Colors: {color_str}.")
            
        if strategy.visual_style:
            prompt_parts.append(f"Visual Style: {strategy.visual_style}.")
            
        if strategy.target_audience:
            prompt_parts.append(f"Target Audience: {strategy.target_audience}.")
            
        # 3. Marketing Requirement
        if strategy.marketing_intent:
            prompt_parts.append(f"Marketing Objective: {strategy.marketing_intent}.")
            
        # 4. Creative Direction & Scene
        prompt_parts.append(f"Creative Direction: {strategy.creative_direction}")
        
        if strategy.environment:
            prompt_parts.append(f"Environment: {strategy.environment}.")
        if strategy.lighting:
            prompt_parts.append(f"Lighting: {strategy.lighting}.")
        if strategy.composition:
            prompt_parts.append(f"Composition: {strategy.composition}.")
        if strategy.camera_direction:
            prompt_parts.append(f"Camera Direction: {strategy.camera_direction}.")
        if strategy.mood:
            prompt_parts.append(f"Mood: {strategy.mood}.")
            
        computed_prompt = " ".join(prompt_parts)
        
        return CreativeRequest(
            marketing_requirement=plan.marketing_requirement,
            product_info=plan.product_context,
            brand_dna=plan.brand_context,
            creative_style=strategy.visual_style,
            composition_requirements=strategy.composition,
            candidate_count=1,
            computed_prompt=computed_prompt
        )

    def build_v2(
        self,
        strategy: CreativeStrategy,
        product_understanding: Any,
        brand_dna: dict,
        marketing_requirement: str,
        creative_preferences: dict,
        brief: Optional[CreativeDirectorBrief] = None,
        product_context: Optional[ProductContext] = None,
        brand_context: Optional[BrandContext] = None,
    ) -> CreativeRequest:
        """
        V2 intelligent builder executing the strict 6-tier priority hierarchy:
        Tier 1: Actual product identity and product-reference image.
        Tier 2: Explicit user instructions for current creative.
        Tier 3: Verified brand identity and brand assets.
        Tier 4: Product-specific facts, features, and approved offers.
        Tier 5: Category-appropriate creative direction and advertising layout.
        Tier 6: General visual-quality and composition guidelines.
        """
        # Ensure normalized contexts
        brand_ctx = brand_context or build_brand_context(brand_dna)
        
        p_name = ""
        if hasattr(product_understanding, "product_name") and product_understanding.product_name:
            p_name = product_understanding.product_name
        elif hasattr(product_understanding, "product_type") and product_understanding.product_type:
            p_name = product_understanding.product_type
        elif isinstance(product_understanding, dict):
            p_name = product_understanding.get("product_name") or product_understanding.get("name") or ""
        if not p_name:
            p_name = creative_preferences.get("product") or "Product"

        prod_ctx = product_context or build_product_context(
            product_name=p_name,
            form_answers=creative_preferences,
            vision_analysis=product_understanding,
            has_image=True,
        )

        logo_pos = creative_preferences.get("logo_position", "top-right")

        prompt_parts: List[str] = []

        # ── TIER 1: Actual product identity & reference image conditioning ───
        prompt_parts.append(
            "AUTHORITATIVE PRODUCT REFERENCE: Use the uploaded product reference image "
            "as the authoritative visual reference for the actual product. "
            "Preserve its exact identity, geometry, proportions, visible branding, colors, "
            "and distinctive physical characteristics. Do not substitute with a generic equivalent."
        )
        prompt_parts.append(f"Product: {prod_ctx.name}.")
        
        if prod_ctx.shape_or_silhouette:
            prompt_parts.append(f"Silhouette: {prod_ctx.shape_or_silhouette}.")
        if prod_ctx.material_appearance:
            prompt_parts.append(f"Material: {prod_ctx.material_appearance}.")
        if prod_ctx.surface_finish:
            prompt_parts.append(f"Finish: {prod_ctx.surface_finish}.")
        if prod_ctx.dominant_colors:
            prompt_parts.append(f"Product Colors: {', '.join(prod_ctx.dominant_colors)}.")
        if prod_ctx.visible_branding:
            prompt_parts.append(f"Product Branding: {prod_ctx.visible_branding}.")

        # ── TIER 2: Explicit user instructions for current creative ───────────
        user_mood = creative_preferences.get("mood") or strategy.mood
        if user_mood:
            prompt_parts.append(f"Campaign Mood: {user_mood}.")

        user_bg = creative_preferences.get("background")
        if user_bg:
            prompt_parts.append(f"Requested Setting: {user_bg}.")

        user_light = creative_preferences.get("lighting")
        if user_light:
            prompt_parts.append(f"Requested Lighting: {user_light}.")

        user_headline = prod_ctx.explicit_main_text or (brief.core_headline if brief else None)
        if user_headline:
            prompt_parts.append(f"Campaign Headline Theme: '{user_headline}'.")

        # ── TIER 3: Verified brand identity and brand assets ──────────────────
        if brand_ctx.brand_name and brand_ctx.brand_name != "Our Brand":
            prompt_parts.append(f"Brand: {brand_ctx.brand_name}.")

        color_summary = brand_ctx.get_color_summary()
        if color_summary:
            prompt_parts.append(f"Brand Palette ({color_summary}).")

        if brand_ctx.visual_style:
            prompt_parts.append(f"Brand Visual Identity: {brand_ctx.visual_style}.")

        if brand_ctx.brand_tone:
            prompt_parts.append(f"Brand Voice: {brand_ctx.brand_tone}.")

        # Logo reservation instruction
        prompt_parts.append(
            f"RESERVED LOGO SAFE-ZONE: Do not redraw, imitate, or place an artificial logo in the scene. "
            f"Reserve clean negative space in the {logo_pos} corner for the authentic brand logo "
            "to be overlaid cleanly after generation."
        )

        # ── TIER 4: Product-specific facts, features, and approved offers ─────
        # Only inject verified features
        verified_feats = prod_ctx.select_promotional_features(3)
        if verified_feats:
            prompt_parts.append(f"Verified Features to communicate: {', '.join(verified_feats)}.")

        if prod_ctx.ingredients:
            prompt_parts.append(f"Verified Ingredients/Materials: {', '.join(prod_ctx.ingredients)}.")

        if prod_ctx.offer:
            prompt_parts.append(f"Approved Promotion: {prod_ctx.offer}.")

        if prod_ctx.price:
            prompt_parts.append(f"Price: {prod_ctx.price}.")

        if prod_ctx.urgency:
            prompt_parts.append(f"Urgency: {prod_ctx.urgency}.")

        # Strict boundary
        prompt_parts.append("Do not invent unverified medical claims, fake guarantees, or non-existent ingredients.")

        # ── TIER 5: Category-appropriate creative direction & advertising layout
        prompt_parts.append(f"Creative Layout & Strategy: {strategy.creative_direction}")
        
        if strategy.composition:
            prompt_parts.append(f"Composition: {strategy.composition}.")
        if strategy.environment:
            prompt_parts.append(f"Environment: {strategy.environment}.")
        if strategy.lighting:
            prompt_parts.append(f"Lighting: {strategy.lighting}.")
        if strategy.camera_direction:
            prompt_parts.append(f"Camera: {strategy.camera_direction}.")

        # Supported props (strictly truthful)
        props = prod_ctx.get_supported_props()
        if props:
            prompt_parts.append(f"Contextual Supporting Props: {', '.join(props)}.")

        # ── TIER 6: General visual-quality and composition guidelines ─────────
        prompt_parts.append(
            "Style: high-end commercial advertising photography, medium quality, "
            "crisp focus, natural depth of field, balanced commercial lighting, "
            "intentional advertising layout."
        )

        computed_prompt = " ".join(prompt_parts)

        # Metadata for downstream rendering
        feature_chips = verified_feats
        headline_to_overlay = prod_ctx.explicit_main_text
        offer_to_overlay = prod_ctx.offer

        generation_options = {
            "headline_text": headline_to_overlay,
            "offer_text": offer_to_overlay,
            "feature_chips": feature_chips,
            "primary_color": brand_ctx.primary_color,
            "brief_id": brief.brief_id if brief else None,
            "sanitized_brief": brief.to_sanitized_dict() if brief else None,
        }

        return CreativeRequest(
            marketing_requirement=marketing_requirement,
            product_info=prod_ctx.model_dump(),
            brand_dna=brand_ctx.model_dump(),
            creative_style=strategy.visual_style,
            composition_requirements=strategy.composition,
            candidate_count=1,
            computed_prompt=computed_prompt,
            generation_options=generation_options,
        )

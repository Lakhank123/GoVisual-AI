from typing import Dict, Any, List, Optional
import uuid

from .creative_plan import CreativePlan
from .creative_strategy import CreativeStrategy
from .brand_context import BrandContext, build_brand_context
from .product_context import ProductContext, build_product_context
from .advertising_layouts import AdvertisingLayout, select_advertising_layouts
from .creative_director import CreativeDirectorBrief, build_creative_brief


class CreativePlanner:
    """
    Intelligent Advertising Creative Planner that maps Brand Intelligence,
    Product Facts, and Marketing Intent into distinct advertising strategies.
    Deterministic, offline-safe, and consumes zero credits.
    """
    
    def plan(
        self,
        marketing_requirement: str,
        product_info: Dict[str, Any],
        brand_dna: Dict[str, Any],
        candidate_count: int = 4
    ) -> CreativePlan:
        """Legacy local planner interface preserved for backwards compatibility."""
        archetypes = [
            {
                "id": "premium_commercial",
                "name": "Premium Commercial",
                "direction": "High-end studio advertising with hero product composition.",
                "environment": "Sleek professional studio setting with clean complementary backdrop",
                "lighting": "Controlled, dramatic studio lighting with rim lights",
                "composition": "Hero center-framed, filling the frame",
                "camera_direction": "Straight on, eye level",
                "mood": "Premium, confident, professional"
            },
            {
                "id": "lifestyle_authentic",
                "name": "Authentic Lifestyle",
                "direction": "Product naturally integrated into a realistic lifestyle environment.",
                "environment": "Authentic, relatable lifestyle environment (e.g. modern home, outdoors, or contextual usage scene)",
                "lighting": "Natural, soft daylight",
                "composition": "Rule of thirds, product integrated into the scene",
                "camera_direction": "Slight high angle, candid feel",
                "mood": "Warm, relatable, authentic"
            },
            {
                "id": "cinematic_drama",
                "name": "Cinematic Drama",
                "direction": "Cinematic advertising with strong depth and visual storytelling.",
                "environment": "Atmospheric, dark or moody environment with rich depth of field",
                "lighting": "High contrast chiaroscuro, cinematic shadows, neon or practical accents",
                "composition": "Dynamic perspective, strong leading lines",
                "camera_direction": "Low angle, dramatic perspective",
                "mood": "Intense, cinematic, mysterious"
            },
            {
                "id": "minimalist_luxury",
                "name": "Minimalist Luxury",
                "direction": "Minimal premium composition where the product remains dominant against negative space.",
                "environment": "Pure minimalist negative space, solid color or soft gradient",
                "lighting": "Even, bright, flat luxury lighting",
                "composition": "Extreme negative space, asymmetrical balance",
                "camera_direction": "Flat lay or straight on macro",
                "mood": "Elegant, serene, luxurious"
            }
        ]
        
        strategies = []
        for i in range(min(candidate_count, len(archetypes))):
            arch = archetypes[i]
            target_audience = brand_dna.get("target_audience")
            
            strategy = CreativeStrategy(
                strategy_id=arch["id"],
                strategy_name=arch["name"],
                creative_direction=arch["direction"],
                visual_style=brand_dna.get("visual_style"),
                environment=arch["environment"],
                lighting=arch["lighting"],
                composition=arch["composition"],
                camera_direction=arch["camera_direction"],
                mood=arch["mood"],
                target_audience=target_audience,
                marketing_intent=marketing_requirement,
                differentiation_rationale=f"Uses {arch['name']} archetype to provide visual variety."
            )
            strategies.append(strategy)
            
        return CreativePlan(
            marketing_requirement=marketing_requirement,
            product_context=product_info,
            brand_context=brand_dna,
            strategies=strategies,
            candidate_count=candidate_count,
            planner_metadata={"generator": "deterministic_local_planner_v1"}
        )

    def plan_v2(
        self,
        marketing_requirement: str,
        product_understanding: Any,
        brand_dna: Dict[str, Any],
        creative_preferences: Dict[str, Any],
        candidate_count: int = 3,
        catalog_product: Optional[Dict[str, Any]] = None,
    ) -> CreativePlan:
        """
        V2 intelligent planning:
        Constructs rich BrandContext, ProductContext, category-aware advertising layouts,
        and structured CreativeDirectorBriefs for each candidate.
        """
        # 1. Build Brand Intelligence Context
        brand_ctx = build_brand_context(brand_dna)

        # 2. Build Product Intelligence Context
        product_name = ""
        if hasattr(product_understanding, "product_name") and product_understanding.product_name:
            product_name = product_understanding.product_name
        elif hasattr(product_understanding, "product_type") and product_understanding.product_type:
            product_name = product_understanding.product_type
        elif isinstance(product_understanding, dict):
            product_name = product_understanding.get("product_name") or product_understanding.get("name") or ""
        
        if not product_name and creative_preferences.get("product"):
            product_name = creative_preferences.get("product")

        product_ctx = build_product_context(
            product_name=product_name or "Product",
            catalog_product=catalog_product,
            form_answers=creative_preferences,
            vision_analysis=product_understanding,
            has_image=True,
        )

        # 3. Select Category-Aware Advertising Layouts
        layouts = select_advertising_layouts(
            brand_ctx=brand_ctx,
            product_ctx=product_ctx,
            user_preferences=creative_preferences,
            candidate_count=candidate_count,
        )

        # 4. Construct Strategies and Creative Director Briefs
        strategies = []
        creative_briefs: List[CreativeDirectorBrief] = []
        sanitized_briefs: List[Dict[str, Any]] = []

        for i, layout in enumerate(layouts):
            brief_id = f"brief_{uuid.uuid4().hex[:8]}_{i}"
            brief = build_creative_brief(
                brief_id=brief_id,
                brand_ctx=brand_ctx,
                product_ctx=product_ctx,
                layout=layout,
                form_answers=creative_preferences,
            )
            creative_briefs.append(brief)
            sanitized_briefs.append(brief.to_sanitized_dict())

            strategy = CreativeStrategy(
                strategy_id=layout.layout_id,
                strategy_name=layout.layout_name,
                creative_direction=layout.creative_direction,
                visual_style=brand_ctx.visual_style or layout.mood,
                environment=layout.environment,
                lighting=layout.lighting,
                composition=layout.composition,
                camera_direction=layout.camera_direction,
                mood=layout.mood,
                target_audience=brief.intended_audience,
                marketing_intent=marketing_requirement,
                differentiation_rationale=layout.differentiation_rationale,
            )
            strategies.append(strategy)

        # Combine context for legacy inspectability
        prod_dict = product_ctx.model_dump()
        if hasattr(product_understanding, "model_dump"):
            prod_dict["vision_understanding"] = product_understanding.model_dump()

        return CreativePlan(
            marketing_requirement=marketing_requirement,
            product_context=prod_dict,
            brand_context=brand_ctx.model_dump(),
            strategies=strategies,
            candidate_count=len(strategies),
            planner_metadata={
                "generator": "category_aware_advertising_planner_v2",
                "creative_briefs": [b.model_dump() for b in creative_briefs],
                "sanitized_briefs": sanitized_briefs,
                "verified_features": product_ctx.select_promotional_features(3),
                "brand_colors_used": brand_ctx.palette,
            }
        )

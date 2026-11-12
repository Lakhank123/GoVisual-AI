import logging
from typing import Dict, Any, List, Optional
import uuid

from services.product_understanding.models import ProductUnderstanding
from services.creative_planner.planner import CreativePlanner
from services.creative_planner.prompt_builder import PromptBuilder
from services.image_provider.models import CreativeRequest

logger = logging.getLogger("GoVisual.CreativeEngine")

class GenerationPlanner:
    """
    Orchestrates the entire planning phase: Brand Intelligence + Product Intelligence 
    + Marketing Requirement + Creative Preferences -> 3 distinct Advertising Creative Requests.
    """
    def __init__(self):
        self.planner = CreativePlanner()
        self.prompt_builder = PromptBuilder()

    def prepare_candidates(
        self,
        product_understanding: ProductUnderstanding,
        brand_dna: Dict[str, Any],
        marketing_requirement: str,
        creative_preferences: Dict[str, Any],
        reference_image_bytes: bytes,
        logo_image_bytes: bytes | None = None,
        logo_position: str = "top-right",
        catalog_product: Optional[Dict[str, Any]] = None,
    ) -> List[CreativeRequest]:
        
        logger.info("[CreativeEngine] Preparing production-ready advertising candidates...")
        
        # 1. Clean the Brand DNA (Remove "unknown" fields to prevent hallucination)
        clean_brand_dna = self._clean_brand_dna(brand_dna)
        
        # 2. Invoke Creative Planner to get distinct advertising strategies & creative briefs
        plan = self.planner.plan_v2(
            marketing_requirement=marketing_requirement,
            product_understanding=product_understanding,
            brand_dna=clean_brand_dna,
            creative_preferences=creative_preferences,
            candidate_count=3,
            catalog_product=catalog_product,
        )
        
        logger.info(f"[CreativeEngine] Generated {len(plan.strategies)} distinct advertising layouts.")
        
        briefs = plan.planner_metadata.get("creative_briefs", [])
        
        # 3. Build prompts for each strategy respecting the 6-tier hierarchy
        requests = []
        for i, strategy in enumerate(plan.strategies):
            brief_obj = None
            if i < len(briefs):
                from services.creative_planner.creative_director import CreativeDirectorBrief
                brief_data = briefs[i]
                if isinstance(brief_data, dict):
                    brief_obj = CreativeDirectorBrief(**brief_data)
                elif isinstance(brief_data, CreativeDirectorBrief):
                    brief_obj = brief_data

            request = self.prompt_builder.build_v2(
                strategy=strategy,
                product_understanding=product_understanding,
                brand_dna=clean_brand_dna,
                marketing_requirement=marketing_requirement,
                creative_preferences=creative_preferences,
                brief=brief_obj,
            )
            # Attach the actual authoritative reference image
            request.reference_images = [reference_image_bytes]
            request.logo_image = logo_image_bytes
            request.logo_position = logo_position
            request.candidate_id = f"cand_{uuid.uuid4().hex[:8]}_{i}"
            request.strategy_name = strategy.strategy_name if hasattr(strategy, 'strategy_name') and strategy.strategy_name else (strategy.name if hasattr(strategy, 'name') and strategy.name else f"Strategy {i+1}")
            
            # Preserve brief in request metadata for inspection and auditing
            if not request.metadata:
                request.metadata = {}
            if brief_obj:
                request.metadata["creative_brief"] = brief_obj.to_sanitized_dict()
            request.metadata["verified_features"] = plan.planner_metadata.get("verified_features", [])
            request.metadata["brand_colors"] = plan.planner_metadata.get("brand_colors_used", [])

            requests.append(request)
            
        logger.info("[CreativeEngine] Prepared production-ready CreativeRequests with complete brief context.")
        return requests
        
    def _clean_brand_dna(self, brand_dna: Dict[str, Any]) -> Dict[str, Any]:
        """
        Removes keys with "unknown", empty lists, or None to prevent the 
        PromptBuilder from hallucinating brand details.
        """
        cleaned = {}
        for k, v in brand_dna.items():
            if v is None:
                continue
            if isinstance(v, str) and v.lower().strip() == "unknown":
                continue
            if isinstance(v, list) and len(v) == 0:
                continue
            cleaned[k] = v
        return cleaned

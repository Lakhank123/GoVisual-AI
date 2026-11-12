from typing import List, Dict, Any, Optional
from .base import CriticProvider
from .models import CriticResult
from .scoring import calculate_weighted_score
from .ranking import rank_candidates

class GoVisualCritic:
    """
    Orchestrates the evaluation of multiple candidates.
    Takes the context (PU, Brand, Marketing) and the generated images,
    delegates to a Provider for raw scoring, calculates weighted totals,
    and returns a ranked list.
    """
    
    def __init__(self, provider: CriticProvider):
        self.provider = provider
        
    async def evaluate_batch(
        self,
        candidates: List[Dict[str, Any]], 
        # candidates expected to have:
        # candidate_id, strategy_id, image_bytes, prompt_used
        reference_image_bytes: Optional[bytes],
        product_understanding: Dict[str, Any],
        brand_dna: Dict[str, Any],
        marketing_requirement: str
    ) -> Dict[str, Any]:
        """
        Evaluates a batch of candidates and ranks them.
        """
        
        results: List[CriticResult] = []
        
        for cand in candidates:
            # 1. Get raw evaluation from provider
            result = await self.provider.evaluate_candidate(
                candidate_id=cand.get("candidate_id", "unknown"),
                strategy_id=cand.get("strategy_id", "unknown"),
                image_bytes=cand.get("image_bytes"),
                reference_image_bytes=reference_image_bytes,
                product_understanding=product_understanding,
                brand_dna=brand_dna,
                marketing_requirement=marketing_requirement,
                prompt_used=cand.get("prompt_used", "")
            )
            
            # 2. Calculate final weighted score
            calculate_weighted_score(result.scores)
            results.append(result)
            
        # 3. Rank results
        ranking_data = rank_candidates(results)
        return ranking_data

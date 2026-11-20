import os
import asyncio
import copy
from pprint import pprint

from services.critic.critic import GoVisualCritic
from services.critic.providers.mock_provider import MockCriticProvider
from services.critic.models import CriticResult, CandidateScore
from services.self_correction.correction_engine import CorrectionEngine
from services.self_correction.providers.mock_regeneration_provider import MockRegenerationProvider

class TestMockCriticProvider(MockCriticProvider):
    """
    Extends the MockCriticProvider to return BETTER scores for repaired candidates
    so we can verify the 'replacement' logic in CorrectionEngine.
    """
    async def evaluate_candidate(
        self,
        candidate_id: str,
        strategy_id: str,
        image_bytes: bytes | None,
        product_understanding: dict,
        brand_dna: dict,
        marketing_requirement: str,
        prompt_used: str
    ) -> CriticResult:
        
        # Get base evaluation
        result = await super().evaluate_candidate(
            candidate_id, strategy_id, image_bytes, product_understanding, brand_dna, marketing_requirement, prompt_used
        )
        
        # If it's a repaired candidate, boost its scores and clear failures to simulate a successful repair.
        if "_repaired" in candidate_id:
            if "candidate_1" in candidate_id.lower():
                # Fix text safety
                result.scores.text_safety = 100
                result.failures = []
            elif "candidate_3" in candidate_id.lower():
                # Fix brand error
                result.scores.brand_consistency = 95
                result.failures = []
            elif "candidate_4" in candidate_id.lower():
                # Fix text and prompt error, but simulate it still being worse than candidate_2
                result.scores.text_safety = 80
                result.scores.prompt_adherence = 70
                # Don't clear failures, maybe it still has a failure. We just boost the score.
                
            # Recalculate weighted total since we changed scores
            from services.critic.scoring import calculate_weighted_score
            calculate_weighted_score(result.scores)
        else:
            # Initial evaluation overrides to match conceptual test case
            if "candidate_1" in candidate_id.lower():
                from services.critic.models import FailureType, FailureSeverity, DetectedFailure
                result.failures = [
                    DetectedFailure(
                        failure_type=FailureType.TEXT_ERROR,
                        severity=FailureSeverity.CRITICAL,
                        evidence="Egregious unauthorized marketing copy generated next to product.",
                        explanation="Massive brand safety risk.",
                        affected_dimension="text_safety"
                    )
                ]
                result.scores.text_safety = 20
                from services.critic.scoring import calculate_weighted_score
                calculate_weighted_score(result.scores)
                
        return result


async def run_test():
    print("========================================")
    print("GOVISUAL AI 2.0 — PHASE 1.7")
    print("SELF-CORRECTION INTEGRATION TEST")
    print("========================================")
    
    product_understanding = {"product_category": "beverage", "branding": {"visible_brand_name": "Coca-Cola"}}
    brand_dna = {}
    marketing_req = "Create a premium summer advertisement for Instagram."
    
    candidates = [
        {"candidate_id": "candidate_1_premium", "strategy_id": "premium_commercial", "image_bytes": None, "prompt_used": "Premium..."},
        {"candidate_id": "candidate_2_lifestyle", "strategy_id": "lifestyle_authentic", "image_bytes": None, "prompt_used": "Lifestyle..."},
        {"candidate_id": "candidate_3_cinematic", "strategy_id": "cinematic_drama", "image_bytes": None, "prompt_used": "Cinematic..."},
        {"candidate_id": "candidate_4_minimal", "strategy_id": "minimalist_luxury", "image_bytes": None, "prompt_used": "Minimal..."}
    ]
    
    critic_provider = TestMockCriticProvider()
    critic = GoVisualCritic(provider=critic_provider)
    
    regen_provider = MockRegenerationProvider()
    
    correction_engine = CorrectionEngine(
        critic=critic,
        regeneration_provider=regen_provider
    )
    
    final_ranking = await correction_engine.run_correction_loop(
        initial_candidates=candidates,
        product_understanding=product_understanding,
        brand_dna=brand_dna,
        marketing_requirement=marketing_req
    )
    
    print("\n========================================")
    print("FINAL RANKING AFTER CORRECTION")
    print("========================================")
    
    print(f"WINNER: {final_ranking['winner_candidate_id']} (Score: {final_ranking['winner_score']})")
    
    for r in final_ranking['ranking']:
        print(f"#{r['rank']}: {r['candidate_id']} - Score: {r['score']}")
        
    print("\n========================================")
    print("VALIDATION")
    print("========================================")
    
    winner = final_ranking['winner_candidate_id']
    # candidate_1 should have repaired and beaten candidate_2
    print(f"Candidate 1 repaired and won: {'PASS' if 'candidate_1_premium_repaired' == winner else 'FAIL'}")
    
    print("\nZero API calls made. V1 pipeline remains untouched.")

if __name__ == "__main__":
    asyncio.run(run_test())

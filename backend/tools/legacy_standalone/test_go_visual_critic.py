import os
import asyncio
import json
import logging
from pprint import pprint

# Configure minimal logging for the test
logging.basicConfig(level=logging.ERROR, format="%(message)s")

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from services.product_understanding import ProductUnderstandingService
from services.critic import GoVisualCritic
from services.critic.providers.mock_provider import MockCriticProvider

async def run_test():
    print("========================================")
    print("GOVISUAL AI 2.0 — PHASE 1.6")
    print("CRITIC INTEGRATION TEST")
    print("========================================")
    
    # 1. Setup Mock Inputs (Same as Phase 1.5)
    test_image_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001"))
    test_image_path = os.path.join(test_image_dir, "product.jpg")
    
    marketing_req = "Create a premium summer advertisement for Instagram."
    brand_dna = {} # Assume clean for P001
    
    print("Loading Product Understanding...")
    pu_service = ProductUnderstandingService()
    pu = await pu_service.understand(test_image_path)
    if not pu:
        print("[FAIL] Could not get ProductUnderstanding.")
        return
        
    print(f"Product Category: {pu.product_category}")
    print(f"Brand: {pu.branding.visible_brand_name}")
    
    # 2. Simulate the 4 Candidates from Phase 1.5
    # Since we are not generating real images yet, we simulate them.
    # The image_bytes are passed as None to the mock.
    candidates = [
        {"candidate_id": "candidate_1_premium", "strategy_id": "premium_commercial", "image_bytes": None, "prompt_used": "Premium..."},
        {"candidate_id": "candidate_2_lifestyle", "strategy_id": "lifestyle_authentic", "image_bytes": None, "prompt_used": "Lifestyle..."},
        {"candidate_id": "candidate_3_cinematic", "strategy_id": "cinematic_drama", "image_bytes": None, "prompt_used": "Cinematic..."},
        {"candidate_id": "candidate_4_minimal", "strategy_id": "minimalist_luxury", "image_bytes": None, "prompt_used": "Minimal..."}
    ]
    
    print("\n========================================")
    print("RUNNING CRITIC")
    print("========================================")
    
    # 3. Initialize Critic with Mock Provider
    mock_provider = MockCriticProvider()
    critic = GoVisualCritic(provider=mock_provider)
    
    ranking_data = await critic.evaluate_batch(
        candidates=candidates,
        product_understanding=pu.model_dump(),
        brand_dna=brand_dna,
        marketing_requirement=marketing_req
    )
    
    # 4. Display Results
    print(f"\nWINNER: {ranking_data['winner_candidate_id']} (Score: {ranking_data['winner_score']})")
    
    print("\n--- RANKING ---")
    for r in ranking_data['ranking']:
        print(f"#{r['rank']}: {r['candidate_id']} - Score: {r['score']}")
        
    print("\n--- DETAILED EVALUATION ---")
    for res in ranking_data['sorted_results']:
        print(f"\nCandidate: {res.candidate_id}")
        print(f"Scores:")
        print(f"  Product Fidelity:  {res.scores.product_fidelity}/100")
        print(f"  Brand Consistency: {res.scores.brand_consistency}/100")
        print(f"  Prompt Adherence:  {res.scores.prompt_adherence}/100")
        print(f"  Composition:       {res.scores.composition}/100")
        print(f"  Aesthetics:        {res.scores.aesthetics}/100")
        print(f"  Text Safety:       {res.scores.text_safety}/100")
        print(f"  Scene Integration: {res.scores.scene_integration}/100")
        print(f"  WEIGHTED TOTAL:    {res.scores.weighted_total}/100")
        
        print("\nReasoning:")
        print(f"  {res.overall_reasoning}")
        
        if res.failures:
            print("\nFailures Detected:")
            for f in res.failures:
                print(f"  - [{f.severity}] {f.failure_type}: {f.evidence} (Dim: {f.affected_dimension})")
                print(f"    Expl: {f.explanation}")
        
    print("\n========================================")
    print("VALIDATION")
    print("========================================")
    
    # Checks
    print(f"All 4 candidates evaluated: {'PASS' if len(ranking_data['sorted_results']) == 4 else 'FAIL'}")
    print(f"Scores within 0-100: {'PASS' if all(0 <= res.scores.weighted_total <= 100 for res in ranking_data['sorted_results']) else 'FAIL'}")
    print(f"Winner selected correctly: {'PASS' if ranking_data['winner_candidate_id'] == 'candidate_1_premium' else 'FAIL'}")
    print(f"Evidence exists for failures: {'PASS' if all(len(f.evidence) > 0 for res in ranking_data['sorted_results'] for f in res.failures) else 'FAIL'}")
    
    print("\nNo image API should be called.")

if __name__ == "__main__":
    asyncio.run(run_test())

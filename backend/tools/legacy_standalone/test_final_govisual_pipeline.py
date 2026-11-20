import asyncio
import os
import sys

BASE_DIR = r"c:\Users\HP\OneDrive\Desktop\WebDevProject\GoVisualAI\backend"
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from services.creative_planner.planner import CreativePlanner
from services.creative_engine.generation_planner import GenerationPlanner
from services.image_provider.providers.flux_provider import FluxImageProvider
from services.critic.critic import GoVisualCritic
from services.critic.providers.groq_provider import GroqCriticProvider
from services.self_correction.correction_engine import CorrectionEngine
from services.self_correction.providers.flux_regeneration_provider import FluxRegenerationProvider
from services.product_understanding.service import ProductUnderstandingService
from services.product_understanding.vision_provider import GroqVisionProviderAdapter
from services.brand import BrandService

async def main():
    print("Starting REAL E2E TEST: GoVisual V2 Pipeline...")
    
    image_path = r"c:\Users\HP\OneDrive\Desktop\WebDevProject\GoVisualAI\research\phase0\dataset\products\P001\product.jpg"
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
    except Exception as e:
        print(f"Could not read P001 image: {e}")
        return

    print("\n[PRODUCT_UNDERSTANDING] Starting...")
    pu_service = ProductUnderstandingService(GroqVisionProviderAdapter())
    pu_result = await pu_service.analyze_product(image_bytes)
    if pu_result.status != "success":
        print("Product understanding failed.")
        return
        
    print("[PRODUCT_UNDERSTANDING] Complete")

    print("\n[CREATIVE_ENGINE] Starting...")
    brand_dna = {"brand_name": "Coca-Cola", "colors": ["#FF0000", "#FFFFFF"]}
    marketing_req = "Create a premium summer advertisement for social media., offer: no offer, mood: Premium commercial, lighting: Natural daylight, bg: Sunny beach / coastal summer"

    engine = GenerationPlanner()
    
    creative_preferences = {
        "format": "1080x1080",
        "image_type": "Commercial advertisement",
        "purpose": "social media",
        "mood": "Premium commercial",
        "background": "Sunny beach / coastal summer",
        "lighting": "Natural daylight"
    }
    
    requests = engine.prepare_candidates(
        product_understanding=pu_result.analysis,
        brand_dna=brand_dna,
        marketing_requirement=marketing_req,
        creative_preferences=creative_preferences,
        reference_image_bytes=image_bytes
    )
    print(f"[CREATIVE_ENGINE] Generated {len(requests)} prompts.")

    print("\n[FLUX_GENERATION] Starting...")
    flux = FluxImageProvider()
    
    # Generate images for all 4 candidates
    generated_results = []
    # To save API costs during test, we can process just the first 2 candidates, 
    # but the prompt says: "Run ONE real E2E request... First verify: 4 candidates"
    # I will run all 4.
    for i, req in enumerate(requests):
        print(f"   Generating candidate {i+1}...")
        try:
            res = await flux.generate(req)
            generated_results.append(res[0])
            if res[0].status == "FAILED":
                print(f"   [FLUX_GENERATION] Candidate {i+1} failed with error: {res[0].error}")
            else:
                print(f"   [FLUX_GENERATION] Candidate {i+1} complete: SUCCESS")
        except Exception as e:
            print(f"   [FLUX_GENERATION] Failed candidate {i+1} with exception: {e}")

    print("\n[CRITIC] Evaluating candidates...")
    critic = GoVisualCritic(GroqCriticProvider())
    
    eval_candidates = []
    for gen in generated_results:
        if gen.status == "SUCCESS":
            eval_candidates.append({
                "candidate_id": gen.candidate_id,
                "strategy_id": gen.strategy_name,
                "image_bytes": gen.image_bytes,
                "prompt_used": gen.prompt_used,
                "status": gen.status,
                "url": gen.image_url
            })
            
    if not eval_candidates:
        print("\n[ERROR] No successful candidates generated. Aborting test.")
        return
        
    sc_engine = CorrectionEngine(critic, FluxRegenerationProvider())
    
    print("\n[SELF_CORRECTION] Running Real Critic & Self-Correction loop...")
    final_ranking = await sc_engine.run_correction_loop(
        initial_candidates=eval_candidates,
        reference_image_bytes=image_bytes,
        product_understanding=pu_result.analysis,
        brand_dna=brand_dna,
        marketing_requirement=marketing_req
    )
    
    winner_id = final_ranking.get("winner_candidate_id")
    print(f"\n[RANKING] Winner = {winner_id}")
    
    for res in final_ranking.get("sorted_results", []):
        print(f"Candidate {res.candidate_id}: Score = {res.scores.weighted_total}")
        if res.candidate_id == winner_id:
            reason = res.overall_reasoning or f"Recommended with a score of {res.scores.weighted_total}."
            print(f"   Reason: {reason}")
            
    print("\n[FINAL_RESULT] E2E Test Completed.")

if __name__ == "__main__":
    asyncio.run(main())

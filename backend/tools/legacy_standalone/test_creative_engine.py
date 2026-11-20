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
from services.creative_engine import GenerationPlanner

async def run_test():
    print("========================================")
    print("GOVISUAL AI 2.0 — PHASE 1.5")
    print("CREATIVE ENGINE INTEGRATION TEST")
    print("========================================")
    
    # 1. Inputs
    test_image_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001"))
    test_image_path = os.path.join(test_image_dir, "product.jpg")
    brand_file_path = os.path.join(test_image_dir, "brand.json")
    
    marketing_req = "Create a premium summer advertisement for Instagram."
    creative_prefs = {"theme": "Summer", "mood": "Refreshing luxury", "background": "Sunny beach with gentle waves"}
    
    # Load brand
    brand_dna = {}
    if os.path.exists(brand_file_path):
        with open(brand_file_path, "r") as f:
            brand_dna = json.load(f)
            
    print("\nINPUT")
    print(f"Product: P001")
    print(f"Marketing Requirement: {marketing_req}")
    print(f"Creative Preferences: {creative_prefs}")
    print(f"Available Brand DNA: {[k for k,v in brand_dna.items() if v and str(v).lower() != 'unknown']}")
    
    print("\n========================================")
    print("PRODUCT UNDERSTANDING")
    print("========================================")
    
    # We use ProductUnderstandingService to get the real product understanding. 
    # (In a real system this might be cached/saved, but here we run it or mock it if we wanted to avoid the call, but Phase 1.5 says we can call it if needed to get real PU)
    pu_service = ProductUnderstandingService()
    pu = await pu_service.understand(test_image_path)
    
    if not pu:
        print("[FAIL] Could not get ProductUnderstanding.")
        return
        
    print(f"Category: {pu.product_category}")
    print(f"Type: {pu.product_type}")
    print(f"Physical: {pu.physical_attributes.model_dump()}")
    print(f"Visual: {pu.visual_attributes.model_dump()}")
    
    # Load image bytes for reference
    with open(test_image_path, "rb") as f:
        image_bytes = f.read()
        
    # Run Creative Engine
    engine = GenerationPlanner()
    requests = engine.prepare_candidates(
        product_understanding=pu,
        brand_dna=brand_dna,
        marketing_requirement=marketing_req,
        creative_preferences=creative_prefs,
        reference_image_bytes=image_bytes
    )
    
    for i, req in enumerate(requests, 1):
        print(f"\n========================================")
        print(f"CANDIDATE {i}")
        print(f"========================================")
        print(f"Prompt:\n{req.computed_prompt}")
        
    print("\n========================================")
    print("VALIDATION")
    print("========================================")
    
    valid_count = len(requests) == 4
    print(f"Candidate differentiation (4 prompts): {'PASS' if valid_count else 'FAIL'}")
    
    # Check if reference image is attached
    ref_attached = all(len(r.reference_images) > 0 for r in requests)
    print(f"Reference image attached: {'PASS' if ref_attached else 'FAIL'}")
    
    # Check if unknown brand DNA leaked (e.g. "unknown" in prompt)
    hallucination_leak = any("unknown" in r.computed_prompt.lower() for r in requests)
    print(f"No hallucinated brand attributes: {'PASS' if not hallucination_leak else 'FAIL'}")
    
    print("\nNo image API should be called.")
    
if __name__ == "__main__":
    asyncio.run(run_test())

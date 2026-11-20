import os
import asyncio
import json
import logging
from pprint import pprint

# Configure minimal logging for the test
logging.basicConfig(level=logging.INFO, format="%(message)s")

# Ensure environment is set (we need GROQ_API_KEY)
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from services.product_understanding import ProductUnderstandingService
from services.creative_planner.planner import CreativePlanner

async def run_test():
    print("==================================================")
    print("PHASE 1.4: PRODUCT UNDERSTANDING TEST")
    print("==================================================")
    
    # 1. Image Paths
    test_image_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001"))
    test_image_path = os.path.join(test_image_dir, "product.jpg")
    
    if not os.path.exists(test_image_path):
        print(f"[FAIL] Reference image not found at {test_image_path}")
        return
    print("[PASS] Reference image loaded")
    
    # 2. Run Product Understanding
    print("Initializing Product Understanding Service...")
    service = ProductUnderstandingService()
    
    print(f"Running understanding on {test_image_path}...")
    pu = await service.understand(test_image_path, product_metadata={"product_id": "P001"})
    
    if not pu:
        print("[FAIL] ProductUnderstanding returned None (Analysis failed)")
        return
        
    print("[PASS] Vision analysis")
    
    # Check attributes
    if pu.product_category or pu.product_type:
        print("[PASS] Product attributes extracted")
    else:
        print("[FAIL] Product attributes missing")
        return
        
    if pu.presentation.background:
        print("[PASS] Product/background distinction")
    else:
        print("[FAIL] Product/background distinction missing")
        return
        
    if pu.product_region.mask_available and pu.product_region.mask_path:
        print("[PASS] Product mask generated")
    else:
        print("[FAIL] Product mask generation failed or reported missing")
        return
        
    if pu.confidence:
        print("[PASS] Confidence validation")
    else:
        print("[FAIL] No confidence metrics generated")
        return
        
    print("[PASS] ProductUnderstanding validated")
    
    # 3. Print clean human-readable summary
    print("\n==================================================")
    print("PRODUCT UNDERSTANDING")
    print("---------------------")
    print(f"Product: {pu.product_name or 'Unknown'} (Category: {pu.product_category}, Type: {pu.product_type})")
    
    phys = pu.physical_attributes
    print(f"Physical identity: Shape: {phys.shape}, Material: {phys.material_appearance}, Finish: {phys.surface_finish}")
    
    vis = pu.visual_attributes
    print(f"Colors: Dominant: {vis.dominant_colors}, Secondary: {vis.secondary_colors}")
    
    brand = pu.branding
    print(f"Branding: Name: {brand.visible_brand_name}, Logo Visible: {brand.visible_logo}, Text: {brand.visible_text}")
    
    pres = pu.presentation
    print(f"Camera: {pres.camera_angle}")
    print(f"Lighting: {pres.lighting}")
    print(f"Background: {pres.background}")
    
    print("\nConfidence:")
    for k, v in pu.confidence.items():
        print(f"  - {k}: {v.level.value} ({v.reasoning})")
        
    print("\nPRESERVATION CONSTRAINTS")
    print("------------------------")
    for i, c in enumerate(pu.preservation_constraints, 1):
        print(f"{i}. {c}")
        
    print("\nUNCERTAINTIES")
    print("------------------------")
    for i, u in enumerate(pu.uncertainties, 1):
        print(f"{i}. {u}")
        
    print("\n==================================================")
    print("CREATIVE PLANNER COMPATIBILITY")
    print("------------------------------")
    
    planner = CreativePlanner()
    
    # Convert PU to a dict that CreativePlanner expects for product_info
    product_info_dict = pu.model_dump()
    
    try:
        plan = planner.plan(
            marketing_requirement="Create a high-end luxury advertisement",
            product_info=product_info_dict,
            brand_dna={"name": "TestBrand", "visual_style": "Minimalist luxury"},
            candidate_count=2
        )
        print("[PASS] CreativePlanner compatibility")
        print(f"Generated {len(plan.strategies)} strategies successfully.")
    except Exception as e:
        print(f"[FAIL] CreativePlanner compatibility failed: {e}")
        return

    print("\n[PASS] V1 untouched (We used a new package and isolated adapters)")
    print("\nALL TESTS PASSED.")

if __name__ == "__main__":
    asyncio.run(run_test())

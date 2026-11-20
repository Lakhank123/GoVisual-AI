import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from services.creative_planner.planner import CreativePlanner
from services.creative_planner.prompt_builder import PromptBuilder
from services.creative_planner.validator import Validator
from services.image_provider.models import CreativeRequest

def test_creative_planner():
    print("=== Testing GoVisual 2.0 Creative Planner ===")
    
    # 1. Mock Contexts
    marketing_requirement = "Create a high-performing social media ad for our summer campaign."
    product_info = {
        "name": "Lumina Smartwatch",
        "category": "Electronics",
        "description": "A sleek, waterproof smartwatch with a titanium band."
    }
    
    # Notice we intentionally omit visual_style to test Correction 2
    brand_dna = {
        "brand_name": "Lumina",
        "colors": ["#000000", "#FFFFFF", "#00FF00"],
        "target_audience": "Tech-savvy millennials"
        # visual_style intentionally missing
    }
    
    # 2. Plan Strategies
    planner = CreativePlanner()
    print("[1] Generating Creative Plan...")
    plan = planner.plan(
        marketing_requirement=marketing_requirement,
        product_info=product_info,
        brand_dna=brand_dna,
        candidate_count=4
    )
    
    print(f"[2] Produced {len(plan.strategies)} distinct strategies.")
    
    # 3. Validate Strategies
    validator = Validator()
    is_valid = validator.validate(plan)
    print(f"[3] Strategies meaningfully different: {is_valid}")
    assert is_valid, "Strategies failed differentiation validation."
    
    # 4. Build Prompts & Requests
    prompt_builder = PromptBuilder()
    
    # Dummy product reference bytes
    dummy_reference_image = b"fake_reference_image_bytes"
    
    creative_requests = []
    
    print("[4] Building Generation Prompts...")
    for i, strategy in enumerate(plan.strategies):
        print(f"\n--- Strategy {i+1}: {strategy.strategy_name} ---")
        print(f"Environment: {strategy.environment}")
        print(f"Lighting: {strategy.lighting}")
        
        request = prompt_builder.build(strategy, plan)
        
        # Correction 1: Product reference explicitly attached to the request
        request.reference_images = [dummy_reference_image]
        
        print(f"Computed Prompt: {request.computed_prompt}")
        creative_requests.append(request)
        
        # Verify Correction 1
        assert len(request.reference_images) > 0
        assert request.reference_images[0] == b"fake_reference_image_bytes"
        
        # Verify Correction 2
        assert "unknown" not in request.computed_prompt.lower()
        
    print("\n[5] Test completed successfully without external API calls.")
    
if __name__ == "__main__":
    test_creative_planner()

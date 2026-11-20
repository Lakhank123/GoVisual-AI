import os
import sys
import asyncio

# Ensure backend directory is in python path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from services.image_provider.models import CreativeRequest
from services.image_provider.factory import get_image_generation_provider

async def test_architecture():
    print("=== Testing GoVisual 2.0 Provider Architecture ===")
    
    # Force the mock provider for testing
    os.environ["IMAGE_PROVIDER"] = "mock"
    
    provider = get_image_generation_provider()
    print(f"[1] Provider loaded: {provider.__class__.__name__}")
    
    # Create a structured CreativeRequest
    request = CreativeRequest(
        marketing_requirement="Create a premium lifestyle ad",
        product_info={"name": "Test Product", "category": "Retail"},
        reference_images=[b"fake_image_bytes"],
        brand_dna={"brand_name": "Premium Brand", "colors": ["#FF0000"]},
        creative_style="High-end editorial",
        composition_requirements="Dynamic 3/4 angle",
        aspect_ratio="1:1",
        resolution="1024x1024",
        candidate_count=3,
        generation_options={"temperature": 0.7},
        computed_prompt="A premium lifestyle ad for Test Product..."
    )
    print(f"[2] Constructed CreativeRequest with candidate_count={request.candidate_count}")
    
    print("[3] Calling provider.generate(request)...")
    results = await provider.generate(request)
    
    print(f"[4] Generation complete. Received {len(results)} CreativeResult(s).")
    
    for i, res in enumerate(results):
        print(f"\n--- Result {i+1} ---")
        print(f"Status: {res.status}")
        print(f"Provider: {res.provider} | Model: {res.model}")
        print(f"Latency: {res.latency_seconds:.2f}s")
        print(f"Prompt Used: {res.prompt_used}")
        print(f"Metadata: {res.metadata}")
        if res.image_bytes:
            print(f"Image Bytes length: {len(res.image_bytes)}")
        else:
            print(f"Error: {res.error}")

if __name__ == "__main__":
    asyncio.run(test_architecture())

import os
import asyncio
import uuid
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from services.image_gen import ImageGenService

# Mock services
class MockWatermarkService:
    def apply_creative_overlay(self, img, meta):
        return img
    def apply(self, img):
        return img

class MockStorageService:
    async def upload(self, img_bytes, folder, filename):
        return f"mock_url_{filename}"

image_svc = ImageGenService()
watermark_svc = MockWatermarkService()
storage_svc = MockStorageService()

async def _run_generation_mock(prompts, image_bytes=None, brand_name="Brand", meta=None):
    tier_labels = ["clean", "professional", "creative"]
    results = []
    print(f"[Generate] Starting generation for {len(prompts)} prompts")

    product_name = meta.get("product", "") if meta else ""
    category = meta.get("category", "default") if meta else "default"
    bg_removal_enabled = False # disable for isolated test to avoid bg-removal dependency issues
    product_png_bytes = None

    for i, prompt in enumerate(prompts[:3]):
        try:
            print(f"[Generate] Generating background {i+1}/3 with prompt: {prompt[:100]}...")
            gen_bytes = await asyncio.wait_for(
                image_svc.generate(prompt, image_bytes, product_name=product_name),
                timeout=120.0
            )
            if gen_bytes is None:
                continue

            merged_bytes = gen_bytes
            
            if meta:
                wm_bytes = watermark_svc.apply_creative_overlay(merged_bytes, meta)
            else:
                wm_bytes = watermark_svc.apply(merged_bytes)

            url = await storage_svc.upload(
                wm_bytes,
                folder="govisual/generated",
                filename=f"{brand_name.replace(' ', '_')}_{tier_labels[i]}_{uuid.uuid4().hex[:6]}.jpg",
            )
            print(f"[Generate] Uploaded image {i+1} to {url}")

            results.append({
                "tier":           tier_labels[i],
                "label":          ["Basic", "Professional", "Creative"][i],
                "url":            url,
                "prompt_preview": prompt[:120] + "...",
            })
        except Exception as e:
            print(f"[Generate] [FAIL] Error generating image {i+1}: {e}")
            continue
    
    if not results:
        raise Exception("Failed to generate any images. The Hugging Face API may be down or the prompt was rejected.")

    return results

async def run_tests():
    print("Testing application generation flows...")
    brand_name = "TestBrand"
    meta = {
        "brand_name": brand_name,
        "product": "Coffee mug",
        "category": "Home goods"
    }
    
    print("\n--- TEST: No reference image ---")
    try:
        results = await _run_generation_mock(["A minimal coffee mug on a wooden table, soft lighting."], b"", brand_name, meta)
        if len(results) == 1:
            print("PASS: No reference image")
    except Exception as e:
        print(f"FAIL: Exception: {e}")
        
    print("\n--- TEST: Three variants ---")
    try:
        results = await _run_generation_mock([
            "A minimal coffee mug", 
            "A professional studio shot of a coffee mug", 
            "A creative cinematic shot of a coffee mug"
        ], b"", brand_name, meta)
        if len(results) == 3:
            print("PASS: Three variants")
    except Exception as e:
        print(f"FAIL: Exception: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())

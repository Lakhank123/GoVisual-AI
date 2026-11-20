import os
import asyncio
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from main import _run_generation

async def run_tests():
    print("Testing application generation flows...")
    
    brand_name = "TestBrand"
    meta = {
        "brand_name": brand_name,
        "product": "Coffee mug",
        "category": "Home goods",
        "price": "see store",
        "offer": "no offer",
        "brand_colors": "#000000 & #FFFFFF",
    }
    
    # 1. No reference image
    print("\n--- TEST: No reference image ---")
    prompts = ["A minimal coffee mug on a wooden table, soft lighting."]
    try:
        results = await _run_generation(prompts, b"", brand_name, meta=meta)
        if results and len(results) == 1:
            print("PASS: No reference image generation successful.")
        else:
            print("FAIL: Expected 1 result, got", len(results))
    except Exception as e:
        print(f"FAIL: Exception: {e}")
        
    # 2. With reference image (we'll just use a tiny dummy bytes for testing fallback or real bytes if we have them)
    print("\n--- TEST: With JPG reference ---")
    try:
        with open(os.path.join(BASE_DIR, "..", "test.jpg"), "rb") as f:
            jpg_bytes = f.read()
    except FileNotFoundError:
        print("SKIP: test.jpg not found, creating a dummy one")
        from PIL import Image, ImageDraw
        import io
        img = Image.new("RGB", (100, 100), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        jpg_bytes = buf.getvalue()
        
    try:
        results = await _run_generation(prompts, jpg_bytes, brand_name, meta=meta)
        if results and len(results) == 1:
            print("PASS: With JPG reference generation successful.")
        else:
            print("FAIL: Expected 1 result, got", len(results))
    except Exception as e:
        print(f"FAIL: Exception: {e}")
        
    # 3. Three creative variants
    print("\n--- TEST: Three creative variants ---")
    prompts = [
        "A minimal coffee mug on a white background, soft lighting.",
        "A professional studio shot of a coffee mug, high contrast lighting.",
        "A creative cinematic shot of a coffee mug, dramatic colorful lighting."
    ]
    try:
        results = await _run_generation(prompts, b"", brand_name, meta=meta)
        if results and len(results) == 3:
            print("PASS: Three variants generation successful.")
        else:
            print("FAIL: Expected 3 results, got", len(results))
    except Exception as e:
        print(f"FAIL: Exception: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())

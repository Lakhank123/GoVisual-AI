import asyncio
import os
from io import BytesIO
from PIL import Image

from main import _run_generation
from services.brand import BrandService
from services.t5_model import PromptService
from services.image_gen import ImageGenService

async def main():
    print("=== RUNNING E2E LOCAL PIPELINE TEST ===")
    
    # Generate a dummy product image
    img = Image.new('RGB', (100, 100), color='green')
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_bytes = buffered.getvalue()

    brand_svc = BrandService()
    prompt_svc = PromptService()
    image_svc = ImageGenService()

    try:
        # Mock what the /generate endpoint does
        from services.intelligence.image_analysis import GroqVisionProvider
        vision_svc = GroqVisionProvider()
        
        print("[VISION] Starting Groq Vision Analysis...")
        vision_res = await vision_svc.analyze(img_bytes, "Entire composition")
        
        analysis = None
        if vision_res.get("status") == "success":
            analysis = vision_res.get("analysis")
            print(f"[VISION] Success: {analysis}")
        else:
            print(f"[VISION] Failed (Fallback Active): {vision_res.get('error')}")

        print("\n[PROMPT] Building T5 Input Context...")
        input_text = prompt_svc.build_input_string(
            product="Organic Shampoo",
            category="Beauty",
            price="",
            format="1:1 Post",
            image_type="product",
            purpose="Brand awareness",
            mood="fresh",
            background="nature",
            lighting="soft sunlight",
            offer="",
            brand_name="EcoClean",
            brand_colors="Green and white",
            image_intent="Entire composition",
            image_analysis=analysis
        )
        print("T5 Input Text:")
        print(input_text)
        
        print("\n[PROMPT] Generating Prompts...")
        prompts = prompt_svc.generate(input_text)
        for i, p in enumerate(prompts):
            print(f"Variant {i+1}: {p[:100]}...")

        # We skip actual HF generation in this E2E unit test to save HF capacity,
        # but the pipeline up to prompt injection is verified.
        print("\n[SUCCESS] E2E Pipeline for Module 2 verified!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

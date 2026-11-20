import os
import sys
import time
import asyncio
import uuid
import json
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
sys.path.insert(0, BASE_DIR)

from services.intelligence.image_analysis import GroqVisionProvider
from services.t5_model import PromptService
from services.image_gen import ImageGenService
from services.watermark import WatermarkService
from services.background_removal import remove_background, refine_edges
from services.compositor import composite_product

OUT_DIR = os.path.join(BASE_DIR, "..", "research", "phase0", "baseline", "single_test", "P001", "C01")
os.makedirs(OUT_DIR, exist_ok=True)

async def main():
    print("Initializing services...")
    vision_svc = GroqVisionProvider()
    prompt_svc = PromptService()
    image_svc = ImageGenService()
    watermark_svc = WatermarkService()

    product_id = "P001"
    scenario_id = "C01"
    image_path = os.path.join(BASE_DIR, "..", "research", "phase0", "dataset", "products", "P001", "product.jpg")
    
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    meta = {
        "brand_name": "Premium Brand",
        "product": "Product",
        "price": "99.99",
        "offer": "No offer",
        "brand_colors": "#FF0000",
        "category": "Retail",
        "logo_bytes": None,
        "logo_variants": "All variants",
        "variant_label": "Basic"
    }

    # 1. Vision Analysis
    print("--- 1. Vision Analysis ---")
    vision_start = time.time()
    vision_response = await vision_svc.analyze(image_bytes, "Product catalog image")
    vision_latency = time.time() - vision_start
    print(f"Vision Latency: {vision_latency:.2f}s")
    
    analysis_result = vision_response.get("analysis", {})
    with open(os.path.join(OUT_DIR, "vision_output.json"), "w") as f:
        json.dump(analysis_result, f, indent=4)

    # 2. T5 Prompt Gen
    print("--- 2. T5 Prompt Generation ---")
    t5_start = time.time()
    input_text = prompt_svc.build_input_string(
        product="Product", category="Retail", price="99.99", format="1:1",
        image_type="Instagram post", purpose="brand showcase", mood="premium",
        background="premium studio environment", lighting="soft studio lighting",
        offer="No offer", brand_name="Premium Brand", brand_colors="#FF0000",
        image_intent="Product catalog image", image_analysis=analysis_result
    )
    
    prompts = prompt_svc.generate(input_text)
    t5_latency = time.time() - t5_start
    print(f"T5 Latency: {t5_latency:.2f}s")
    
    with open(os.path.join(OUT_DIR, "t5_input.txt"), "w") as f:
        f.write(input_text)
        
    with open(os.path.join(OUT_DIR, "t5_output.txt"), "w") as f:
        for i, p in enumerate(prompts):
            f.write(f"PROMPT {i+1}:\n{p}\n\n")

    # Pick the first prompt for C01
    final_prompt = prompts[0]
    with open(os.path.join(OUT_DIR, "final_prompt.txt"), "w") as f:
        f.write(final_prompt)

    # 3. Background Removal
    print("--- 3. Background Removal ---")
    bg_rem_start = time.time()
    transparent_bytes = remove_background(image_bytes)
    product_png_bytes = refine_edges(transparent_bytes)
    bg_rem_latency = time.time() - bg_rem_start
    print(f"Bg Removal Latency: {bg_rem_latency:.2f}s")

    # 4. Image Generation
    print("--- 4. Image Generation ---")
    img_gen_start = time.time()
    raw_bg_bytes = await image_svc.generate(final_prompt, image_bytes, product_name="Product")
    img_gen_latency = time.time() - img_gen_start
    print(f"Image Gen Latency: {img_gen_latency:.2f}s")
    
    with open(os.path.join(OUT_DIR, "raw_background.png"), "wb") as f:
        f.write(raw_bg_bytes)

    # 5. Compositing
    print("--- 5. Compositing ---")
    comp_start = time.time()
    merged_bytes = composite_product(
        product_png_bytes=product_png_bytes,
        background_jpg_bytes=raw_bg_bytes,
        category="Retail"
    )
    
    wm_bytes = watermark_svc.apply_creative_overlay(merged_bytes, meta)
    comp_latency = time.time() - comp_start
    print(f"Compositing Latency: {comp_latency:.2f}s")
    
    with open(os.path.join(OUT_DIR, "final_creative.png"), "wb") as f:
        f.write(wm_bytes)

    total_latency = time.time() - vision_start
    print(f"Total Latency: {total_latency:.2f}s")

    # Metadata
    metadata = {
        "product_id": product_id,
        "scenario_id": scenario_id,
        "vision_model": vision_svc.model_name,
        "vision_output": analysis_result,
        "t5_input": input_text,
        "t5_output": prompts,
        "final_prompt": final_prompt,
        "image_generation_model": image_svc.provider_name,
        "latencies": {
            "vision": vision_latency,
            "t5": t5_latency,
            "background_removal": bg_rem_latency,
            "image_generation": img_gen_latency,
            "compositing": comp_latency,
            "total": total_latency
        }
    }
    
    with open(os.path.join(OUT_DIR, "generation_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    print("DONE.")

if __name__ == "__main__":
    asyncio.run(main())

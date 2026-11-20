import asyncio
import os
import sys
import io
from PIL import Image, ImageDraw

def generate_dummy_image() -> bytes:
    img = Image.new("RGB", (512, 512), color=(100, 150, 200))
    draw = ImageDraw.Draw(img)
    draw.rectangle([150, 150, 362, 362], fill=(200, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def generate_dummy_logo() -> bytes:
    img = Image.new("RGBA", (150, 150), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([10, 10, 140, 140], fill=(255, 215, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

async def main():
    import main as m
    
    # Initialize the T5 model
    print("Loading PromptService...")
    m.prompt_svc._load()
    
    # Test Product
    product = "Gourmet Margherita Pizza"
    brand = "Mojjo Pizza"
    category = "Food & Drinks"
    
    # Fake inputs
    input_text = m.prompt_svc.build_input_string(
        product=product,
        brand_name=brand,
        category=category,
        mood="Warm and rustic",
        background="Italian restaurant table",
        lighting="Directional soft lighting",
        image_intent="Product only"
    )
    
    print("Generating prompts...")
    prompts = m.prompt_svc.generate(input_text)
    for p in prompts:
        print(" ->", p)
        
    print("Running _run_generation...")
    
    meta = {
        "brand_name": brand,
        "product": product,
        "price": "399",
        "offer": "Limited Time",
        "brand_colors": "#e63946",
        "category": category,
        "logo_bytes": generate_dummy_logo(),
        "logo_variants": "All variants"
    }
    
    dummy_img = generate_dummy_image()
    
    # Test generation
    results = await m._run_generation(prompts, dummy_img, brand, meta=meta)
    
    print("FINISHED GENERATION!")
    for res in results:
        print("Tier:", res["tier"], "URL:", res["url"])
        
if __name__ == "__main__":
    asyncio.run(main())

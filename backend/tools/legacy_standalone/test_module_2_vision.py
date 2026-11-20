import os
import asyncio
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from services.intelligence.image_analysis import GroqVisionProvider
from services.t5_model import PromptService

os.environ["GROQ_VISION_MODEL"] = "qwen/qwen3.6-27b"

def generate_dummy_image(fmt="JPEG") -> bytes:
    img = Image.new('RGB', (10, 10), color='blue')
    buffered = BytesIO()
    img.save(buffered, format=fmt)
    return buffered.getvalue()

async def run_tests():
    print("=== STARTING MODULE 2 AUTOMATED TESTS ===")
    vision_svc = GroqVisionProvider()
    prompt_svc = PromptService()
    
    jpg_bytes = generate_dummy_image("JPEG")
    png_bytes = generate_dummy_image("PNG")

    print("\n--- TEST 1: JPG Vision Analysis ---")
    res1 = await vision_svc.analyze(jpg_bytes)
    print(f"Status: {res1.get('status')}")
    print(f"Analysis: {list(res1.get('analysis', {}).keys()) if res1.get('analysis') else None}")
    
    print("\n--- TEST 2: PNG Vision Analysis ---")
    res2 = await vision_svc.analyze(png_bytes)
    print(f"Status: {res2.get('status')}")
    print(f"Analysis: {list(res2.get('analysis', {}).keys()) if res2.get('analysis') else None}")

    # Mock analysis context
    analysis = {
        "product_type": "Sneaker",
        "dominant_colors": ["red", "white"],
        "camera_angle": "Side profile",
        "background": "Studio grey",
        "lighting": "Soft overhead",
        "composition": "Centered",
        "visual_style": "Minimalist"
    }

    print("\n--- TEST 3-6: INTENTS ---")
    intents = [
        "Product only",
        "Product + Camera Angle",
        "Entire Composition",
        "Use only as inspiration"
    ]
    for intent in intents:
        print(f"\nIntent: {intent}")
        txt = prompt_svc.build_input_string(image_intent=intent, image_analysis=analysis)
        preserve_idx = txt.find("PRESERVE:")
        if preserve_idx != -1:
            print(txt[preserve_idx:].strip())
        else:
            print("No preserve section found.")

    print("\n--- TEST 7: GROQ FAILURE SIMULATION ---")
    bad_svc = GroqVisionProvider()
    bad_svc.api_key = "invalid_key" # Simulate failure
    res_fail = await bad_svc.analyze(jpg_bytes)
    print(f"Status: {res_fail.get('status')}")
    print(f"Error: {res_fail.get('error')}")
    
    print("\n--- TEST 8: PIPELINE (MOCK) ---")
    input_text = prompt_svc.build_input_string(
        product="Shoes", brand_name="Nike", 
        image_intent="Entire composition", image_analysis=analysis
    )
    prompts = prompt_svc.generate(input_text)
    print(f"Master Prompt input mapped. Generated {len(prompts)} prompts.")
    print(f"Basic Prompt: {prompts[0][:100]}...")

if __name__ == "__main__":
    asyncio.run(run_tests())

import os
import sys
import asyncio
import traceback
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

print("=== 1. Checking Hugging Face Configuration ===")
hf_token = os.environ.get("HF_API_TOKEN")
if hf_token:
    print(f"[OK] HF_API_TOKEN found (Length: {len(hf_token)})")
else:
    print("[FAIL] HF_API_TOKEN is missing or empty.")

print("\n=== 2. Testing T5 Model Loading ===")
try:
    from services.t5_model import PromptService
    # Temporarily disable fallback to strictly test if model loads
    os.environ["T5_ALLOW_FALLBACK"] = "false"
    t5_service = PromptService()
    t5_service._load()
    if t5_service.is_loaded():
        print("[OK] T5 Model loaded successfully.")
    else:
        print("[FAIL] T5 Model failed to load.")
except Exception as e:
    print(f"[FAIL] T5 Model Loading Error: {e}")
    traceback.print_exc()

print("\n=== 3. Testing Groq Vision API ===")
try:
    from services.intelligence.image_analysis import GroqVisionProvider
    vision_provider = GroqVisionProvider()
    
    # Path to P001 image
    image_path = os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001", "shoe.jpg")
    
    # Read image bytes
    if not os.path.exists(image_path):
        # Fallback to looking for any image in P001
        p001_dir = os.path.dirname(image_path)
        if os.path.exists(p001_dir):
            for file in os.listdir(p001_dir):
                if file.endswith((".jpg", ".png", ".jpeg")):
                    image_path = os.path.join(p001_dir, file)
                    break

    if os.path.exists(image_path):
        print(f"Using image: {image_path}")
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        
        async def test_vision():
            result = await vision_provider.analyze(image_bytes, "Product catalog image")
            if result.get("status") == "success":
                print("[OK] Groq Vision API processed successfully.")
                print(f"Analysis result keys: {list(result.get('analysis', {}).keys())}")
            else:
                print(f"[FAIL] Groq Vision API Error: {result.get('error')}")
                print(f"Full result: {result}")
        
        asyncio.run(test_vision())
    else:
        print(f"[FAIL] Could not find any test image in P001 directory.")
        
except Exception as e:
    print(f"[FAIL] Groq Vision Exception: {e}")
    traceback.print_exc()

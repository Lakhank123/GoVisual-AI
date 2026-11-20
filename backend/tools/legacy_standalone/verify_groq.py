import os
import sys
import time
import asyncio
import traceback
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

print("=== 1. Checking Groq Configuration ===")
groq_key = os.environ.get("GROQ_API_KEY")
if groq_key:
    print(f"API key detected: YES (Length: {len(groq_key)})")
else:
    print("API key detected: NO")

print("\n=== 2. Testing Groq Vision API ===")
try:
    from services.intelligence.image_analysis import GroqVisionProvider
    vision_provider = GroqVisionProvider()
    print(f"Model configured: {vision_provider.model_name}")
    
    # Path to P001 image
    image_path = os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001", "product.jpg")
    if not os.path.exists(image_path):
        image_path = os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001", "shoe.jpg")
        
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
            start = time.time()
            result = await vision_provider.analyze(image_bytes, "Product catalog image")
            latency = time.time() - start
            print(f"Latency: {latency:.2f} seconds")
            print(f"Result Status: {result.get('status')}")
            
            if result.get("status") == "success":
                print("[OK] Groq Vision API processed successfully.")
                print(f"Analysis result keys: {list(result.get('analysis', {}).keys())}")
                print(f"Analysis structure: {result.get('analysis')}")
            else:
                print(f"[FAIL] Groq Vision API Error: {result.get('error')}")
                print(f"Full result: {result}")
        
        asyncio.run(test_vision())
    else:
        print(f"[FAIL] Could not find any test image in P001 directory.")
        
except Exception as e:
    print(f"[FAIL] Groq Vision Exception: {e}")
    traceback.print_exc()

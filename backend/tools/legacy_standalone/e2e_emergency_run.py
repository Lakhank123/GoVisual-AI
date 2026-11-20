import asyncio
import time
import uuid
import os
import io
from fastapi.testclient import TestClient
from main import app, get_current_user

# --- 1. Load Environment & Setup Overrides ---
from dotenv import load_dotenv
load_dotenv()

# We need a dummy user class or dict that matches what get_current_user returns
class MockUser:
    def __init__(self):
        self.id = str(uuid.uuid4())

def override_get_current_user():
    return MockUser()

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def run_e2e():
    print("==================================================")
    print("GOVISUAL AI - EMERGENCY E2E VALIDATION")
    print("==================================================")
    
    # Check if test_image.png exists to use as test image
    if not os.path.exists("test_image.png"):
        print("Error: test_image.png not found to use as test image")
        return
        
    with open("test_image.png", "rb") as f:
        image_bytes = f.read()

    # Form payload
    data = {
        "product": "Test Running Shoes",
        "price": "$120",
        "format": "1:1",
        "image_type": "Instagram post",
        "purpose": "Brand awareness",
        "mood": "Energetic",
        "background": "Urban street",
        "lighting": "Natural daylight",
        "offer": "10% off",
        "main_text": "Run Faster",
        "language": "English",
        "urgency": "no",
        "brand_name": "GoVisual",
        "brand_colors": "#ff0000, #000000",
        "category": "Footwear",
        "image_intent": "Product only"
    }

    files = {
        "product_image": ("test_image.png", image_bytes, "image/png")
    }

    print("Starting generation pipeline...")
    start_time = time.time()
    
    response = client.post("/generate", data=data, files=files)
    
    end_time = time.time()
    total_time = end_time - start_time
    
    print(f"\nTotal generation latency: {total_time:.2f} seconds")
    print(f"HTTP Status: {response.status_code}")
    
    if response.status_code == 200:
        json_resp = response.json()
        images = json_resp.get("images", [])
        print(f"Number of variants requested: 3")
        print(f"Number of variants successfully generated: {len(images)}")
        
        for idx, img in enumerate(images):
            print(f"  - Image {idx+1} [{img.get('tier')}]: {img.get('url')}")
            
    else:
        print("Generation failed!")
        print(response.text)

if __name__ == "__main__":
    run_e2e()

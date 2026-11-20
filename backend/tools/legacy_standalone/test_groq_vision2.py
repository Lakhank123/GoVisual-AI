import os
import base64
import asyncio
import httpx
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

async def test_groq_vision():
    if not GROQ_API_KEY:
        print("FAIL: GROQ_API_KEY is not set.")
        return

    # Create a valid image using PIL
    img = Image.new('RGB', (100, 100), color='red')
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    dummy_image_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    model_name = "qwen/qwen3.6-27b"
    print(f"\n=== TESTING VISION: {model_name} ===")
    chat_url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": "Analyze this product image for a marketing campaign. Return JSON containing product type, dominant colors, camera angle, composition, background, lighting, shadows, reflections, visual style, and important product characteristics."
                    },
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{dummy_image_b64}"}}
                ]
            }
        ],
        "max_tokens": 512,
        "temperature": 0.2,
        "response_format": {"type": "json_object"}
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(chat_url, json=payload, headers=headers)
            print(f"HTTP Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"SUCCESS! {model_name} works.")
                print("Response length:", len(response.text))
                print("Extracted Info:", response.json()["choices"][0]["message"]["content"])
                return # Exit once we find a working one
            else:
                print(f"Failed. Error message: {response.text}")
        except Exception as e:
            print(f"Exception testing {model_name}: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq_vision())

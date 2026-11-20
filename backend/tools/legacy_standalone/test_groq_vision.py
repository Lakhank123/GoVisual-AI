import os
import base64
import asyncio
import httpx
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

async def test_groq_vision():
    if not GROQ_API_KEY:
        print("FAIL: GROQ_API_KEY is not set.")
        return

    # Create a dummy 1x1 image for testing
    dummy_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

    models_to_test = [
        "llama-3.2-11b-vision-instruct",
        "llama-3.2-90b-vision-instruct"
    ]

    for model_name in models_to_test:
        print(f"\n--- Testing Model: {model_name} ---")
        url = "https://api.groq.com/openai/v1/chat/completions"
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
                        {"type": "text", "text": "Analyze this image."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{dummy_image_b64}"}}
                    ]
                }
            ],
            "max_tokens": 10
        }

        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    print(f"SUCCESS! {model_name} works.")
                    return
                else:
                    print(f"Failed. HTTP {response.status_code}: {response.text}")
            except Exception as e:
                print(f"Exception testing {model_name}: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq_vision())

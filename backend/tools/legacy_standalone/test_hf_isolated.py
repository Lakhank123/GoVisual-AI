import os
import asyncio
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from services.image_gen import ImageGenService

async def main():
    print("Testing isolated HF generation...")
    svc = ImageGenService()
    print(f"Provider initialized: {svc.provider}")
    
    prompt = "A beautiful sunset over the mountains, high quality, 4k"
    
    try:
        image_bytes = await svc.generate(prompt=prompt, image_bytes=None)
        
        if image_bytes:
            filename = "isolated_test_result.jpg"
            with open(filename, "wb") as f:
                f.write(image_bytes)
            print(f"SUCCESS! Image written to {filename}, size: {len(image_bytes)} bytes.")
        else:
            print("FAILURE! No image bytes returned.")
    except Exception as e:
        print(f"FAILURE! Exception occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())

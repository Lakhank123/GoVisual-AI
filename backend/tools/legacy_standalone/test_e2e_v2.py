import httpx
import asyncio

async def test_v2_generation():
    url = "http://127.0.0.1:8000/generate"
    
    data = {
        "product": "Premium Watch",
        "price": "299",
        "format": "1:1",
        "image_type": "Commercial advertisement",
        "purpose": "Brand awareness",
        "mood": "Premium commercial",
        "background": "Sunny coastal summer environment",
        "lighting": "Natural premium daylight",
        "offer": "20% off",
        "main_text": "Summer Sale",
        "language": "English",
        "urgency": "no",
        "brand_name": "Star Foods Hub",
        "brand_colors": "Gold, Black",
        "category": "Accessories"
    }
    
    # Read test image
    try:
        with open("test_image.png", "rb") as f:
            image_bytes = f.read()
    except FileNotFoundError:
        print("test_image.png not found, creating a dummy image")
        from PIL import Image
        img = Image.new('RGB', (100, 100), color = 'red')
        img.save('test_image.png')
        with open("test_image.png", "rb") as f:
            image_bytes = f.read()
            
    files = {
        "product_image": ("test_image.png", image_bytes, "image/png")
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        print("Sending request to V2 endpoint...")
        response = await client.post(url, data=data, files=files)
        print(f"Status Code: {response.status_code}")
        try:
            print("Response:", response.json())
        except Exception as e:
            print("Failed to decode JSON. Raw text:")
            print(response.text)

if __name__ == "__main__":
    asyncio.run(test_v2_generation())

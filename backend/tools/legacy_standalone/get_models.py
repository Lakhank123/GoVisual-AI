import os
import asyncio
import httpx
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

async def get_models():
    url = "https://api.groq.com/openai/v1/models"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        data = res.json()
        models = [m["id"] for m in data.get("data", [])]
        print("Available Groq Models:")
        for m in sorted(models):
            print(f"- {m}")

if __name__ == "__main__":
    asyncio.run(get_models())

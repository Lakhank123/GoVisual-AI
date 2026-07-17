"""
GoVisual AI — Addon: AI Product Photoshoot Service
Composites product image with Indian avatar scene using Gemini
"""
import os, base64, httpx
from PIL import Image, ImageDraw, ImageFont
import io

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

AVATAR_PROMPTS = {
    "urban-woman":       "modern Indian urban woman aged 25-35, Mumbai fashion, confident smile, professional studio lighting",
    "professional-man":  "Indian businessman aged 30-40, formal shirt, clean background, trustworthy expression",
    "traditional-woman": "Indian woman in elegant saree aged 35-50, warm smile, festive look, soft lighting",
    "young-man":         "young Indian college student aged 18-25, casual wear, energetic, Gen Z style",
    "bride":             "Indian bride, bridal makeup, jewellery-ready, golden hour lighting, radiant",
    "shopkeeper":        "friendly Indian male shopkeeper aged 40-55, kurta, warm and approachable, Mumbai market",
    "fitness-woman":     "Indian fitness woman aged 22-32, activewear, healthy glow, gym or outdoor background",
    "studio-plain":      "clean white studio background, professional product photography setup, neutral",
}

BG_PROMPTS = {
    "white-studio":    "pure white studio background, professional product photography",
    "gradient-blue":   "smooth blue gradient background, modern and clean",
    "mumbai-street":   "blurred Mumbai street background, local market, bokeh effect",
    "festive-diwali":  "Diwali festive background, diyas, warm golden lights, bokeh, celebration",
    "nature-green":    "soft green nature background, leaves, fresh and organic",
    "luxury-dark":     "dark luxury background, deep black with gold accents, premium feel",
}

SHOT_TYPES = [
    ("Lifestyle Close-Up",  "close-up lifestyle shot, product held naturally"),
    ("Full Body Shot",       "full body composition, product prominently displayed"),
    ("Product Hero",         "hero product shot, product center frame, dramatic lighting"),
    ("Detail Shot",          "macro detail shot, texture and quality visible"),
    ("Contextual Use",       "product in natural use context, real-life scenario"),
    ("White Studio",         "clean white studio, product on white surface, e-commerce style"),
]

class PhotoshootService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60)

    async def generate_photoshoot(
        self,
        product_image_bytes: bytes,
        product_name: str,
        avatar_id: str,
        background_id: str,
    ) -> list[dict]:
        """Generate 6 product photoshoot images."""
        avatar_desc  = AVATAR_PROMPTS.get(avatar_id, AVATAR_PROMPTS["studio-plain"])
        bg_desc      = BG_PROMPTS.get(background_id, BG_PROMPTS["white-studio"])
        results      = []

        # Get visual description of product using gpt-4o-mini once per session
        product_desc = ""
        if OPENAI_API_KEY:
            try:
                product_desc = await self._describe_product(product_image_bytes)
            except Exception as e:
                print(f"[OpenAI Photoshoot] Description failed: {e}")

        for shot_label, shot_desc in SHOT_TYPES:
            try:
                if OPENAI_API_KEY:
                    print(f"[OpenAI Photoshoot] Generating shot '{shot_label}' via DALL-E 3...")
                    try:
                        img_bytes = await self._generate_shot_dalle(
                            product_desc, product_name,
                            avatar_desc, bg_desc, shot_desc
                        )
                    except Exception as dalle_err:
                        print(f"[OpenAI Photoshoot] DALL-E failed, falling back to Gemini: {dalle_err}")
                        img_bytes = await self._generate_shot(
                            product_image_bytes, product_name,
                            avatar_desc, bg_desc, shot_desc
                        )
                else:
                    print(f"[Gemini Photoshoot] Generating shot '{shot_label}' via Gemini...")
                    img_bytes = await self._generate_shot(
                        product_image_bytes, product_name,
                        avatar_desc, bg_desc, shot_desc
                    )
                b64 = base64.b64encode(img_bytes).decode()
                results.append({"label": shot_label, "image_b64": b64, "success": True})
            except Exception as e:
                print(f"[Photoshoot] Shot '{shot_label}' failed completely: {e}")
                placeholder = self._placeholder(shot_label, product_name)
                b64 = base64.b64encode(placeholder).decode()
                results.append({"label": shot_label, "image_b64": b64, "success": False, "error": str(e)})

        return results

    async def _describe_product(self, product_bytes: bytes) -> str:
        """Use gpt-4o-mini with Vision to describe the product image."""
        if not product_bytes or len(product_bytes) < 100:
            return ""
        b64_str = base64.b64encode(product_bytes).decode("utf-8")
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe the main product in this image in detail (shape, color, features, label) in under 30 words, focusing only on the product itself so that an AI image generator can reproduce it visually."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_str}"}}
                    ]
                }
            ],
            "max_tokens": 100
        }
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
                if resp.status_code == 200:
                    desc = resp.json()["choices"][0]["message"]["content"].strip()
                    print(f"[OpenAI Photoshoot] Product description: {desc}")
                    return desc
                else:
                    print(f"[OpenAI Photoshoot] Vision call failed: HTTP {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"[OpenAI Photoshoot] Error describing product: {e}")
        return ""

    async def _generate_shot_dalle(
        self,
        product_desc: str,
        product_name: str,
        avatar_desc: str,
        bg_desc: str,
        shot_desc: str,
    ) -> bytes:
        """Generate photoshoot image using OpenAI DALL-E 3."""
        prompt = (
            f"Professional advertisement product photography: {shot_desc}. "
            f"The product is: {product_desc or product_name}. "
            f"The product is placed or held naturally with model: {avatar_desc}. "
            f"Background setting: {bg_desc}. "
            f"Style: commercial product display, perfect studio lighting, extremely detailed, crisp focus on the product, Indian market context, premium."
        )
        payload = {
            "model": "dall-e-3",
            "prompt": prompt[:4000],
            "n": 1,
            "size": "1024x1024"
        }
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post("https://api.openai.com/v1/images/generations", json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            
            img_data = data.get("data", [])
            if not img_data:
                raise ValueError("No image data in OpenAI response")
            
            # Try URL first
            url_str = img_data[0].get("url")
            if url_str:
                async with httpx.AsyncClient(timeout=60) as dl_client:
                    dl_resp = await dl_client.get(url_str)
                    if dl_resp.status_code == 200:
                        return dl_resp.content
            
            # Try b64 fallback
            b64_str = img_data[0].get("b64_json")
            if b64_str:
                return base64.b64decode(b64_str)
                
            raise ValueError("No image URL or b64 data in OpenAI response")

    async def _generate_shot(
        self,
        product_bytes: bytes,
        product_name: str,
        avatar_desc: str,
        bg_desc: str,
        shot_desc: str,
    ) -> bytes:
        product_b64 = base64.b64encode(product_bytes).decode()

        prompt = (
            f"Professional product photography: {shot_desc}. "
            f"Product: {product_name}. "
            f"Model/background: {avatar_desc}. "
            f"Setting: {bg_desc}. "
            f"Style: high-end commercial photography, sharp focus on product, "
            f"perfect lighting, Instagram-ready, Indian market aesthetic."
        )

        payload = {
            "contents": [{
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": product_b64}},
                    {"text": prompt}
                ]
            }],
            "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}
        }

        resp = await self.client.post(
            GEMINI_URL,
            json=payload,
            headers={"x-goog-api-key": GEMINI_API_KEY}
        )
        resp.raise_for_status()
        data = resp.json()

        for part in data["candidates"][0]["content"]["parts"]:
            if part.get("inlineData"):
                return base64.b64decode(part["inlineData"]["data"])

        raise ValueError("No image in Gemini response")

    def _placeholder(self, label: str, product_name: str) -> bytes:
        img = Image.new("RGB", (1080, 1080), color="#1a1a2e")
        draw = ImageDraw.Draw(img)
        draw.text((540, 480), f"📷 {label}", fill="#a78bfa", anchor="mm")
        draw.text((540, 540), product_name, fill="#ffffff", anchor="mm")
        draw.text((540, 600), "GoVisual AI — Product Shoot", fill="#39ff14", anchor="mm")
        buf = io.BytesIO(); img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()

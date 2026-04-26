import os
import base64
import httpx

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-preview-image-generation")


class GeminiService:

    async def generate(self, prompt: str, image_bytes: bytes):
        gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_api_key:
            print("No GEMINI_API_KEY — returning placeholder")
            return self._placeholder_image(prompt)
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "contents": [{"parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
                {"text": prompt},
            ]}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
        }
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_MODEL}:generateContent?key={gemini_api_key}"
        )
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(url, json=payload)
                if response.status_code >= 400:
                    print(f"Gemini HTTP {response.status_code}: {response.text[:500]}")
                    return self._placeholder_image(prompt)
                data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"No candidates from Gemini: {str(data)[:300]}")
                return self._placeholder_image(prompt)
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    return base64.b64decode(part["inlineData"]["data"])
            print("Gemini returned no image part")
            return self._placeholder_image(prompt)
        except Exception as e:
            print(f"Gemini error: {e}")
            return self._placeholder_image(prompt)

    def _placeholder_image(self, prompt: str = "") -> bytes:
        from PIL import Image, ImageDraw
        import io
        import hashlib
        bg_colors = [(26, 26, 46), (15, 52, 96), (233, 69, 96), (10, 26, 10)]
        idx = int(hashlib.md5(prompt[:20].encode()).hexdigest(), 16) % len(bg_colors)
        img = Image.new("RGB", (800, 800), bg_colors[idx])
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, 800, 8], fill=(57, 255, 20))
        draw.rectangle([0, 792, 800, 800], fill=(57, 255, 20))
        draw.text((400, 370), "GoVisual AI", fill=(255, 255, 255), anchor="mm")
        draw.text((400, 410), "Demo Creative", fill=(150, 150, 150), anchor="mm")
        draw.text((400, 450), "Gemini fallback image (check backend logs)", fill=(80, 80, 80), anchor="mm")
        draw.text((20, 770), "GoVisual AI", fill=(57, 255, 20))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()

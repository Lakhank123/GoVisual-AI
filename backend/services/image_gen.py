"""
GoVisual AI — Image Generation Service
=======================================
Supports three modes (set IMAGE_MODE in .env):

  IMAGE_MODE=gemini       ← Google Gemini (needs GEMINI_API_KEY)
  IMAGE_MODE=hf_api       ← HuggingFace Inference API (FREE, recommended)
  IMAGE_MODE=placeholder  ← Colored demo images (no API key needed)

HuggingFace fallback chain: FLUX.1-schnell → SDXL → SD 1.5
"""

import os
import io
import asyncio
import hashlib
import base64
import logging

logger = logging.getLogger(__name__)

# ── Read config from environment ──────────────────────────────────────────────
IMAGE_MODE   = os.getenv("IMAGE_MODE", "").lower().strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-preview-image-generation")
HF_TOKEN       = os.getenv("HF_API_TOKEN", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# HuggingFace model configs — each with correct parameters
HF_MODELS = [
    {
        "id":    "black-forest-labs/FLUX.1-schnell",
        "name":  "FLUX.1-schnell",
        "params": {
            "width":  1024,
            "height": 1024,
            "num_inference_steps": 4,
            "guidance_scale": 0.0,       # FLUX doesn't use classifier-free guidance
        },
    },
    {
        "id":    "stabilityai/stable-diffusion-xl-base-1.0",
        "name":  "SDXL",
        "params": {
            "width":  1024,
            "height": 1024,
            "num_inference_steps": 25,
            "guidance_scale": 7.5,
            "negative_prompt": (
                "blurry, low quality, distorted, watermark, "
                "text overlay, bad anatomy, ugly, deformed"
            ),
        },
    },
    {
        "id":    "runwayml/stable-diffusion-v1-5",
        "name":  "SD 1.5",
        "params": {
            "width":  512,
            "height": 512,
            "num_inference_steps": 25,
            "guidance_scale": 7.5,
            "negative_prompt": (
                "blurry, low quality, distorted, watermark, "
                "text overlay, bad anatomy, ugly"
            ),
        },
    },
]


class ImageGenService:

    def __init__(self):
        # Determine provider from IMAGE_MODE env var, with smart auto-detect
        if IMAGE_MODE == "openai" and OPENAI_API_KEY:
            self.provider = "openai"
        elif IMAGE_MODE == "gemini" and GEMINI_API_KEY:
            self.provider = "gemini"
        elif IMAGE_MODE == "hf_api" and HF_TOKEN:
            self.provider = "huggingface"
        elif IMAGE_MODE == "pollinations":
            self.provider = "pollinations"
        elif IMAGE_MODE == "placeholder":
            self.provider = "placeholder"
        elif OPENAI_API_KEY:
            self.provider = "openai"
        elif GEMINI_API_KEY:
            self.provider = "gemini"
        elif HF_TOKEN:
            self.provider = "huggingface"
        else:
            self.provider = "pollinations"

        # Log the chosen provider
        if self.provider == "openai":
            logger.info("[ImageGen] [OK] Provider: OpenAI DALL-E 3")
            print("[ImageGen] [OK] Provider: OpenAI DALL-E 3")
        elif self.provider == "gemini":
            logger.info(f"[ImageGen] [OK] Provider: Google Gemini ({GEMINI_MODEL})")
            print(f"[ImageGen] [OK] Provider: Google Gemini ({GEMINI_MODEL})")
        elif self.provider == "huggingface":
            logger.info(f"[ImageGen] [OK] Provider: HuggingFace (token: {HF_TOKEN[:8]}...)")
            print(f"[ImageGen] [OK] Provider: HuggingFace (token: {HF_TOKEN[:8]}...)")
            print(f"[ImageGen]    Fallback chain: {' -> '.join(m['name'] for m in HF_MODELS)}")
        elif self.provider == "pollinations":
            logger.info("[ImageGen] [OK] Provider: Pollinations (Keyless AI)")
            print("[ImageGen] [OK] Provider: Pollinations (Keyless AI)")
        else:
            logger.warning("[ImageGen] [WARN] Using placeholder images")
            print("[ImageGen] [WARN] Using placeholder images")

    def _clean_prompt(self, prompt: str, product_name: str = "") -> str:
        """Strip text, price, brand name typography and product drawing requests to generate empty backgrounds."""
        import re
        cleaned = prompt
        
        # 1. Remove product name references case-insensitively
        if product_name:
            prod_pattern = rf"(?i)\b{re.escape(product_name)}\b[^.,]*"
            cleaned = re.sub(prod_pattern, "", cleaned)
            
        # 2. Patterns to match text/typography specifications and generic foreground products
        patterns = [
            r"(?i)\bbrand name\b[^.,]*",
            r"(?i)\bprice\b[^.,]*",
            r"(?i)\brs\.[^.,]*",
            r"(?i)\btypography\b[^.,]*",
            r"(?i)\btext overlay\b[^.,]*",
            r"(?i)\bwritten text\b[^.,]*",
            r"(?i)\bfont\b[^.,]*",
            r"(?i)\bsans-serif\b[^.,]*",
            r"(?i)\bbadge\b[^.,]*",
            r"(?i)\bproduct\b[^.,]*",
            r"(?i)\bitem\b[^.,]*",
            r"(?i)\bobject\b[^.,]*",
            r"(?i)\bbottle\b[^.,]*",
            r"(?i)\bphone\b[^.,]*",
            r"(?i)\bshoes\b[^.,]*",
            r"(?i)\bfood\b[^.,]*",
        ]
        for pattern in patterns:
            cleaned = re.sub(pattern, "", cleaned)
        
        # Clean double commas and spaces
        cleaned = re.sub(r"\s+", " ", cleaned)
        cleaned = re.sub(r",\s*,", ",", cleaned)
        cleaned = re.sub(r"\.\s*\.", ".", cleaned)
        cleaned = cleaned.replace(" ,", ",").replace(" .", ".")
        
        cleaned = cleaned.strip()
        if not cleaned.endswith("."):
            cleaned += "."
            
        # Add strong background-only instructions
        bg_suffix = (
            " Empty background, no products, no bottles, no phones, no shoes, no food, "
            "no foreground objects, empty copy space in the center, premium commercial studio setup, "
            "professional lighting, realistic studio reflections, depth of field. Clean image, no text, textless."
        )
        return cleaned + bg_suffix

    @property
    def provider_name(self):
        return self.provider

    async def generate(self, prompt: str, image_bytes: bytes, product_name: str = "") -> bytes:
        """Generate an image from a text prompt. Falls back gracefully."""
        prompt = self._clean_prompt(prompt, product_name)

        # Try OpenAI first if configured
        if self.provider == "openai":
            result = await self._openai_generate(prompt)
            if result is not None:
                return result
            print("[ImageGen] [WARN] OpenAI failed -- trying Gemini fallback...")
            if GEMINI_API_KEY:
                result = await self._gemini_generate(prompt, image_bytes)
                if result is not None:
                    return result
            print("[ImageGen] [WARN] Gemini failed -- trying HuggingFace fallback...")
            if HF_TOKEN:
                result = await self._hf_generate_with_fallback(prompt)
                if result is not None:
                    return result
            print("[ImageGen] [WARN] HuggingFace failed -- trying Pollinations fallback...")
            result = await self._pollinations_generate(prompt)
            if result is not None:
                return result

        # Try Gemini first if configured
        elif self.provider == "gemini":
            result = await self._gemini_generate(prompt, image_bytes)
            if result is not None:
                return result
            print("[ImageGen] [WARN] Gemini failed -- trying HuggingFace fallback...")
            if HF_TOKEN:
                result = await self._hf_generate_with_fallback(prompt)
                if result is not None:
                    return result
            print("[ImageGen] [WARN] HuggingFace failed -- trying Pollinations fallback...")
            result = await self._pollinations_generate(prompt)
            if result is not None:
                return result

        # Try HuggingFace with multi-model fallback
        elif self.provider == "huggingface":
            result = await self._hf_generate_with_fallback(prompt)
            if result is not None:
                return result
            print("[ImageGen] [WARN] HuggingFace failed -- trying Pollinations fallback...")
            result = await self._pollinations_generate(prompt)
            if result is not None:
                return result

        # Try Pollinations if configured
        elif self.provider == "pollinations":
            result = await self._pollinations_generate(prompt)
            if result is not None:
                return result

        # Last resort: placeholder
        print("[ImageGen] [FAIL] All providers failed -- returning placeholder image")
        return self._placeholder(prompt)

    # ── OpenAI image generation ──────────────────────────────────────────

    async def _openai_generate(self, prompt: str) -> bytes | None:
        """Generate an image using OpenAI's DALL-E 3."""
        import httpx
        payload = {
            "model": "dall-e-3",
            "prompt": prompt[:4000],  # DALL-E 3 character limit is 4000
            "n": 1,
            "size": "1024x1024"
        }
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        url = "https://api.openai.com/v1/images/generations"
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                print("[OpenAI DALL-E] Sending request to DALL-E 3...")
                response = await client.post(url, json=payload, headers=headers)
            if response.status_code >= 400:
                print(f"[OpenAI DALL-E] [FAIL] HTTP {response.status_code}: {response.text[:300]}")
                return None
            data = response.json()
            img_data = data.get("data", [])
            if not img_data:
                print(f"[OpenAI DALL-E] [FAIL] No data in response: {str(data)[:200]}")
                return None
            
            # Try to download from URL first
            url_str = img_data[0].get("url")
            if url_str:
                print(f"[OpenAI DALL-E] Downloading image from url: {url_str[:100]}...")
                async with httpx.AsyncClient(timeout=60) as dl_client:
                    dl_resp = await dl_client.get(url_str)
                    if dl_resp.status_code == 200:
                        print(f"[OpenAI DALL-E] [OK] Image downloaded successfully ({len(dl_resp.content)} bytes)")
                        return dl_resp.content
            
            # Fallback to decoding b64_json
            b64_str = img_data[0].get("b64_json")
            if b64_str:
                img_bytes = base64.b64decode(b64_str)
                print(f"[OpenAI DALL-E] [OK] Image decoded from b64 successfully ({len(img_bytes)} bytes)")
                return img_bytes
            return None
        except Exception as e:
            print(f"[OpenAI DALL-E] [FAIL] Exception: {e}")
            return None

    # ── Gemini image generation ──────────────────────────────────────────

    async def _gemini_generate(self, prompt: str, image_bytes: bytes) -> bytes | None:
        """Generate an image using Gemini's multimodal image generation."""
        import httpx

        parts = []

        # Include the reference product image if provided
        if image_bytes and len(image_bytes) > 100:
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")
            parts.append({
                "inline_data": {"mime_type": "image/jpeg", "data": image_b64}
            })

        # Add the prompt
        parts.append({
            "text": (
                "Generate a high-quality marketing creative image based on this prompt. "
                "Output ONLY the generated image, no text response.\n\n" + prompt
            )
        })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
            },
        }

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        )

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                print(f"[Gemini] Sending request to {GEMINI_MODEL}...")

                response = await client.post(url, json=payload)

            if response.status_code >= 400:
                print(f"[Gemini] [FAIL] HTTP {response.status_code}: {response.text[:300]}")
                return None

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"[Gemini] [FAIL] No candidates in response: {str(data)[:200]}")
                return None

            resp_parts = candidates[0].get("content", {}).get("parts", [])
            for part in resp_parts:
                if "inlineData" in part:
                    img_bytes = base64.b64decode(part["inlineData"]["data"])
                    print(f"[Gemini] [OK] Image generated successfully ({len(img_bytes)} bytes)")
                    return img_bytes

            print("[Gemini] [FAIL] Response contained no image data")
            return None

        except Exception as e:
            print(f"[Gemini] [FAIL] Exception: {e}")
            return None

    # ── HuggingFace multi-model fallback ─────────────────────────────────

    async def _hf_generate_with_fallback(self, prompt: str) -> bytes | None:
        """Try each HF model in order until one succeeds."""
        for model in HF_MODELS:
            print(f"[HF API] Trying {model['name']} ({model['id']})...")
            result = await self._hf_call(prompt, model)
            if result is not None:
                return result
            print(f"[HF API] [FAIL] {model['name']} failed, trying next model...")
        return None

    async def _hf_call(self, prompt: str, model: dict) -> bytes | None:
        """Make a single HF Inference API call with correct model-specific params."""
        import httpx

        headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type":  "application/json",
        }

        payload = {
            "inputs": prompt[:500],
            "parameters": {**model["params"]},
        }

        # Remove negative_prompt for models that don't support it (FLUX)
        if "FLUX" in model["id"] or "flux" in model["id"]:
            payload["parameters"].pop("negative_prompt", None)

        api_url = f"https://router.huggingface.co/hf-inference/models/{model['id']}"

        try:
            print(f"[HF API] DEBUG: Calling {api_url}")
            print(f"[HF API] DEBUG: Payload keys: {list(payload.keys())}")
            print(f"[HF API] DEBUG: Parameters: {payload.get('parameters', {})}")
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(api_url, json=payload, headers=headers)
            print(f"[HF API] DEBUG: Status code = {response.status_code}")
            print(f"[HF API] DEBUG: Response headers = {dict(response.headers)}")


            # Success
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                content_length = len(response.content)
                print(f"[HF API] DEBUG: Content-Type: {content_type}, Content length: {content_length}")
                # Make sure we got an image, not a JSON error
                if "image" in content_type or len(response.content) > 5000:
                    print(f"[HF API] [OK] {model['name']} -- {len(response.content)} bytes received")
                    return response.content
                else:
                    print(f"[HF API] [WARN] {model['name']} returned non-image response")
                    print(f"[HF API] DEBUG: Response text: {response.text[:500]}")
                    return None

            # Model is loading — wait and retry once
            if response.status_code == 503:
                try:
                    wait_info = response.json()
                    wait_time = min(wait_info.get("estimated_time", 30), 60)
                except Exception:
                    wait_time = 30
                print(f"[HF API] [WAIT] {model['name']} loading -- waiting {wait_time:.0f}s then retrying...")
                await asyncio.sleep(wait_time)

                async with httpx.AsyncClient(timeout=120) as client:
                    response = await client.post(api_url, json=payload, headers=headers)

                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    if "image" in content_type or len(response.content) > 5000:
                        print(f"[HF API] [OK] {model['name']} -- {len(response.content)} bytes (after retry)")
                        return response.content

                print(f"[HF API] [FAIL] {model['name']} still failed after retry: HTTP {response.status_code}")
                return None

            # Rate limited
            if response.status_code == 429:
                print(f"[HF API] [WARN] {model['name']} rate limited -- trying next model")
                return None

            # Bad request (wrong params)
            if response.status_code == 422:
                print(f"[HF API] [FAIL] {model['name']} rejected params (422): {response.text[:200]}")
                return None

            # Other errors
            print(f"[HF API] [FAIL] {model['name']} HTTP {response.status_code}: {response.text[:200]}")
            return None

        except asyncio.TimeoutError:
            print(f"[HF API] [FAIL] {model['name']} timed out after 120s")
            return None
        except Exception as e:
            print(f"[HF API] [FAIL] {model['name']} exception: {e}")
            return None

    # ── Pollinations image generation ────────────────────────────────────

    async def _pollinations_generate(self, prompt: str) -> bytes | None:
        """Generate an image using Pollinations.ai (free & keyless)."""
        import httpx
        import urllib.parse
        encoded = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true"
        try:
            print(f"[Pollinations] Sending request for: {prompt[:100]}...")
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.get(url)
            if response.status_code == 200:
                print(f"[Pollinations] [OK] Image generated successfully ({len(response.content)} bytes)")
                return response.content
            print(f"[Pollinations] [FAIL] HTTP {response.status_code}: {response.text[:200]}")
            return None
        except Exception as e:
            print(f"[Pollinations] [FAIL] Exception: {e}")
            return None

    # ── Placeholder fallback ─────────────────────────────────────────────

    def _placeholder(self, prompt: str = "") -> bytes:
        """Generate a colored placeholder image. Only used when all APIs fail."""
        from PIL import Image, ImageDraw

        bg_colors = [
            (26, 26, 46), (15, 52, 96),
            (20, 40, 20), (50, 20, 50), (60, 20, 20)
        ]
        idx = int(hashlib.md5(prompt[:20].encode()).hexdigest(), 16) % len(bg_colors)
        bg = bg_colors[idx]

        img = Image.new("RGB", (1024, 1024), bg)
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, 1024, 10], fill=(57, 255, 20))
        draw.rectangle([0, 1014, 1024, 1024], fill=(57, 255, 20))
        draw.rounded_rectangle([80, 80, 944, 944], radius=20,
                                outline=(57, 255, 20), width=2)
        draw.text((512, 400), "GoVisual AI", fill=(57, 255, 20), anchor="mm")
        draw.text((512, 460), "Demo Creative", fill=(200, 200, 200), anchor="mm")
        draw.text((512, 510), "Image generation unavailable",
                  fill=(100, 100, 100), anchor="mm")
        draw.text((20, 990), "GoVisual AI", fill=(57, 255, 20))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()

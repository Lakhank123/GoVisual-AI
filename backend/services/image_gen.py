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
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Read config from environment ──────────────────────────────────────────────
IMAGE_MODE   = os.getenv("IMAGE_MODE", "").lower().strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-preview-image-generation")
HF_TOKEN       = os.getenv("HF_API_TOKEN", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
if not OPENAI_API_KEY:
    OPENAI_API_KEY = os.getenv("OPEN_AI_API_KEY", "").strip()
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1-mini").strip()
OPENAI_IMAGE_SIZE = os.getenv("OPENAI_IMAGE_SIZE", "1024x1024").strip()
OPENAI_IMAGE_QUALITY = os.getenv("OPENAI_IMAGE_QUALITY", "standard").strip()

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
                "text overlay, bad anatomy, ugly, deformed, duplicate products, "
                "extra objects, malformed objects, floating product, unrealistic shadows, "
                "incorrect perspective, plastic, CGI, excessive blur, oversaturation, "
                "random text, fake logos, incorrect branding"
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
                "text overlay, bad anatomy, ugly, deformed, duplicate products, "
                "extra objects, malformed objects, floating product, unrealistic shadows, "
                "incorrect perspective, plastic, CGI, excessive blur, oversaturation, "
                "random text, fake logos, incorrect branding"
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
            logger.info("[ImageGen] [OK] Provider: OpenAI (%s, %s quality)", OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY)
            print(f"[ImageGen] [OK] Provider: OpenAI ({OPENAI_IMAGE_MODEL}, {OPENAI_IMAGE_QUALITY} quality)")
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
            
        # Add strong background-only instructions to leave space for compositing
        bg_suffix = (
            " Maintain empty compositional space in the center for product placement. "
            "Premium commercial studio setup, professional lighting, realistic studio reflections, "
            "depth of field. Clean image, no text, textless."
        )
        return cleaned + bg_suffix

    @property
    def provider_name(self):
        return self.provider

    async def generate(self, prompt: str, image_bytes: bytes, product_name: str = "") -> bytes:
        """Generate an image from a text prompt. Strict provider enforcement."""
        prompt = self._clean_prompt(prompt, product_name)

        if self.provider == "openai":
            result = await self._openai_generate(prompt)
            if result is not None:
                return result
            raise Exception("OpenAI image generation failed.")

        elif self.provider == "gemini":
            result = await self._gemini_generate(prompt, image_bytes)
            if result is not None:
                return result
            raise Exception("Gemini image generation failed.")

        elif self.provider == "huggingface":
            result = await self._hf_generate_with_fallback(prompt, image_bytes)
            if result is not None:
                return result
            raise Exception("HuggingFace image generation failed for all models.")

        elif self.provider == "pollinations":
            result = await self._pollinations_generate(prompt)
            if result is not None:
                return result
            raise Exception("Pollinations image generation failed.")

        raise Exception(f"Provider {self.provider} failed or unsupported.")

    # ── OpenAI image generation ──────────────────────────────────────────

    async def _openai_generate(self, prompt: str) -> bytes | None:
        """Generate a standard-quality image using the configured OpenAI model."""
        import httpx
        payload = {
            "model": OPENAI_IMAGE_MODEL,
            "prompt": prompt[:4000],  # DALL-E 3 character limit is 4000
            "n": 1,
            "size": OPENAI_IMAGE_SIZE,
            "quality": OPENAI_IMAGE_QUALITY,
        }
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        url = "https://api.openai.com/v1/images/generations"
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                print(f"[OpenAI] Sending request to {OPENAI_IMAGE_MODEL} ({OPENAI_IMAGE_QUALITY} quality)...")
                response = await client.post(url, json=payload, headers=headers)
            if response.status_code >= 400:
                print(f"[OpenAI] [FAIL] HTTP {response.status_code}: {response.text[:300]}")
                return None
            data = response.json()
            img_data = data.get("data", [])
            if not img_data:
                print(f"[OpenAI] [FAIL] No data in response: {str(data)[:200]}")
                return None
            
            # Try to download from URL first
            url_str = img_data[0].get("url")
            if url_str:
                print(f"[OpenAI] Downloading generated image...")
                async with httpx.AsyncClient(timeout=60) as dl_client:
                    dl_resp = await dl_client.get(url_str)
                    if dl_resp.status_code == 200:
                        print(f"[OpenAI] [OK] Image downloaded successfully ({len(dl_resp.content)} bytes)")
                        return dl_resp.content
            
            # Fallback to decoding b64_json
            b64_str = img_data[0].get("b64_json")
            if b64_str:
                img_bytes = base64.b64decode(b64_str)
                print(f"[OpenAI] [OK] Image decoded from b64 successfully ({len(img_bytes)} bytes)")
                return img_bytes
            return None
        except Exception as e:
            print(f"[OpenAI] [FAIL] Exception: {e}")
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

    async def _hf_generate_with_fallback(self, prompt: str, image_bytes: bytes | None = None) -> bytes | None:
        """Try each HF model in order until one succeeds."""
        for model in HF_MODELS:
            print(f"[HF API] Trying {model['name']} ({model['id']})...")
            result = await self._hf_call(prompt, model, image_bytes)
            if result is not None:
                return result
            print(f"[HF API] [FAIL] {model['name']} failed, trying next model...")
        return None

    async def _hf_call(self, prompt: str, model: dict, image_bytes: bytes | None = None) -> bytes | None:
        """Make a single HF Inference API call using huggingface_hub."""
        from huggingface_hub import InferenceClient
        try:
            print(f"[HF API] DEBUG: Initializing InferenceClient for {model['id']}")
            client = InferenceClient(model=model["id"], token=HF_TOKEN)
            
            kwargs = {}
            if "width" in model["params"]:
                kwargs["width"] = model["params"]["width"]
            if "height" in model["params"]:
                kwargs["height"] = model["params"]["height"]
            if "num_inference_steps" in model["params"]:
                kwargs["num_inference_steps"] = model["params"]["num_inference_steps"]
            if "guidance_scale" in model["params"] and ("FLUX" not in model["id"] and "flux" not in model["id"]):
                kwargs["guidance_scale"] = model["params"]["guidance_scale"]

            print(f"[HF API] DEBUG: Calling InferenceClient with kwargs: {kwargs}")
            
            import io
            
            # FORCE TEXT-TO-IMAGE: HF Serverless endpoints often reject image_to_image for FLUX/SDXL.
            # Visual context is already embedded into the prompt via Groq/T5.
            print(f"[HF API] DEBUG: Running text_to_image (Forced safely due to API constraints)")
            image = await asyncio.to_thread(client.text_to_image, prompt[:1000], **kwargs)
            
            buf = io.BytesIO()
            image.save(buf, format="JPEG", quality=90)
            img_bytes = buf.getvalue()
            
            print(f"[HF API] [OK] {model['name']} -- {len(img_bytes)} bytes received")
            return img_bytes

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

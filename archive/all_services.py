"""
GoVisual AI — ML + Generation Services
"""

# ══════════════════════════════════════════════════════
# t5_model.py  (save this as services/t5_model.py)
# ══════════════════════════════════════════════════════

import os
import torch
from transformers import T5Tokenizer, T5ForConditionalGeneration

MODEL_PATH = os.getenv("T5_MODEL_PATH", "./ml_model")


class PromptService:
    def __init__(self):
        self._model     = None
        self._tokenizer = None
        self._device    = "cuda" if torch.cuda.is_available() else "cpu"
        self._load()

    def _load(self):
        """Load T5 model from local path or HuggingFace Hub."""
        try:
            print(f"Loading T5 model from: {MODEL_PATH}")
            self._tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH)
            self._model     = T5ForConditionalGeneration.from_pretrained(MODEL_PATH)
            self._model     = self._model.to(self._device)
            self._model.eval()
            print("T5 model loaded successfully.")
        except Exception as e:
            print(f"WARNING: T5 model not found ({e}). Using fallback templates.")
            self._model = None

    def is_loaded(self) -> bool:
        return self._model is not None

    def generate(self, input_text: str) -> list:
        """
        Input:  pipe-delimited wizard answer string
        Output: list of 3 optimized prompts
        """
        if self._model is None:
            return self._fallback_prompts(input_text)

        prefixed = "generate prompts: " + input_text
        inputs   = self._tokenizer(
            prefixed, return_tensors="pt",
            max_length=256, truncation=True,
        ).to(self._device)

        with torch.no_grad():
            outputs = self._model.generate(
                **inputs,
                max_length=1024,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=3,
            )

        decoded = self._tokenizer.decode(outputs[0], skip_special_tokens=True)
        return self._parse_output(decoded, input_text)

    def _parse_output(self, decoded: str, input_text: str) -> list:
        """Split T5 output into 3 prompts and append reference image instruction."""
        REF = (
            " Use the uploaded reference image to match the exact product model, "
            "color, and physical form. Do not substitute a generic product."
        )
        parts = decoded.split("[SEP]")
        prompts = []
        for part in parts[:3]:
            for prefix in ["PROMPT1:", "PROMPT2:", "PROMPT3:"]:
                part = part.replace(prefix, "")
            prompts.append(part.strip() + REF)

        # If model didn't generate all 3, fill with fallback
        while len(prompts) < 3:
            prompts.extend(self._fallback_prompts(input_text)[len(prompts):])

        return prompts[:3]

    def _fallback_prompts(self, input_text: str) -> list:
        """Rule-based prompts used when model isn't loaded yet (development)."""
        # Parse key fields from input_text
        fields = {}
        for part in input_text.split("|"):
            if ":" in part:
                k, v = part.split(":", 1)
                fields[k.strip()] = v.strip()

        product = fields.get("product", "product")
        brand   = fields.get("brand",   "the brand")
        price   = fields.get("price",   "")
        mood    = fields.get("mood",    "premium")
        bg      = fields.get("background", "studio")
        light   = fields.get("lighting", "cinematic")
        colors  = fields.get("colors",  "brand colors")
        purpose = fields.get("purpose", "promotional")
        REF     = " Use the uploaded reference image to match the exact product."

        return [
            f"Clean commercial photograph of {product} for {brand}. "
            f"Front angle, {bg} background, even {light}. "
            f"Brand name '{brand}' at bottom, price ₹{price} clearly visible. "
            f"Mood: {mood}. Purpose: {purpose}. Deep focus." + REF,

            f"Premium brand photography of {product} for {brand}. "
            f"Dynamic 3/4 angle with dramatic {light}. "
            f"{colors} palette in background gradients. "
            f"Shallow bokeh, '{brand}' in bold sans-serif. "
            f"Price ₹{price} as floating badge. Mood: {mood}." + REF,

            f"Cinematic campaign image of {product} for {brand}. "
            f"Artistic angle with volumetric light in {colors}. "
            f"Atmospheric {bg} with particle depth layers. "
            f"'{brand}' typographically integrated as light. "
            f"₹{price} in frosted glass badge. Award-winning CGI quality." + REF,
        ]


# ══════════════════════════════════════════════════════
# gemini.py  (save this as services/gemini.py)
# ══════════════════════════════════════════════════════

import os
import base64
import httpx

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-1.5-flash"


class GeminiService:

    async def generate(self, prompt: str, image_bytes: bytes) -> bytes | None:
        """
        Send prompt + reference image to Gemini.
        Returns raw image bytes of the generated creative.
        """
        if not GEMINI_API_KEY:
            print("WARNING: No GEMINI_API_KEY — returning placeholder image")
            return self._placeholder_image()

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "contents": [{
                "parts": [
                    # Image FIRST — Gemini uses it as visual reference
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data":      image_b64,
                        }
                    },
                    # Prompt SECOND
                    {"text": prompt},
                ]
            }],
            "generationConfig": {
                "temperature":    0.7,
                "topK":           32,
                "topP":           1,
                "maxOutputTokens": 4096,
            },
        }

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        )

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(url, json=payload)
                data     = response.json()

            # Extract image from response
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"Gemini returned no candidates: {data}")
                return None

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    img_data = part["inlineData"]["data"]
                    return base64.b64decode(img_data)

            # If no image part (text-only model), return None
            print("Gemini returned text only — ensure you're using an image-capable model")
            return None

        except Exception as e:
            print(f"Gemini API error: {e}")
            return None

    def _placeholder_image(self) -> bytes:
        """1x1 white JPEG for development without API key."""
        return bytes([
            0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,
            0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,
            0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,
            0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
            0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,
            0x24,0x2E,0x27,0x20,0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,
            0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,0x39,0x3D,0x38,0x32,
            0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
            0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,
            0x01,0x05,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,
            0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,
            0x09,0x0A,0x0B,0xFF,0xC4,0x00,0xB5,0x10,0x00,0x02,0x01,0x03,
            0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7D,
            0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,
            0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,0x81,0x91,0xA1,0x08,
            0x23,0x42,0xB1,0xC1,0x15,0x52,0xD1,0xF0,0x24,0x33,0x62,0x72,
            0xFF,0xDA,0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00,0xFB,0xD2,
            0x8A,0x28,0x03,0xFF,0xD9,
        ])


# ══════════════════════════════════════════════════════
# watermark.py  (save this as services/watermark.py)
# ══════════════════════════════════════════════════════

import os
from PIL import Image, ImageDraw, ImageFont
import io

WATERMARK_PATH = os.getenv("WATERMARK_PATH", "./watermark.png")


class WatermarkService:

    def __init__(self):
        self._watermark = None
        if os.path.exists(WATERMARK_PATH):
            self._watermark = Image.open(WATERMARK_PATH).convert("RGBA")

    def apply(self, image_bytes: bytes) -> bytes:
        """
        Composite a semi-transparent watermark onto bottom-left of image.
        Returns JPEG bytes.
        """
        try:
            base = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            base = self._add_watermark(base)
            
            # Convert to RGB (JPEG doesn't support alpha)
            out  = Image.new("RGB", base.size, (255, 255, 255))
            out.paste(base, mask=base.split()[3])
            
            buf = io.BytesIO()
            out.save(buf, format="JPEG", quality=95)
            return buf.getvalue()

        except Exception as e:
            print(f"Watermark error: {e} — returning original")
            return image_bytes

    def _add_watermark(self, base: Image.Image) -> Image.Image:
        w, h = base.size

        if self._watermark:
            # Scale watermark to 18% of image width
            wm_w  = max(80, int(w * 0.18))
            ratio = wm_w / self._watermark.width
            wm_h  = int(self._watermark.height * ratio)
            wm    = self._watermark.resize((wm_w, wm_h), Image.LANCZOS)

            # Set opacity to 20%
            wm_with_alpha = wm.copy()
            alpha = wm_with_alpha.split()[3]
            alpha = alpha.point(lambda p: int(p * 0.20))
            wm_with_alpha.putalpha(alpha)

            # Position: bottom-left with 12px padding
            pos = (12, h - wm_h - 12)
            overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            overlay.paste(wm_with_alpha, pos, wm_with_alpha)
            return Image.alpha_composite(base, overlay)

        else:
            # Text watermark fallback
            overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            draw    = ImageDraw.Draw(overlay)
            text    = "GoVisual AI"
            font_sz = max(12, int(w * 0.025))

            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_sz)
            except Exception:
                font = ImageFont.load_default()

            bbox = draw.textbbox((0, 0), text, font=font)
            tw   = bbox[2] - bbox[0]
            th   = bbox[3] - bbox[1]
            draw.text((14, h - th - 14), text, font=font, fill=(255, 255, 255, 50))
            return Image.alpha_composite(base, overlay)


# ══════════════════════════════════════════════════════
# storage.py  (save this as services/storage.py)
# ══════════════════════════════════════════════════════

import os
import uuid
import cloudinary
import cloudinary.uploader
import io

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key    = os.getenv("CLOUDINARY_API_KEY",    ""),
    api_secret = os.getenv("CLOUDINARY_API_SECRET", ""),
    secure     = True,
)

LOCAL_FALLBACK = os.getenv("USE_LOCAL_STORAGE", "true").lower() == "true"
LOCAL_DIR      = "./generated_images"


class StorageService:

    async def upload(self, image_bytes: bytes, folder: str, filename: str) -> str:
        """Upload image and return public URL."""
        if LOCAL_FALLBACK or not cloudinary.config().cloud_name:
            return self._save_local(image_bytes, filename)

        try:
            result = cloudinary.uploader.upload(
                io.BytesIO(image_bytes),
                folder=folder,
                public_id=filename.replace(".jpg", ""),
                resource_type="image",
                format="jpg",
                quality="auto:best",
            )
            return result["secure_url"]
        except Exception as e:
            print(f"Cloudinary upload failed: {e} — saving locally")
            return self._save_local(image_bytes, filename)

    def _save_local(self, image_bytes: bytes, filename: str) -> str:
        os.makedirs(LOCAL_DIR, exist_ok=True)
        path = os.path.join(LOCAL_DIR, filename)
        with open(path, "wb") as f:
            f.write(image_bytes)
        # In production, return a proper URL
        return f"/static/generated/{filename}"

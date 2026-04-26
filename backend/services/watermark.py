import os
from PIL import Image, ImageDraw
import io

WATERMARK_PATH = os.getenv("WATERMARK_PATH", "./watermark.png")


class WatermarkService:

    def __init__(self):
        self._watermark = None
        try:
            if os.path.exists(WATERMARK_PATH):
                self._watermark = Image.open(WATERMARK_PATH).convert("RGBA")
        except Exception:
            pass

    def apply(self, image_bytes: bytes) -> bytes:
        try:
            base = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            w, h = base.size
            overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            draw.text((14, h - 30), "GoVisual AI", fill=(57, 255, 20, 60))
            result = Image.alpha_composite(base, overlay)
            out = Image.new("RGB", result.size, (255, 255, 255))
            out.paste(result, mask=result.split()[3])
            buf = io.BytesIO()
            out.save(buf, format="JPEG", quality=95)
            return buf.getvalue()
        except Exception as e:
            print(f"Watermark error: {e}")
            return image_bytes

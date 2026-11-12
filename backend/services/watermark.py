import os
from PIL import Image, ImageDraw, ImageFont
import io

WATERMARK_PATH = os.getenv("WATERMARK_PATH", "./watermark.png")


def _load_font(font_name="arial.ttf", size=24):
    paths = [
        font_name,
        os.path.join("C:\\Windows\\Fonts", font_name),
        os.path.join("/usr/share/fonts/truetype/dejavu", "DejaVuSans.ttf"),
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf"
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


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

    def apply_creative_overlay(self, image_bytes: bytes, meta: dict) -> bytes:
        try:
            base = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
            w, h = base.size
            
            overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            brand_name = meta.get("brand_name", "Our Brand")
            product = meta.get("product", "")
            price = meta.get("price", "")
            offer = meta.get("offer", "")
            brand_colors = meta.get("brand_colors", "")
            category = meta.get("category", "")
            logo_bytes = meta.get("logo_bytes")
            logo_variants = meta.get("logo_variants", "All variants")
            variant_label = meta.get("variant_label", "")
            
            accent_color = (57, 255, 20, 255)
            import re
            hex_matches = re.findall(r"#[0-9a-fA-F]{6}", brand_colors)
            if hex_matches:
                hex_color = hex_matches[0]
                r, g, b = int(hex_color[1:3], 16), int(hex_color[3:5], 16), int(hex_color[5:7], 16)
                accent_color = (r, g, b, 255)
            
            # 1. Improved Product Card Overlay (Glassmorphism & Asymmetric Layout)
            banner_h = 140
            padding = 24
            card_coords = [padding, h - banner_h - padding, w - padding, h - padding]
            
            # Subtle gradient/glassmorphism simulation (dark base with soft white outline)
            draw.rounded_rectangle(card_coords, radius=12, fill=(10, 10, 12, 180), outline=(255, 255, 255, 40), width=1)
            
            font_title = _load_font("arial.ttf", 28)
            font_subtitle = _load_font("arial.ttf", 16)
            font_price = _load_font("arial.ttf", 36)
            
            # Divider line inside card
            line_x = w // 2 + 20
            draw.line([(line_x, h - banner_h - padding + 20), (line_x, h - padding - 20)], fill=(255, 255, 255, 30), width=1)
            
            # Left Side: Brand & Product
            left_x = padding + 24
            product_str = product.upper() if product else "PREMIUM COLLECTION"
            draw.text((left_x, h - banner_h - padding + 20), product_str, fill=(255, 255, 255, 255), font=font_title)
            
            draw.text((left_x, h - banner_h - padding + 60), brand_name, fill=accent_color, font=font_subtitle)
            draw.text((left_x, h - banner_h - padding + 85), "Freshly baked • Premium ingredients" if "food" in category.lower() or "pizza" in category.lower() else "Premium quality • Exclusive design", fill=(200, 200, 200, 180), font=font_subtitle)
            
            # Right Side: Price & CTA
            right_x = line_x + 30
            price_str = f"₹{price}" if price and price.lower() != "see store" else ""
            if price_str:
                draw.text((right_x, h - banner_h - padding + 35), price_str, fill=(255, 255, 255, 255), font=font_price)
                
            if offer and offer.lower() not in ["no offer", "no"]:
                offer_str = offer.upper()
                draw.text((right_x, h - banner_h - padding + 85), f"{offer_str} →", fill=accent_color, font=font_subtitle)
            elif price_str:
                draw.text((right_x, h - banner_h - padding + 85), "ORDER NOW →", fill=accent_color, font=font_subtitle)
                
            result = Image.alpha_composite(base, overlay)
            
            # 2. Diagonal GoVisual AI Watermark
            WATERMARK_OPACITY = 25 # Very subtle
            wm_img = Image.new("RGBA", (800, 200), (0, 0, 0, 0))
            wm_draw = ImageDraw.Draw(wm_img)
            wm_font = _load_font("arial.ttf", 48)
            wm_draw.text((0, 0), "GoVisual AI", fill=(255, 255, 255, WATERMARK_OPACITY), font=wm_font)
            wm_img = wm_img.rotate(30, expand=True) # Rotate -30 (pillow rotates CCW so 30 is -30 visual if pasted)
            
            # Paste in center
            wm_x = (w - wm_img.width) // 2
            wm_y = (h - wm_img.height) // 2
            result.paste(wm_img, (wm_x, wm_y), mask=wm_img)

            # 3. Logo Compositing
            if logo_bytes and (logo_variants == "All variants" or variant_label in logo_variants):
                try:
                    logo_img = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
                    # Resize logo to fit nicely (e.g. max height 60)
                    logo_h = 60
                    logo_w = int(logo_img.width * (logo_h / logo_img.height))
                    logo_img = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
                    # Position top right
                    result.paste(logo_img, (w - logo_w - 30, 30), mask=logo_img)
                except Exception as e:
                    print(f"Error applying logo: {e}")

            out = Image.new("RGB", result.size, (255, 255, 255))
            out.paste(result, mask=result.split()[3])
            buf = io.BytesIO()
            out.save(buf, format="JPEG", quality=95)
            return buf.getvalue()
        except Exception as e:
            print(f"Creative Overlay error: {e}")
            import traceback
            traceback.print_exc()
            return image_bytes

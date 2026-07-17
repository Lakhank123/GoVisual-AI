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
            
            # Create a separate transparent canvas for vector drawings
            overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Read variables from meta
            brand_name = meta.get("brand_name", "Our Brand")
            product = meta.get("product", "")
            price = meta.get("price", "")
            offer = meta.get("offer", "")
            brand_colors = meta.get("brand_colors", "")
            
            # Parse brand colors
            accent_color = (57, 255, 20, 255)  # default GoVisual Green
            import re
            hex_matches = re.findall(r"#[0-9a-fA-F]{6}", brand_colors)
            if hex_matches:
                hex_color = hex_matches[0]
                r = int(hex_color[1:3], 16)
                g = int(hex_color[3:5], 16)
                b = int(hex_color[5:7], 16)
                accent_color = (r, g, b, 255)
            
            # Draw premium overlay card at bottom
            banner_h = 130
            padding = 20
            card_coords = [padding, h - banner_h - padding, w - padding, h - padding]
            
            # Draw card backdrop (dark gray with high alpha)
            draw.rounded_rectangle(card_coords, radius=16, fill=(15, 15, 15, 210), outline=accent_color[:3] + (180,), width=2)
            
            # Load typography fonts
            font_title = _load_font("arial.ttf", 26)
            font_subtitle = _load_font("arial.ttf", 16)
            font_price = _load_font("arial.ttf", 32)
            
            # Render left alignment text: Brand name & product tag
            left_x = padding + 20
            draw.text((left_x, h - banner_h - 10), brand_name, fill=(255, 255, 255, 255), font=font_title)
            
            product_str = f"Premium {product}" if product else "Exclusive Collection"
            draw.text((left_x, h - banner_h + 30), product_str, fill=(200, 200, 200, 255), font=font_subtitle)
            
            # Render right alignment text: Price & offer
            right_x_align = w - padding - 20
            
            # Render Price
            price_str = f"₹{price}" if price else ""
            if price_str:
                price_box = draw.textbbox((0, 0), price_str, font=font_price)
                price_w = price_box[2] - price_box[0]
                draw.text((right_x_align - price_w, h - banner_h - 12), price_str, fill=accent_color, font=font_price)
            
            # Render Offer Badge
            if offer and offer.lower() != "no offer" and offer.lower() != "no":
                offer_str = offer.upper()
                offer_box = draw.textbbox((0, 0), offer_str, font=font_subtitle)
                offer_w = offer_box[2] - offer_box[0]
                offer_h = offer_box[3] - offer_box[1]
                
                bx1 = right_x_align - offer_w - 12
                by1 = h - banner_h + 35
                bx2 = right_x_align
                by2 = by1 + offer_h + 10
                
                # Draw rounded badge background
                draw.rounded_rectangle([bx1, by1, bx2, by2], radius=6, fill=accent_color[:3] + (40,), outline=accent_color[:3] + (180,), width=1)
                draw.text((bx1 + 6, by1 + 4), offer_str, fill=(255, 255, 255, 255), font=font_subtitle)
                
            # Composite overlay drawing
            result = Image.alpha_composite(base, overlay)
            
            # Draw GoVisual watermark badge at the top-right corner
            wm_overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
            wm_draw = ImageDraw.Draw(wm_overlay)
            wm_font = _load_font("arial.ttf", 12)
            wm_text = "GoVisual AI"
            wm_box = wm_draw.textbbox((0, 0), wm_text, font=wm_font)
            wm_w = wm_box[2] - wm_box[0]
            
            wm_draw.rounded_rectangle([w - wm_w - 30, 15, w - 15, 38], radius=6, fill=(15, 15, 15, 160), outline=(57, 255, 20, 100), width=1)
            wm_draw.text((w - wm_w - 22, 20), wm_text, fill=(57, 255, 20, 200), font=wm_font)
            
            result = Image.alpha_composite(result, wm_overlay)
            
            # Save final image as RGB JPEG
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

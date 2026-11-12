import io
import os
from typing import Optional
from PIL import Image, ImageDraw, ImageFont


def _load_font(font_names=("arialbd.ttf", "arial.ttf", "segoeui.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans.ttf"), size=32):
    paths = [
        "C:\\Windows\\Fonts",
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/TTF",
        "/System/Library/Fonts",
        "/System/Library/Fonts/Supplemental",
    ]
    for fn in font_names:
        for p in paths:
            fp = os.path.join(p, fn)
            if os.path.exists(fp):
                try:
                    return ImageFont.truetype(fp, size)
                except Exception:
                    continue
        try:
            return ImageFont.truetype(fn, size)
        except Exception:
            continue
    return ImageFont.load_default()


def apply_exact_text_overlay(
    image_bytes: bytes,
    text: Optional[str],
    position: str = "top-left",
    accent_color: tuple = (232, 182, 111), # GoVisual AI gold
) -> bytes:
    """
    Deterministically overlays exact user-supplied text (e.g. 'NEW ARRIVAL')
    onto the generated photoshoot image using a premium e-commerce badge layout.
    Preserves exact wording, casing, punctuation, dimensions, and image format.
    Does NOT add an overlay if text is empty or whitespace.
    """
    if not text or not text.strip():
        return image_bytes

    clean_text = text.strip()

    try:
        base_img = Image.open(io.BytesIO(image_bytes))
        orig_format = base_img.format or "JPEG"
        canvas = base_img.convert("RGBA")
        width, height = canvas.size
    except Exception:
        return image_bytes

    # Responsive font sizing based on canvas dimensions (e.g. 1024x1024 -> ~30px)
    font_size = max(18, min(42, int(min(width, height) * 0.030)))
    font = _load_font(size=font_size)

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bbox = draw.textbbox((0, 0), clean_text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    pad_x = max(16, int(font_size * 0.65))
    pad_y = max(8, int(font_size * 0.35))
    bw = tw + pad_x * 2
    bh = th + pad_y * 2

    margin = max(24, int(min(width, height) * 0.04))

    # Avoid top-right where brand logo is located
    if position == "top-left":
        bx = margin
        by = margin
    elif position == "bottom-left":
        bx = margin
        by = height - bh - margin
    elif position == "bottom-center":
        bx = (width - bw) // 2
        by = height - bh - margin
    else:
        # Default fallback to top-left to avoid collision with top-right logo
        bx = margin
        by = margin

    # Ensure bounds
    bx = max(margin, min(bx, width - bw - margin))
    by = max(margin, min(by, height - bh - margin))

    # Sophisticated pill badge with frosted dark backing and gold accent outline
    outline_color = (accent_color[0], accent_color[1], accent_color[2], 210)
    bg_color = (15, 12, 10, 225)
    radius = max(6, int(bh * 0.28))

    draw.rounded_rectangle(
        [bx, by, bx + bw, by + bh],
        radius=radius,
        fill=bg_color,
        outline=outline_color,
        width=1,
    )

    # Position text centered within the badge
    tx = bx + pad_x - bbox[0]
    ty = by + pad_y - bbox[1]
    draw.text((tx, ty), clean_text, font=font, fill=(255, 255, 255, 255))

    # Composite onto canvas
    result = Image.alpha_composite(canvas, overlay)

    out = io.BytesIO()
    if orig_format.upper() == "PNG":
        result.save(out, format="PNG")
    else:
        result.convert("RGB").save(out, format="JPEG", quality=95)

    return out.getvalue()

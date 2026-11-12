"""
GoVisual AI — Creative Compositor & Design Overlay Engine
Renders exact logos, headlines, verified benefit chips, and promotional badges
over generated advertising images with professional graphic design hierarchy.
Non-destructive, deterministic, and preserves original image format.
"""
import io
import os
from typing import Optional, List, Tuple
from PIL import Image, ImageDraw, ImageFont

from services.logo_overlay import apply_exact_logo
from services.text_overlay import _load_font


def apply_advertising_overlays(
    image_bytes: bytes,
    logo_bytes: Optional[bytes] = None,
    logo_position: str = "top-right",
    headline_text: Optional[str] = None,
    offer_text: Optional[str] = None,
    feature_chips: Optional[List[str]] = None,
    accent_color: Tuple[int, int, int] = (232, 182, 111), # GoVisual Gold
    primary_color_hex: Optional[str] = None,
) -> bytes:
    """
    Applies complete advertising overlays:
    1. Exact brand logo in designated corner.
    2. Exact headline badge (top-left).
    3. Promotional offer tag (if active).
    4. Verified feature chips (lower-left).
    """
    if not image_bytes:
        return image_bytes

    # Parse primary brand color if available
    resolved_accent = accent_color
    if primary_color_hex and isinstance(primary_color_hex, str):
        hex_clean = primary_color_hex.lstrip("#")
        if len(hex_clean) == 6:
            try:
                r = int(hex_clean[0:2], 16)
                g = int(hex_clean[2:4], 16)
                b = int(hex_clean[4:6], 16)
                resolved_accent = (r, g, b)
            except Exception:
                pass

    current_bytes = image_bytes

    # 1. Overlay Logo
    if logo_bytes:
        try:
            current_bytes = apply_exact_logo(
                current_bytes,
                logo_bytes,
                position=logo_position,
            )
        except Exception as e:
            # Fallback gracefully
            pass

    # 2. Overlay Headline, Offer, and Feature Chips
    try:
        base_img = Image.open(io.BytesIO(current_bytes))
        orig_format = base_img.format or "JPEG"
        canvas = base_img.convert("RGBA")
        width, height = canvas.size
        min_dim = min(width, height)

        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        margin = max(24, int(min_dim * 0.04))

        # ── A. Headline Badge (Top-Left) ─────────────────────────────────────
        if headline_text and str(headline_text).strip():
            clean_head = str(headline_text).strip().upper()
            head_size = max(18, min(42, int(min_dim * 0.030)))
            head_font = _load_font(size=head_size)

            bbox = draw.textbbox((0, 0), clean_head, font=head_font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]

            pad_x = max(16, int(head_size * 0.65))
            pad_y = max(8, int(head_size * 0.35))
            bw = tw + pad_x * 2
            bh = th + pad_y * 2

            bx = margin
            by = margin
            # Bounds
            bx = max(margin, min(bx, width - bw - margin))
            by = max(margin, min(by, height - bh - margin))

            outline_col = (resolved_accent[0], resolved_accent[1], resolved_accent[2], 220)
            bg_col = (12, 10, 8, 230)
            radius = max(6, int(bh * 0.28))

            draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=radius, fill=bg_col, outline=outline_col, width=2)
            draw.text((bx + pad_x, by + pad_y - 1), clean_head, font=head_font, fill=(247, 243, 237, 255))

        # ── B. Offer Tag (Below headline or Top-Left Offset) ──────────────────
        if offer_text and str(offer_text).strip() and str(offer_text).strip().lower() not in ("no offer", "none"):
            clean_offer = str(offer_text).strip().upper()
            offer_size = max(14, min(32, int(min_dim * 0.024)))
            offer_font = _load_font(size=offer_size)

            o_bbox = draw.textbbox((0, 0), clean_offer, font=offer_font)
            o_tw = o_bbox[2] - o_bbox[0]
            o_th = o_bbox[3] - o_bbox[1]

            o_pad_x = max(12, int(offer_size * 0.6))
            o_pad_y = max(6, int(offer_size * 0.3))
            o_bw = o_tw + o_pad_x * 2
            o_bh = o_th + o_pad_y * 2

            # Place below headline if headline exists
            has_head = bool(headline_text and str(headline_text).strip())
            o_bx = margin
            o_by = margin + (bh + 10 if has_head else 0)

            draw.rounded_rectangle(
                [o_bx, o_by, o_bx + o_bw, o_by + o_bh],
                radius=max(4, int(o_bh * 0.3)),
                fill=(resolved_accent[0], resolved_accent[1], resolved_accent[2], 235),
                outline=(255, 255, 255, 180),
                width=1
            )
            # Text on accent badge (dark contrast text)
            draw.text((o_bx + o_pad_x, o_by + o_pad_y - 1), clean_offer, font=offer_font, fill=(15, 12, 10, 255))

        # ── C. Verified Feature Chips (Lower-Left Stack) ──────────────────────
        if feature_chips and len(feature_chips) > 0:
            chip_size = max(12, min(24, int(min_dim * 0.020)))
            chip_font = _load_font(size=chip_size)
            
            # Start from bottom margin upwards
            max_chips = min(3, len(feature_chips))
            active_chips = feature_chips[:max_chips]
            
            chip_height = int(chip_size * 1.8)
            chip_gap = 6
            total_chip_stack_height = len(active_chips) * chip_height + (len(active_chips) - 1) * chip_gap
            
            start_y = height - margin - total_chip_stack_height
            
            for chip_text in active_chips:
                clean_chip = chip_text.strip()
                if not clean_chip:
                    continue
                c_bbox = draw.textbbox((0, 0), f"✓ {clean_chip}", font=chip_font)
                c_tw = c_bbox[2] - c_bbox[0]
                c_bw = c_tw + 20
                c_bh = chip_height
                
                # Frosted glass dark badge with thin gold bullet
                draw.rounded_rectangle(
                    [margin, start_y, margin + c_bw, start_y + c_bh],
                    radius=max(4, int(c_bh * 0.25)),
                    fill=(10, 8, 6, 205),
                    outline=(resolved_accent[0], resolved_accent[1], resolved_accent[2], 120),
                    width=1
                )
                draw.text(
                    (margin + 10, start_y + (c_bh - chip_size) // 2 - 1),
                    f"✓ {clean_chip}",
                    font=chip_font,
                    fill=(240, 235, 228, 240)
                )
                start_y += chip_height + chip_gap

        # Composite overlay onto canvas
        final_canvas = Image.alpha_composite(canvas, overlay)
        out_buf = io.BytesIO()
        final_canvas.convert("RGB").save(out_buf, format=orig_format, quality=95)
        return out_buf.getvalue()

    except Exception as e:
        # If any compositing error occurs, return base image safely without failing
        return current_bytes

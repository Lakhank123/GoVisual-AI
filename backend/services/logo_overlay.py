import io
from typing import Optional

from PIL import Image, ImageOps


_POSITIONS = {
    "top-left": ("left", "top"),
    "top-right": ("right", "top"),
    "bottom-left": ("left", "bottom"),
    "bottom-right": ("right", "bottom"),
}


def apply_exact_logo(
    image_bytes: bytes,
    logo_bytes: Optional[bytes],
    position: str = "top-right",
    margin_ratio: float = 0.04,
) -> bytes:
    """Overlay the supplied logo pixels without touching the generated product."""
    if not logo_bytes:
        return image_bytes

    try:
        canvas = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        logo = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
    except Exception:
        return image_bytes

    max_width = max(1, int(canvas.width * 0.18))
    max_height = max(1, int(canvas.height * 0.12))
    logo.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

    margin = max(12, int(min(canvas.size) * margin_ratio))
    side, vertical = _POSITIONS.get(position, _POSITIONS["top-right"])
    x = margin if side == "left" else canvas.width - logo.width - margin
    y = margin if vertical == "top" else canvas.height - logo.height - margin
    x = max(margin, min(x, canvas.width - logo.width - margin))
    # Composite logo directly using its alpha channel to preserve transparency without harsh artificial boxes
    canvas.alpha_composite(logo, (x, y))

    output = io.BytesIO()
    canvas.convert("RGB").save(output, format="JPEG", quality=95)
    return output.getvalue()

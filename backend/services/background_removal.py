import os
import io
from PIL import Image, ImageFilter

try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("[BgRemoval] rembg package not available. Using fallback background removal.")

def remove_background(image_bytes: bytes) -> bytes:
    """Remove background from product photo, returning a transparent PNG."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        
        # Save step 0: original
        if os.getenv("SAVE_DEBUG_IMAGES", "True").strip().lower() == "true":
            debug_dir = "debug_images"
            os.makedirs(debug_dir, exist_ok=True)
            img.save(os.path.join(debug_dir, "0_original.png"), "PNG")
            
        # Try using rembg
        if REMBG_AVAILABLE:
            print("[BgRemoval] Removing background using rembg...")
            result = remove(img)
            
            buf = io.BytesIO()
            result.save(buf, format="PNG")
            return buf.getvalue()
            
        # Fallback: convert to RGBA
        print("[BgRemoval] Fallback: returning original image (rembg unavailable)")
        rgba_img = img.convert("RGBA")
        buf = io.BytesIO()
        rgba_img.save(buf, format="PNG")
        return buf.getvalue()
        
    except Exception as e:
        print(f"[BgRemoval] Error removing background: {e}")
        return image_bytes

def refine_edges(image_bytes: bytes) -> bytes:
    """Smooth transparent mask edges using edge feathering + a tiny sharpen on RGB channels."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        
        # Check configuration
        if os.getenv("EDGE_REFINEMENT", "True").strip().lower() != "true":
            # Save step 1: transparent (raw)
            if os.getenv("SAVE_DEBUG_IMAGES", "True").strip().lower() == "true":
                debug_dir = "debug_images"
                os.makedirs(debug_dir, exist_ok=True)
                img.save(os.path.join(debug_dir, "1_transparent.png"), "PNG")
            return image_bytes
            
        # Split channels
        r, g, b, a = img.split()
        
        # 1. Edge Feathering (alpha smoothing)
        # Apply a light Gaussian blur to the alpha channel to blend edges smoothly
        a_feathered = a.filter(ImageFilter.GaussianBlur(radius=1.0))
        
        # 2. Tiny RGB Sharpening (to preserve package details and text)
        rgb = Image.merge("RGB", (r, g, b))
        rgb_sharpened = rgb.filter(ImageFilter.SHARPEN)
        
        # Merge back with feathered alpha
        refined = Image.merge("RGBA", (rgb_sharpened.split()[0], rgb_sharpened.split()[1], rgb_sharpened.split()[2], a_feathered))
        
        # Save step 1: transparent (refined)
        if os.getenv("SAVE_DEBUG_IMAGES", "True").strip().lower() == "true":
            debug_dir = "debug_images"
            os.makedirs(debug_dir, exist_ok=True)
            refined.save(os.path.join(debug_dir, "1_transparent.png"), "PNG")
            
        buf = io.BytesIO()
        refined.save(buf, format="PNG")
        return buf.getvalue()
    except Exception as e:
        print(f"[BgRemoval] Edge refinement error: {e}")
        return image_bytes

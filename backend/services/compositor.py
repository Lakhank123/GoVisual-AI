import os
import io
import re
import math
from PIL import Image, ImageDraw, ImageFilter, ImageStat, ImageEnhance

CATEGORY_CONFIGS = {
    "Electronics": {
        "scale": 0.50,
        "shadows": True,
        "shadow_opacity": 150,
        "reflections": True,
        "reflection_opacity": 60,
        "ground_offset": 0.10,
        "contact_shadow": True
    },
    "Jewellery": {
        "scale": 0.45,
        "shadows": True,
        "shadow_opacity": 120,
        "reflections": True,
        "reflection_opacity": 80,
        "ground_offset": 0.08,
        "contact_shadow": True
    },
    "Food & Drinks": {
        "scale": 0.65,
        "shadows": True,
        "shadow_opacity": 180,
        "reflections": False,
        "reflection_opacity": 0,
        "ground_offset": 0.15,
        "contact_shadow": True
    },
    "Clothing / Fashion": {
        "scale": 0.60,
        "shadows": True,
        "shadow_opacity": 140,
        "reflections": False,
        "reflection_opacity": 0,
        "ground_offset": 0.10,
        "contact_shadow": True
    },
    "default": {
        "scale": 0.55,
        "shadows": True,
        "shadow_opacity": 150,
        "reflections": False,
        "reflection_opacity": 0,
        "ground_offset": 0.12,
        "contact_shadow": True
    }
}

def get_category_config(category: str) -> dict:
    if not category:
        return CATEGORY_CONFIGS["default"]
    for cat_name, config in CATEGORY_CONFIGS.items():
        if cat_name.lower() in category.lower() or category.lower() in cat_name.lower():
            return config
    return CATEGORY_CONFIGS["default"]

def _feather_edges(img: Image.Image, radius: int = 1) -> Image.Image:
    """Softens the edges of the transparent product so it doesn't look like a cutout."""
    r, g, b, a = img.split()
    a_blurred = a.filter(ImageFilter.GaussianBlur(radius))
    return Image.merge("RGBA", (r, g, b, a_blurred))

def composite_product(
    product_png_bytes: bytes,
    background_jpg_bytes: bytes,
    category: str = "default"
) -> bytes:
    try:
        use_shadows = os.getenv("SHADOWS", "True").strip().lower() == "true"
        use_reflections = os.getenv("REFLECTIONS", "True").strip().lower() == "true"

        product = Image.open(io.BytesIO(product_png_bytes)).convert("RGBA")
        background = Image.open(io.BytesIO(background_jpg_bytes)).convert("RGBA")
        
        bw, bh = background.size
        
        # 1. Bounding box cropping
        bbox = product.getbbox()
        if bbox:
            product = product.crop(bbox)
        pw, ph = product.size
            
        # 2. Advanced Scaling & Perspective Placement
        config = get_category_config(category)
        base_scale = config["scale"]
        aspect_ratio = pw / ph
        
        if aspect_ratio > 1.25:
            scale_factor = (bw * base_scale * 1.1) / pw
        elif aspect_ratio < 0.75:
            scale_factor = (bh * base_scale * 0.90) / ph
        else:
            scale_factor = min((bw * base_scale) / pw, (bh * base_scale) / ph)
            
        new_pw = max(int(pw * scale_factor), 50)
        new_ph = max(int(ph * scale_factor), 50)
        
        product_resized = product.resize((new_pw, new_ph), Image.Resampling.LANCZOS)
        
        # Feather the edges of the product for realistic blending
        product_resized = _feather_edges(product_resized, radius=1)
        
        # Position slightly lower to match table/ground perspective in AI backgrounds
        pos_x = (bw - new_pw) // 2
        offset_y = int(new_ph * config["ground_offset"])
        pos_y = (bh - new_ph) // 2 + offset_y
        
        # 3. Environmental Light Matching
        bg_region = background.crop([pos_x, pos_y, pos_x + new_pw, pos_y + new_ph])
        bg_stat = ImageStat.Stat(bg_region.convert("L"))
        bg_brightness = bg_stat.mean[0] if bg_stat.mean else 128
        
        region_rgb = bg_region.convert("RGB")
        bg_rgb_stat = ImageStat.Stat(region_rgb)
        bg_mean_color = bg_rgb_stat.mean if bg_rgb_stat.mean else [128, 128, 128]
        
        brightness_ratio = bg_brightness / 128.0
        adjusted_ratio = 1.0 + (brightness_ratio - 1.0) * 0.25 # Slightly stronger matching
        
        product_adjusted = _apply_lighting_tint(product_resized, adjusted_ratio, bg_mean_color)
        
        canvas = Image.new("RGBA", background.size, (0, 0, 0, 0))
        
        # 4. Realistic Soft Contact & Directional Shadows
        if use_shadows and config["shadows"]:
            alpha = product_adjusted.split()[3]
            
            # --- Contact Shadow (Ambient Occlusion style, dark & close) ---
            if config.get("contact_shadow", True):
                contact_w = new_pw
                contact_h = max(int(new_ph * 0.08), 5)
                contact_mask = alpha.resize((contact_w, contact_h), Image.Resampling.LANCZOS)
                contact_mask = contact_mask.filter(ImageFilter.GaussianBlur(radius=3))
                
                c_opacity = int(config["shadow_opacity"] * 1.2)
                c_opacity = min(max(c_opacity, 100), 240)
                
                contact_img = Image.new("RGBA", (contact_w, contact_h), (5, 5, 5, c_opacity))
                cx = pos_x
                cy = pos_y + new_ph - int(contact_h * 0.5)
                canvas.paste(contact_img, (cx, cy), mask=contact_mask)

            # --- Directional Soft Shadow (Spread out) ---
            shadow_w = int(new_pw * 1.1)
            shadow_h = max(int(new_ph * 0.20), 10)
            
            shadow_mask = alpha.resize((shadow_w, shadow_h), Image.Resampling.LANCZOS)
            blur_radius = max(10, int(shadow_h * 0.40))
            shadow_mask_blurred = shadow_mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))
            
            shadow_opacity = int(config["shadow_opacity"] * (1.0 + (255 - bg_brightness) / 512.0))
            shadow_opacity = min(max(shadow_opacity, 40), 200)
            
            shadow_color = (10, 10, 10, shadow_opacity)
            shadow_img = Image.new("RGBA", (shadow_w, shadow_h), shadow_color)
            
            # Offset slightly to the right to simulate directional light from top-left
            shadow_x = pos_x + int(new_pw * 0.05)
            shadow_y = pos_y + new_ph - int(shadow_h * 0.6)
            
            canvas.paste(shadow_img, (shadow_x, shadow_y), mask=shadow_mask_blurred)
            
        # 5. Glossy Reflections
        if use_reflections and config["reflections"] and config["reflection_opacity"] > 0:
            ref_h = int(new_ph * 0.3)
            ref_mask = product_adjusted.split()[3].transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            ref_mask = ref_mask.resize((new_pw, ref_h), Image.Resampling.LANCZOS)
            
            fade = Image.new("L", (new_pw, ref_h))
            fade_draw = ImageDraw.Draw(fade)
            for y in range(ref_h):
                alpha_val = int(config["reflection_opacity"] * (1.0 - (y / ref_h)))
                fade_draw.line([(0, y), (new_pw, y)], fill=alpha_val)
                
            combined_mask = Image.new("L", (new_pw, ref_h))
            combined_mask.paste(ref_mask, mask=fade)
            
            flipped = product_adjusted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            flipped_resized = flipped.resize((new_pw, ref_h), Image.Resampling.LANCZOS)
            flipped_blurred = flipped_resized.filter(ImageFilter.GaussianBlur(radius=3))
            
            ref_x = pos_x
            ref_y = pos_y + new_ph
            
            canvas.paste(flipped_blurred, (ref_x, ref_y), mask=combined_mask)
            
        # 6. Final Composite
        canvas.paste(product_adjusted, (pos_x, pos_y), mask=product_adjusted)
        final_image = Image.alpha_composite(background, canvas)
            
        buf = io.BytesIO()
        final_image.convert("RGB").save(buf, format="JPEG", quality=95)
        return buf.getvalue()
        
    except Exception as e:
        print(f"[Compositor] Blending error: {e}")
        import traceback
        traceback.print_exc()
        return background_jpg_bytes

def _apply_lighting_tint(img: Image.Image, brightness_factor: float, tint_rgb: list) -> Image.Image:
    try:
        # 1. Adjust Brightness & Contrast
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(brightness_factor)
        
        contrast = ImageEnhance.Contrast(img)
        # Add slight contrast punch
        img = contrast.enhance(1.05)
        
        rgba = img.convert("RGBA")
        r, g, b, a = rgba.split()
        
        # 2. Blend an 8% tint of the background dominant color to match environment temperature
        rgb_img = Image.merge("RGB", (r, g, b))
        tint_layer = Image.new("RGB", rgb_img.size, (int(tint_rgb[0]), int(tint_rgb[1]), int(tint_rgb[2])))
        tinted = Image.blend(rgb_img, tint_layer, 0.08)
        
        return Image.merge("RGBA", (tinted.split()[0], tinted.split()[1], tinted.split()[2], a))
    except Exception as e:
        print(f"[Compositor] Lighting tint error: {e}")
        return img

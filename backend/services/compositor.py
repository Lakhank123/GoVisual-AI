import os
import io
import re
import math
from PIL import Image, ImageDraw, ImageFilter, ImageStat

CATEGORY_CONFIGS = {
    "Electronics": {
        "scale": 0.50,
        "shadows": True,
        "shadow_opacity": 130,
        "reflections": True,
        "reflection_opacity": 60,
        "ground_offset": 0.05
    },
    "Jewellery": {
        "scale": 0.45,
        "shadows": True,
        "shadow_opacity": 100,
        "reflections": True,
        "reflection_opacity": 80,
        "ground_offset": 0.05
    },
    "Food & Drinks": {
        "scale": 0.65,
        "shadows": True,
        "shadow_opacity": 160,
        "reflections": False,
        "reflection_opacity": 0,
        "ground_offset": 0.08
    },
    "Clothing / Fashion": {
        "scale": 0.60,
        "shadows": True,
        "shadow_opacity": 120,
        "reflections": False,
        "reflection_opacity": 0,
        "ground_offset": 0.05
    },
    "default": {
        "scale": 0.55,
        "shadows": True,
        "shadow_opacity": 130,
        "reflections": False,
        "reflection_opacity": 0,
        "ground_offset": 0.05
    }
}

def get_category_config(category: str) -> dict:
    """Return specific compositor guidelines for a given product category."""
    if not category:
        return CATEGORY_CONFIGS["default"]
    
    # Try case-insensitive matching
    for cat_name, config in CATEGORY_CONFIGS.items():
        if cat_name.lower() in category.lower() or category.lower() in cat_name.lower():
            print(f"[Compositor] Matched category [{category}] to config [{cat_name}]")
            return config
            
    return CATEGORY_CONFIGS["default"]

def composite_product(
    product_png_bytes: bytes,
    background_jpg_bytes: bytes,
    category: str = "default"
) -> bytes:
    """
    Composite the transparent product PNG onto the generated background.
    Resizes, aligns, tints, and adds shadows/reflections based on category requirements.
    """
    try:
        # Load environment variables (fallback overrides)
        use_shadows = os.getenv("SHADOWS", "True").strip().lower() == "true"
        use_reflections = os.getenv("REFLECTIONS", "True").strip().lower() == "true"
        save_debug = os.getenv("SAVE_DEBUG_IMAGES", "True").strip().lower() == "true"
        debug_dir = "debug_images"
        os.makedirs(debug_dir, exist_ok=True)

        # Load images
        product = Image.open(io.BytesIO(product_png_bytes)).convert("RGBA")
        background = Image.open(io.BytesIO(background_jpg_bytes)).convert("RGBA")
        
        bw, bh = background.size
        pw, ph = product.size
        
        # Save step 2: background
        if save_debug:
            background.save(os.path.join(debug_dir, "2_background.png"), "PNG")
            
        # 1. Bounding box cropping (remove blank margins around product)
        bbox = product.getbbox()
        if bbox:
            product = product.crop(bbox)
            pw, ph = product.size
            
        # 2. Get category rules & intelligent auto-scaling
        config = get_category_config(category)
        base_scale = config["scale"]
        aspect_ratio = pw / ph
        
        # Wide products vs tall products vs square products
        if aspect_ratio > 1.25:
            # Wide object: scale mainly horizontally
            scale_factor = (bw * base_scale * 1.1) / pw
        elif aspect_ratio < 0.75:
            # Tall object: scale mainly vertically
            scale_factor = (bh * base_scale * 0.95) / ph
        else:
            # Square object: bound within constraints
            scale_factor = min((bw * base_scale) / pw, (bh * base_scale) / ph)
            
        new_pw = max(int(pw * scale_factor), 50)
        new_ph = max(int(ph * scale_factor), 50)
        
        product_resized = product.resize((new_pw, new_ph), Image.Resampling.LANCZOS)
        
        # 3. Calculate alignment positioning
        pos_x = (bw - new_pw) // 2
        # Grounding offset dynamically shifts down for food / fashion
        offset_y = int(new_ph * config["ground_offset"])
        pos_y = (bh - new_ph) // 2 + offset_y
        
        # 4. Color and Lighting Matching
        # Extract lighting (average brightness) and dominant color from background region
        bg_region = background.crop([pos_x, pos_y, pos_x + new_pw, pos_y + new_ph])
        bg_stat = ImageStat.Stat(bg_region.convert("L"))
        bg_brightness = bg_stat.mean[0] if bg_stat.mean else 128
        
        # Get dominant color tint from background region
        region_rgb = bg_region.convert("RGB")
        bg_rgb_stat = ImageStat.Stat(region_rgb)
        bg_mean_color = bg_rgb_stat.mean if bg_rgb_stat.mean else [128, 128, 128]
        
        # Adjust product lighting to match background brightness
        # Bright background -> slightly brighten product; Dark background -> slightly dim product
        brightness_ratio = bg_brightness / 128.0
        # Dampen ratio to prevent over-exposure
        adjusted_ratio = 1.0 + (brightness_ratio - 1.0) * 0.15
        
        # Apply brightness adjustment and subtle tinting
        product_adjusted = _apply_lighting_tint(product_resized, adjusted_ratio, bg_mean_color)
        
        # Prepare drawing canvas
        canvas = Image.new("RGBA", background.size, (0, 0, 0, 0))
        
        # 5. Render soft realistic ground shadows
        if use_shadows and config["shadows"]:
            print(f"[Compositor] Drawing ground shadow with base opacity {config['shadow_opacity']}...")
            alpha = product_adjusted.split()[3]
            
            # Create shadow mask: squished vertically to simulate ground projection
            shadow_w = new_pw
            shadow_h = max(int(new_ph * 0.18), 10)
            
            shadow_mask = alpha.resize((shadow_w, shadow_h), Image.Resampling.LANCZOS)
            blur_radius = max(8, int(shadow_h * 0.35))
            shadow_mask_blurred = shadow_mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))
            
            # Dynamic shadow opacity based on background brightness
            shadow_opacity = int(config["shadow_opacity"] * (1.0 + (255 - bg_brightness) / 512.0))
            shadow_opacity = min(max(shadow_opacity, 50), 220)
            
            shadow_color = (10, 10, 10, shadow_opacity)
            shadow_img = Image.new("RGBA", (shadow_w, shadow_h), shadow_color)
            
            # Position shadow at the base of the product
            shadow_x = pos_x
            shadow_y = pos_y + new_ph - int(shadow_h * 0.7)
            
            canvas.paste(shadow_img, (shadow_x, shadow_y), mask=shadow_mask_blurred)
            
            # Save step 3: background + shadow
            if save_debug:
                step3 = Image.alpha_composite(background, canvas)
                step3.save(os.path.join(debug_dir, "3_shadow.png"), "PNG")
        elif save_debug:
            # Standalone shadow file is identical to background if disabled
            background.save(os.path.join(debug_dir, "3_shadow.png"), "PNG")
            
        # 6. Render gloss reflections (Glossy environments/tabletop)
        if use_reflections and config["reflections"] and config["reflection_opacity"] > 0:
            print(f"[Compositor] Drawing glossy reflection with opacity {config['reflection_opacity']}...")
            ref_h = int(new_ph * 0.25)
            ref_mask = product_adjusted.split()[3].transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            ref_mask = ref_mask.resize((new_pw, ref_h), Image.Resampling.LANCZOS)
            
            # Linear fade mask for downward mirror reflection
            fade = Image.new("L", (new_pw, ref_h))
            fade_draw = ImageDraw.Draw(fade)
            for y in range(ref_h):
                alpha_val = int(config["reflection_opacity"] * (1.0 - (y / ref_h)))
                fade_draw.line([(0, y), (new_pw, y)], fill=alpha_val)
                
            combined_mask = Image.new("L", (new_pw, ref_h))
            combined_mask.paste(ref_mask, mask=fade)
            
            # Flip product vertically and blur
            flipped = product_adjusted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            flipped_resized = flipped.resize((new_pw, ref_h), Image.Resampling.LANCZOS)
            flipped_blurred = flipped_resized.filter(ImageFilter.GaussianBlur(radius=4))
            
            ref_x = pos_x
            ref_y = pos_y + new_ph
            
            canvas.paste(flipped_blurred, (ref_x, ref_y), mask=combined_mask)
            
        # 7. Composite product on top of the shadow/reflection layer
        canvas.paste(product_adjusted, (pos_x, pos_y), mask=product_adjusted)
        
        # 8. Merge and finalize
        final_image = Image.alpha_composite(background, canvas)
        
        # Save step 4: final composite image
        if save_debug:
            final_image.save(os.path.join(debug_dir, "4_final.png"), "PNG")
            
        buf = io.BytesIO()
        final_image.convert("RGB").save(buf, format="JPEG", quality=95)
        return buf.getvalue()
        
    except Exception as e:
        print(f"[Compositor] Blending error: {e}")
        import traceback
        traceback.print_exc()
        return background_jpg_bytes

def _apply_lighting_tint(img: Image.Image, brightness_factor: float, tint_rgb: list) -> Image.Image:
    """Adjust image brightness and apply a subtle 4% background environment tint overlay."""
    try:
        # Convert to RGBA
        rgba = img.convert("RGBA")
        r, g, b, a = rgba.split()
        
        # Brightness scaling
        r_adj = r.point(lambda p: min(int(p * brightness_factor), 255))
        g_adj = g.point(lambda p: min(int(p * brightness_factor), 255))
        b_adj = b.point(lambda p: min(int(p * brightness_factor), 255))
        
        adjusted = Image.merge("RGB", (r_adj, g_adj, b_adj))
        
        # Blend a 4% tint of the background dominant color to match the environment lighting
        tint_layer = Image.new("RGB", adjusted.size, (int(tint_rgb[0]), int(tint_rgb[1]), int(tint_rgb[2])))
        tinted = Image.blend(adjusted, tint_layer, 0.04)
        
        # Put alpha channel back
        return Image.merge("RGBA", (tinted.split()[0], tinted.split()[1], tinted.split()[2], a))
    except Exception as e:
        print(f"[Compositor] Lighting tint error: {e}")
        return img

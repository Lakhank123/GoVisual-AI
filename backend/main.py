# ============================================================
# GoVisual AI — FastAPI Backend
# ============================================================
# File structure this creates:
#   backend/
#     main.py              ← this file (run this)
#     requirements.txt
#     .env.example
#     services/
#       brand.py           ← Google Places brand extraction
#       t5_model.py        ← T5 prompt generation
#       gemini.py          ← Gemini image generation
#       watermark.py       ← Pillow watermark overlay
#       storage.py         ← Cloudinary upload
#     ml_model/            ← put your trained T5 model here
#     watermark.png        ← your GoVisual logo PNG
# ============================================================

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import tempfile
import asyncio
from dotenv import load_dotenv

# Always load backend/.env regardless of where uvicorn was started from.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from services.addons.brandbook_service  import BrandBookService
from services.addons.photoshoot_service import PhotoshootService
from services.addons.video_service      import VideoService
from services.addons.instagram_service  import InstagramService
from routes.addon_routes                import router as addon_router
from routes.onboard_routes              import router as onboard_router
from routes.generation_routes           import router as generation_router

app = FastAPI(
    title="GoVisual AI API",
    description="Brand extraction + AI creative generation for local businesses",
    version="1.0.0",
)

app.include_router(addon_router)
app.include_router(onboard_router)
app.include_router(generation_router)

# Static files for generated images
os.makedirs("generated_images", exist_ok=True)
app.mount("/static/generated", StaticFiles(directory="generated_images"), name="generated")
app.mount("/static/videos", StaticFiles(directory="generated_videos"), name="videos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Import services (loaded lazily to avoid slow startup) ────────────────────
from services.brand     import BrandService
from services.t5_model  import PromptService
from services.image_gen import ImageGenService
from services.watermark import WatermarkService
from services.storage   import StorageService

brand_svc     = BrandService()
prompt_svc    = PromptService()
image_svc     = ImageGenService()
watermark_svc = WatermarkService()
storage_svc   = StorageService()

brandbook_service  = BrandBookService()
photoshoot_service = PhotoshootService()
video_service      = VideoService()
instagram_service  = InstagramService()


# ─── MODELS ──────────────────────────────────────────────────────────────────

class BrandLookupResponse(BaseModel):
    places: list
    selected: Optional[dict] = None

class GenerateRequest(BaseModel):
    # Wizard answers
    product:    str
    price:      str
    format:     str        # "1:1" | "9:16" | "16:9" | "4:5"
    image_type: str        # "Instagram post" | "Story" etc
    purpose:    str
    mood:       str
    background: str
    lighting:   str
    offer:      str
    main_text:  str
    language:   str        # "English" | "Hindi" | "Marathi"
    urgency:    str
    # Brand info
    brand_name:   str
    brand_colors: str
    category:     str

class GenerateResponse(BaseModel):
    session_id: str
    images: list           # [{tier, url, prompt_preview}]
    caption: str


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "GoVisual AI API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": prompt_svc.is_loaded(), "image_provider": image_svc.provider_name}


@app.get("/brand-lookup")
async def brand_lookup(q: str, city: str = ""):
    """
    Step 1: Search for business by name + city.
    Returns top 5 Google Places results with photos.
    Frontend shows these as a dropdown for user to select.
    """
    try:
        results = await brand_svc.search(q, city)
        return {"places": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/brand-profile/{place_id}")
async def brand_profile(place_id: str):
    """
    Step 2: Given a confirmed place_id, extract full brand profile.
    Returns: logo_url, photos[], dominant_colors[], website
    This is the "magic moment" screen.
    """
    try:
        profile = await brand_svc.extract_profile(place_id)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-samples")
async def generate_samples(
    place_id: str = Form(...),
    category: str = Form(...),
):
    """
    Step 3: Auto-generate 3 sample creatives using business photos.
    No user input needed — shown immediately after brand setup.
    This is the hook that converts hesitant users.
    """
    try:
        profile = await brand_svc.extract_profile(place_id)
        
        if not profile.get("photos"):
            raise HTTPException(status_code=400, detail="No business photos found")

        # Use first photo as reference image
        photo_url   = profile["photos"][0]["url"]
        photo_bytes = await brand_svc.download_photo(photo_url)

        # Build default input for this category
        default_input = (
            f"product: {category} products | category: {category} | "
            f"price: see store | format: 1:1 | image_type: Instagram post | "
            f"purpose: brand showcase | mood: premium and luxurious | "
            f"background: lifestyle context | lighting: soft natural light | "
            f"offer: no offer | brand: {profile['name']} | "
            f"colors: {' & '.join(profile['colors'][:2])} | "
            f"pose: styled display | reference: provided"
        )

        prompts = prompt_svc.generate(default_input)
        meta = {
            "brand_name": profile["name"],
            "product": category,
            "price": "see store",
            "offer": "no offer",
            "brand_colors": " & ".join(profile["colors"][:2]),
            "category": category
        }
        images  = await _run_generation(prompts[:1], photo_bytes, profile["name"], meta=meta)  # 1 sample

        return {"profile": profile, "sample_images": images}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate", response_model=GenerateResponse)
async def generate(
    # Wizard JSON fields sent as form data
    product:      str = Form(...),
    price:        str = Form(...),
    format:       str = Form(...),
    image_type:   str = Form(...),
    purpose:      str = Form(...),
    mood:         str = Form(...),
    background:   str = Form(...),
    lighting:     str = Form(...),
    offer:        str = Form(...),
    main_text:    str = Form(...),
    language:     str = Form("English"),
    urgency:      str = Form("no"),
    brand_name:   str = Form(...),
    brand_colors: str = Form(...),
    category:     str = Form(...),
    # Product reference image
    product_image: Optional[UploadFile] = File(None),
    reference_image_url: Optional[str] = Form(None),
):
    """
    Main generation endpoint.
    Receives wizard answers + product photo.
    Returns 3 watermarked AI creatives.
    """
    session_id = str(uuid.uuid4())[:8]

    # 1. Read uploaded product image OR selected shop reference image URL
    image_bytes = b""
    if product_image is not None:
        image_bytes = await product_image.read()
        if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Image too large. Max 10MB.")
    elif reference_image_url:
        try:
            image_bytes = await brand_svc.download_photo(reference_image_url)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch reference image: {e}")
    else:
        raise HTTPException(status_code=400, detail="Provide product_image or reference_image_url")

    # 2. Build T5 input string
    input_text = (
        f"product: {product} | category: {category} | "
        f"price: {price} | format: {format} | image_type: {image_type} | "
        f"purpose: {purpose} | mood: {mood} | background: {background} | "
        f"lighting: {lighting} | offer: {offer} | brand: {brand_name} | "
        f"colors: {brand_colors} | pose: dynamic | reference: provided"
    )

    # 3. Generate 3 optimized prompts from T5
    try:
        prompts = prompt_svc.generate(input_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prompt generation failed: {e}")

    # 4. Generate images from Gemini (3 calls, one per prompt)
    try:
        meta = {
            "brand_name": brand_name,
            "product": product,
            "price": price,
            "offer": offer,
            "brand_colors": brand_colors,
            "category": category
        }
        images = await _run_generation(prompts, image_bytes, brand_name, meta=meta)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {e}")

    # 5. Generate caption
    caption = _generate_caption(product, price, offer, purpose, brand_name, language)

    return GenerateResponse(
        session_id=session_id,
        images=images,
        caption=caption,
    )


# ─── HELPER ──────────────────────────────────────────────────────────────────

async def _run_generation(prompts: list, image_bytes: bytes, brand_name: str, meta: dict = None):
    """Run Gemini for each prompt, apply watermark, upload to Cloudinary."""
    tier_labels = ["clean", "professional", "creative"]
    results = []
    print(f"[Generate] Starting generation for {len(prompts)} prompts")

    # 1. Lazy load background removal and compositing services
    from services.background_removal import remove_background, refine_edges
    from services.compositor import composite_product

    # Extract metadata fields
    product_name = meta.get("product", "") if meta else ""
    category = meta.get("category", "default") if meta else "default"

    # Read config flags from environment
    bg_removal_enabled = os.getenv("BACKGROUND_REMOVAL", "True").strip().lower() == "true"

    # Strip background from user product photo once at the beginning
    product_png_bytes = None
    if bg_removal_enabled and image_bytes and len(image_bytes) > 100:
        print("[Generate] Extracting transparent product and refining edges...")
        transparent_bytes = remove_background(image_bytes)
        product_png_bytes = refine_edges(transparent_bytes)

    for i, prompt in enumerate(prompts[:3]):
        try:
            print(f"[Generate] Generating background {i+1}/3 with prompt: {prompt[:100]}...")
            # Generate empty background environment
            # Pass product_name so prompt pre-cleaning strips product references
            gen_bytes = await asyncio.wait_for(
                image_svc.generate(prompt, image_bytes, product_name=product_name),
                timeout=45.0
            )
            print(f"[Generate] Background {i+1} generation returned: {len(gen_bytes) if gen_bytes else 0} bytes")
            if gen_bytes is None:
                print(f"[Generate] Background {i+1} is None, skipping")
                continue

            # 2. Blend the transparent product PNG onto the AI-generated background
            if bg_removal_enabled and product_png_bytes:
                print(f"[Generate] Compositing original product onto background {i+1}...")
                merged_bytes = composite_product(
                    product_png_bytes=product_png_bytes,
                    background_jpg_bytes=gen_bytes,
                    category=category
                )
            else:
                merged_bytes = gen_bytes

            # Apply watermark / creative overlay
            if meta:
                wm_bytes = watermark_svc.apply_creative_overlay(merged_bytes, meta)
            else:
                wm_bytes = watermark_svc.apply(merged_bytes)
            print(f"[Generate] Applied creative watermark overlay, now {len(wm_bytes)} bytes")

            # Upload to cloud or save locally
            url = await storage_svc.upload(
                wm_bytes,
                folder="govisual/generated",
                filename=f"{brand_name.replace(' ', '_')}_{tier_labels[i]}_{uuid.uuid4().hex[:6]}.jpg",
            )
            print(f"[Generate] Uploaded image {i+1} to {url}")

            results.append({
                "tier":           tier_labels[i],
                "label":          ["Basic", "Professional", "Creative"][i],
                "url":            url,
                "prompt_preview": prompt[:120] + "...",
            })
        except asyncio.TimeoutError:
            print(f"[Generate] [FAIL] Timeout generating image {i+1}")
            continue
        except Exception as e:
            print(f"[Generate] [FAIL] Error generating image {i+1}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"[Generate] Generation complete: {len(results)} images generated")
    return results


def _generate_caption(product, price, offer, purpose, brand_name, language):
    """Simple rule-based caption — replace with LLM call for better quality."""
    offer_text = f"🎁 {offer}" if offer != "no offer" else ""
    
    templates = {
        "English":  f"✨ {product} now available at {brand_name}!\n💰 ₹{price} {offer_text}\n📲 Visit us today!\n#ShopLocal #{product.replace(' ', '')}",
        "Hindi":    f"✨ {product} अब उपलब्ध है {brand_name} पर!\n💰 कीमत: ₹{price} {offer_text}\n📲 आज ही आएं!\n#LocalShop",
        "Marathi":  f"✨ {product} आता उपलब्ध {brand_name} येथे!\n💰 किंमत: ₹{price} {offer_text}\n📲 आजच भेट द्या!\n#स्थानिकदुकान",
        "Hinglish": f"✨ {product} ab available hai {brand_name} mein!\n💰 Sirf ₹{price} {offer_text}\n📲 Aaj hi aao!\n#LocalShop",
    }
    return templates.get(language, templates["English"])

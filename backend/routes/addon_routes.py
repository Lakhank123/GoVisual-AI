"""
GoVisual AI — Addon Routes
Paste these routes into your existing backend/main.py

Add these imports at the top of main.py:
    from services.addons.brandbook_service  import BrandBookService
    from services.addons.photoshoot_service import PhotoshootService
    from services.addons.video_service      import VideoService
    from services.addons.instagram_service  import InstagramService

Add these service instances near your other service inits:
    brandbook_service  = BrandBookService()
    photoshoot_service = PhotoshootService()
    video_service      = VideoService()
    instagram_service  = InstagramService()
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import os, uuid, base64

from services.addons.brandbook_service  import BrandBookService
from services.addons.photoshoot_service import PhotoshootService
from services.addons.video_service      import VideoService
from services.addons.instagram_service  import InstagramService

brandbook_service  = BrandBookService()
photoshoot_service = PhotoshootService()
video_service      = VideoService()
instagram_service  = InstagramService()

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# BRAND BOOK
# ─────────────────────────────────────────────────────────────────────────────

class BrandBookRequest(BaseModel):
    businessName:    str
    category:        str
    tagline:         Optional[str] = None
    existingColors:  Optional[list[str]] = None
    logoColors:      Optional[list[str]] = None
    captionsText:    Optional[str] = None
    postImagesCount: Optional[int] = 0
    whatsapp:        Optional[str] = None
    instagram:       Optional[str] = None

@router.post("/api/brandbook")
async def generate_brandbook(req: BrandBookRequest):
    """Generate a complete brand identity kit."""
    try:
        result = await brandbook_service.generate(
            business_name     = req.businessName,
            category          = req.category,
            tagline           = req.tagline,
            existing_colors   = req.existingColors,
            logo_colors       = req.logoColors,
            captions_text     = req.captionsText,
            post_images_count = req.postImagesCount or 0,
            whatsapp          = req.whatsapp,
            instagram         = req.instagram,
        )
        return JSONResponse(content={"success": True, "brandBook": result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCT PHOTOSHOOT
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/photoshoot")
async def generate_photoshoot(
    productImage:  UploadFile = File(...),
    productName:   str        = Form(...),
    avatarId:      str        = Form("studio-plain"),
    backgroundId:  str        = Form("white-studio"),
):
    """Generate 6 professional product photos with optional Indian avatar."""
    try:
        image_bytes = await productImage.read()
        results = await photoshoot_service.generate_photoshoot(
            product_image_bytes = image_bytes,
            product_name        = productName,
            avatar_id           = avatarId,
            background_id       = backgroundId,
        )

        # Save images to static dir and return URLs
        output = []
        for r in results:
            if r["success"]:
                fn   = f"shoot_{uuid.uuid4().hex}.jpg"
                path = os.path.join("generated_images", fn)
                os.makedirs("generated_images", exist_ok=True)
                with open(path, "wb") as f:
                    f.write(base64.b64decode(r["image_b64"]))
                output.append({
                    "label":    r["label"],
                    "url":      f"/static/generated/{fn}",
                    "success":  True,
                })
            else:
                output.append({"label": r["label"], "success": False, "error": r.get("error")})

        return JSONResponse(content={"success": True, "shots": output})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# VIDEO ANIMATION
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/video")
async def generate_video(
    sourceImage:    UploadFile = File(...),
    mainText:       str        = Form(""),
    subText:        str        = Form(""),
    animationStyle: str        = Form("text-reveal"),
    videoFormat:    str        = Form("9:16"),
    musicId:        str        = Form("none"),
):
    """Generate an MP4 reel from a static image."""
    try:
        image_bytes = await sourceImage.read()
        fn          = f"video_{uuid.uuid4().hex}"
        output_path = video_service.generate_video(
            image_bytes      = image_bytes,
            main_text        = mainText,
            sub_text         = subText,
            animation_style  = animationStyle,
            video_format     = videoFormat,
            music_id         = musicId,
            output_filename  = fn,
        )
        filename   = os.path.basename(output_path)
        video_url  = f"/static/videos/{filename}"

        # Copy to static dir
        import shutil
        static_video_dir = "generated_videos"
        os.makedirs(static_video_dir, exist_ok=True)

        return JSONResponse(content={
            "success":   True,
            "videoUrl":  video_url,
            "filename":  filename,
            "format":    videoFormat,
            "style":     animationStyle,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# WEBSITE
# ─────────────────────────────────────────────────────────────────────────────

class MinisiteSuggestRequest(BaseModel):
    shopName: str
    category: str

class MinisiteData(BaseModel):
    shopName:     str
    tagline:      Optional[str] = None
    category:     Optional[str] = None
    whatsapp:     str
    instagram:    Optional[str] = None
    address:      Optional[str] = None
    hours:        Optional[str] = None
    upiId:        Optional[str] = None
    primaryColor: str = "#39ff14"
    products:     Optional[list[dict]] = []

@router.post("/api/minisite/ai-suggest")
async def suggest_minisite_ai(req: MinisiteSuggestRequest):
    """Suggest tagline, color, and products using OpenAI GPT-4o-mini."""
    import httpx, json
    
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not openai_key:
        # Return static fallbacks based on category if no key is configured
        tagline = f"{req.shopName} — Quality and Service You Can Trust"
        colors = {"Electronics": "#1a73e8", "Clothing / Fashion": "#e91e63", "Food & Drinks": "#ff6d00", "Jewellery": "#c9a84c"}
        color = colors.get(req.category, "#39ff14")
        products = [
            {"name": "Premium Product A", "price": "999", "emoji": "📦"},
            {"name": "Exclusive Item B", "price": "1499", "emoji": "📦"},
            {"name": "Best Seller C", "price": "499", "emoji": "📦"},
        ]
        return JSONResponse(content={
            "success": True,
            "tagline": tagline,
            "primaryColor": color,
            "products": products
        })

    prompt = (
        f"You are a professional local business copywriter and web designer. "
        f"Suggest a premium marketing tagline (5-10 words, optionally mixing English and Hindi), "
        f"a primary brand color hex code (premium and matching the category vibe), "
        f"and exactly 3 featured products. Each product must have a name (Indian market specific), "
        f"a realistic typical price in Indian Rupees (numeric string, e.g. '499', without symbol), "
        f"and a matching single product emoji.\n\n"
        f"Business Details:\n"
        f"Name: {req.shopName}\n"
        f"Category: {req.category}\n\n"
        f"Return ONLY a JSON object with these exact keys: "
        f"\"tagline\", \"primaryColor\", \"products\" (where products is an array of objects with keys \"name\", \"price\", \"emoji\")."
    )

    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    headers = {
        "Authorization": f"Bearer {openai_key}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"].strip()
            data = json.loads(content)
            return JSONResponse(content={
                "success": True,
                "tagline": data.get("tagline", ""),
                "primaryColor": data.get("primaryColor", "#39ff14"),
                "products": data.get("products", [])
            })
        else:
            raise HTTPException(status_code=resp.status_code, detail=f"OpenAI error: {resp.text}")
    except Exception as e:
        print(f"Error in suggest_minisite_ai: {e}")
        # Fallback
        return JSONResponse(content={
            "success": True,
            "tagline": f"{req.shopName} — Quality You Can Trust",
            "primaryColor": "#39ff14",
            "products": [
                {"name": "Premium Product A", "price": "999", "emoji": "📦"},
                {"name": "Exclusive Item B", "price": "1499", "emoji": "📦"},
                {"name": "Best Seller C", "price": "499", "emoji": "📦"},
            ]
        })

@router.post("/api/minisite")
async def create_minisite(data: MinisiteData):
    """Generate a website slug and store data."""
    slug = data.shopName.lower().replace(" ", "-").replace(".", "")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")

    # In production: save to database (Supabase / MongoDB / PostgreSQL)
    # For now: save to a JSON file per site
    import json
    sites_dir = "minisites"
    os.makedirs(sites_dir, exist_ok=True)
    site_data = data.dict()
    site_data["slug"] = slug
    with open(os.path.join(sites_dir, f"{slug}.json"), "w") as f:
        json.dump(site_data, f, indent=2)

    return JSONResponse(content={
        "success":  True,
        "slug":     slug,
        "siteUrl":  f"https://govisual.in/{slug}",
        "previewUrl": f"/minisite-preview/{slug}",
    })

@router.get("/s/{slug}")
async def serve_minisite(slug: str):
    """Serve a website by slug."""
    import json
    path = f"minisites/{slug}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Website not found")
    with open(path) as f:
        data = json.load(f)
    # In production: render a server-side HTML template
    # For now: return JSON (frontend Next.js page renders it)
    return JSONResponse(content=data)


# ─────────────────────────────────────────────────────────────────────────────
# INSTAGRAM OAUTH + PUBLISH + ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/instagram/auth-url")
async def ig_auth_url(state: str = "govisual"):
    url = instagram_service.get_auth_url(state)
    return JSONResponse(content={"authUrl": url})

@router.get("/api/instagram/callback")
async def ig_callback(code: str, state: str = ""):
    try:
        tokens = await instagram_service.exchange_code(code)
        ig_user_id, page_token = await instagram_service.get_ig_user_id(tokens["access_token"])
        return JSONResponse(content={
            "success":      True,
            "accessToken":  tokens["access_token"],
            "igUserId":     ig_user_id,
            "expiresIn":    tokens["expires_in"],
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class PublishRequest(BaseModel):
    igUserId:     str
    accessToken:  str
    imageUrl:     str
    caption:      str
    mediaType:    str = "IMAGE"  # IMAGE or REEL
    videoUrl:     Optional[str] = None

@router.post("/api/instagram/publish")
async def ig_publish(req: PublishRequest):
    try:
        if req.mediaType == "REEL" and req.videoUrl:
            result = await instagram_service.publish_reel(req.igUserId, req.accessToken, req.videoUrl, req.caption)
        else:
            result = await instagram_service.publish_image(req.igUserId, req.accessToken, req.imageUrl, req.caption)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/instagram/analytics")
async def ig_analytics(igUserId: str, accessToken: str):
    try:
        data = await instagram_service.get_account_insights(igUserId, accessToken)
        return JSONResponse(content={"success": True, "data": data})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/instagram/post-insights/{media_id}")
async def ig_post_insights(media_id: str, accessToken: str):
    try:
        data = await instagram_service.get_media_insights(media_id, accessToken)
        return JSONResponse(content={"success": True, "insights": data})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, model_validator
from typing import Optional, List, Any
import os, uuid, base64, re, logging, json

logger = logging.getLogger(__name__)

from services.auth import get_current_user
from payments.service import get_credit_guard
from services.storage import StorageService
from services.image_guardrails import sanitize_and_validate_image, moderation_gate, ValidationError
from services.addons.brandbook_service  import BrandBookService
from services.addons.photoshoot_service import PhotoshootService
from services.addons.video_service      import VideoService
from services.addons.instagram_service  import InstagramService

brandbook_service  = BrandBookService()
photoshoot_service = PhotoshootService()
video_service      = VideoService()
instagram_service  = InstagramService()
storage_svc        = StorageService()
security_scheme    = HTTPBearer()

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# BRAND BOOK
# ─────────────────────────────────────────────────────────────────────────────

class BrandBookRequest(BaseModel):
    businessName:    Optional[str] = "My Brand"
    category:        Optional[str] = "Clothing / Fashion"
    tagline:         Optional[str] = None
    existingColors:  Optional[list[str]] = None
    logoColors:      Optional[list[str]] = None
    captionsText:    Optional[str] = None
    postImagesCount: Optional[int] = 0
    whatsapp:        Optional[str] = None
    instagram:       Optional[str] = None
    city:            Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        d = dict(data)

        # Normalize businessName from camelCase or snake_case
        for k in ["business_name", "brand_name", "brandName", "businessName"]:
            if k in d:
                if isinstance(d[k], str):
                    d["businessName"] = d[k].strip()
                else:
                    d["businessName"] = d[k]  # Let Pydantic validate non-string types
                break

        # Normalize category
        for k in ["category", "business_category", "businessCategory"]:
            if k in d:
                if isinstance(d[k], str):
                    d["category"] = d[k].strip()
                else:
                    d["category"] = d[k]  # Let Pydantic validate non-string types
                break

        # Normalize colors (support string, comma-separated list, list of dicts with 'hex', or list of strings)
        for field in ["existingColors", "logoColors"]:
            alt_fields = [field, field.lower()]
            if field == "existingColors":
                alt_fields.extend(["existing_colors", "colors", "brand_colors", "brandColors"])
            elif field == "logoColors":
                alt_fields.extend(["logo_colors"])

            raw_val = None
            for alt in alt_fields:
                if alt in d and d[alt] is not None:
                    raw_val = d[alt]
                    break

            if raw_val is not None:
                if isinstance(raw_val, str):
                    colors = [c.strip() for c in raw_val.replace(";", ",").split(",") if c.strip()]
                    d[field] = colors if colors else None
                elif isinstance(raw_val, list):
                    clean = []
                    for item in raw_val:
                        if isinstance(item, str) and item.strip():
                            clean.append(item.strip())
                        elif isinstance(item, dict) and "hex" in item:
                            clean.append(str(item["hex"]).strip())
                    d[field] = clean if clean else None

        # Normalize postImagesCount (safely parse empty string, null, numeric strings)
        for k in ["postImagesCount", "post_images_count"]:
            if k in d:
                val = d[k]
                if val is None or val == "":
                    d["postImagesCount"] = 0
                elif isinstance(val, (int, float)):
                    d["postImagesCount"] = int(val)
                elif isinstance(val, str):
                    try:
                        d["postImagesCount"] = int(val.strip() or "0")
                    except ValueError:
                        d["postImagesCount"] = 0

        # Normalize instagram
        for k in ["instagram", "instagram_handle", "instagramHandle"]:
            if k in d and d[k] is not None and str(d[k]).strip():
                d["instagram"] = str(d[k]).strip()
                break

        # Normalize whatsapp
        for k in ["whatsapp", "whatsapp_number", "whatsappNumber"]:
            if k in d and d[k] is not None and str(d[k]).strip():
                d["whatsapp"] = str(d[k]).strip()
                break

        return d

@router.post("/api/brandbook")
async def generate_brandbook(req: BrandBookRequest):
    """Generate a complete brand identity kit."""
    try:
        biz_name = (req.businessName or "").strip() or "My Brand"
        cat = (req.category or "").strip() or "Clothing / Fashion"
        result = await brandbook_service.generate(
            business_name     = biz_name,
            category          = cat,
            tagline           = req.tagline,
            existing_colors   = req.existingColors,
            logo_colors       = req.logoColors,
            captions_text     = req.captionsText,
            post_images_count = req.postImagesCount or 0,
            whatsapp          = req.whatsapp,
            instagram         = req.instagram,
            city              = req.city,
        )
        return JSONResponse(content={"success": True, "brandBook": result})
    except Exception as e:
        logger.error("[BrandBook] Generation failure: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


def get_user_or_demo(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(HTTPBearer(auto_error=False)),
) -> Any:
    if credentials and credentials.credentials:
        try:
            return get_current_user(credentials)
        except Exception:
            pass
    return {"id": "00000000-0000-0000-0000-000000000001", "email": "demo@govisual.ai"}


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCT PHOTOSHOOT
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/photoshoot")
async def generate_photoshoot(
    productImage:  UploadFile = File(...),
    productName:   str        = Form(...),
    avatarId:      str        = Form("studio-plain"),
    backgroundId:  str        = Form("white-studio"),
    mode:          str        = Form("model"),
    includeModel:  bool       = Form(True),
    includeLogo:   bool       = Form(False),
    logoImage:     Optional[UploadFile] = File(None),
    price:         Optional[str] = Form(None),
    offer:         Optional[str] = Form(None),
    mood:          Optional[str] = Form(None),
    background:    Optional[str] = Form(None),
    lighting:      Optional[str] = Form(None),
    mainText:      Optional[str] = Form(None),
    language:      Optional[str] = Form("English"),
    urgency:       Optional[str] = Form(None),
    creativeAnswers: Optional[str] = Form(None),
    shotCount:     int        = Form(3),
    user: Any                 = Depends(get_user_or_demo),
):
    """Generate professional product photos with visual reference conditioning and creative question context."""
    requested_count = max(1, shotCount)
    user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else user))
    credit_guard = get_credit_guard()

    # Enforce atomic credit check and monthly run limits
    credit_guard.verify_generation_eligibility(
        user_id=user_id,
        requested_images_count=requested_count,
        auto_correction_requested=False
    )

    run_id = f"shoot_{uuid.uuid4().hex[:10]}"
    credit_guard.reserve_generation_credits(user_id=user_id, amount=requested_count, run_id=run_id)
    credits_settled = False

    try:
        raw_bytes = await productImage.read()
        sanitized_bytes, _, _ = sanitize_and_validate_image(raw_bytes)
        mod_result = moderation_gate.evaluate(sanitized_bytes, context_text=productName, category=mode)
        if not mod_result.allowed:
            raise HTTPException(status_code=400, detail=mod_result.reason)

        sanitized_logo_bytes = None
        if includeLogo and logoImage:
            try:
                raw_logo = await logoImage.read()
                if raw_logo:
                    sanitized_logo_bytes, _, _ = sanitize_and_validate_image(raw_logo)
            except Exception as le:
                logger.warning("[Photoshoot Route] Logo validation warning: %s", le)

        # Parse creative context from parameters or JSON
        creative_ctx: dict = {}
        if creativeAnswers:
            try:
                creative_ctx = json.loads(creativeAnswers)
            except Exception:
                creative_ctx = {}
        if price: creative_ctx["price"] = price
        if offer: creative_ctx["offer"] = offer
        if mood: creative_ctx["mood"] = mood
        if background: creative_ctx["background"] = background
        if lighting: creative_ctx["lighting"] = lighting
        if mainText: creative_ctx["main_text"] = mainText
        elif "mainText" in creative_ctx and not creative_ctx.get("main_text"):
            creative_ctx["main_text"] = creative_ctx["mainText"]
        if language: creative_ctx["language"] = language
        if urgency: creative_ctx["urgency"] = urgency

        effective_bg = background or creative_ctx.get("background") or backgroundId

        results = await photoshoot_service.generate_photoshoot(
            product_image_bytes = sanitized_bytes,
            product_name        = productName,
            avatar_id           = avatarId,
            background_id       = effective_bg,
            mode                = mode,
            include_model       = includeModel,
            shot_count          = requested_count,
            logo_bytes          = sanitized_logo_bytes,
            creative_context    = creative_ctx,
        )

        # Save images to static dir and return URLs
        output = []
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        root_dir = os.path.dirname(backend_dir)
        backend_gen_dir = os.path.join(backend_dir, "generated_images")
        frontend_gen_dir = os.path.join(root_dir, "frontend", "public", "static", "generated")
        os.makedirs(backend_gen_dir, exist_ok=True)
        os.makedirs(frontend_gen_dir, exist_ok=True)

        for r in results:
            if r["success"]:
                fn   = f"shoot_{uuid.uuid4().hex}.jpg"
                img_bytes = base64.b64decode(r["image_b64"])
                with open(os.path.join(backend_gen_dir, fn), "wb") as f:
                    f.write(img_bytes)
                try:
                    with open(os.path.join(frontend_gen_dir, fn), "wb") as f:
                        f.write(img_bytes)
                except Exception as fe:
                    logger.debug("[Photoshoot] Notice copying to frontend static: %s", fe)
                output.append({
                    "label":    r["label"],
                    "url":      f"/static/generated/{fn}",
                    "success":  True,
                })
            else:
                output.append({"label": r["label"], "success": False, "error": r.get("error")})

        # Settle credits for successfully delivered shots (1 image = 1 credit)
        successful_shots = sum(1 for r in results if r.get("success"))
        credit_guard.settle_generation(
            user_id=user_id,
            reserved_amount=requested_count,
            delivered_amount=successful_shots,
            run_id=run_id
        )
        credits_settled = True

        return JSONResponse(content={"success": True, "shots": output})
    except ValidationError as ve:
        if not credits_settled:
            credit_guard.settle_generation(user_id=user_id, reserved_amount=requested_count, delivered_amount=0, run_id=run_id)
        raise HTTPException(status_code=400, detail=ve.message)
    except ValueError as ve:
        if not credits_settled:
            credit_guard.settle_generation(user_id=user_id, reserved_amount=requested_count, delivered_amount=0, run_id=run_id)
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        if not credits_settled:
            credit_guard.settle_generation(user_id=user_id, reserved_amount=requested_count, delivered_amount=0, run_id=run_id)
        raise
    except Exception as e:
        if not credits_settled:
            credit_guard.settle_generation(user_id=user_id, reserved_amount=requested_count, delivered_amount=0, run_id=run_id)
        from services.addons.photoshoot_service import sanitize_error
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))


@router.post("/api/photoshoot/custom-model")
async def create_custom_model(
    name:         str                  = Form(...),
    gender:       str                  = Form("female"),
    age:          int                  = Form(...),
    style:        str                  = Form("Modern Commercial"),
    skinTone:     str                  = Form("medium"),
    hairStyle:    str                  = Form("neat professional"),
    description:  str                  = Form(""),
    modelImage:   Optional[UploadFile] = File(None),
):
    """
    Registers a validated fictional adult model (strictly age 18+).
    Returns trusted model ID and synthesized persona characteristics.
    """
    try:
        ref_bytes = None
        if modelImage:
            raw_ref = await modelImage.read()
            if raw_ref and len(raw_ref) > 0:
                ref_bytes, _, _ = sanitize_and_validate_image(raw_ref)
                mod_result = moderation_gate.evaluate(ref_bytes, context_text=name, is_model_reference=True)
                if not mod_result.allowed:
                    raise HTTPException(status_code=400, detail=mod_result.reason)

        model_entry = photoshoot_service.register_custom_model(
            name=name,
            gender=gender,
            age=age,
            style=style,
            skin_tone=skinTone,
            hair_style=hairStyle,
            description=description,
            reference_image_bytes=ref_bytes,
        )

        return JSONResponse(content={
            "success": True,
            "model": {
                "id": model_entry["id"],
                "name": model_entry["name"],
                "gender": model_entry["gender"],
                "age": model_entry["age"],
                "style": model_entry["style"],
                "description": model_entry["description"],
                "isCustom": True,
            }
        })
    except ValidationError as ve:
        raise HTTPException(status_code=400, detail=ve.message)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        from services.addons.photoshoot_service import sanitize_error
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))


class SavePhotoshootAssetRequest(BaseModel):
    imageB64: Optional[str] = None
    imageUrl: Optional[str] = None
    targetBrandId: Optional[str] = None
    productName: str
    shotLabel: Optional[str] = None
    label: Optional[str] = None
    mode: str = "model"
    tags: Optional[dict] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_save_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if "label" in d and not d.get("shotLabel"):
            d["shotLabel"] = str(d["label"])
        if "shotLabel" in d and not d.get("label"):
            d["label"] = str(d["shotLabel"])
        if not d.get("shotLabel") and not d.get("label"):
            d["shotLabel"] = "Shot"
        return d


@router.post("/api/photoshoot/save-asset")
@router.post("/api/photoshoot/save-to-library")
async def save_photoshoot_asset(
    req: SavePhotoshootAssetRequest,
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
):
    """
    Securely saves a generated photoshoot asset to persistent storage and records
    metadata in brand_asset_library for the verified brand.
    Enforces server-side authentication and brand ownership authorization.
    Rejects unauthorized cross-brand writes.
    """
    # 1. Extract verified authenticated user ID
    auth_user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
    if not auth_user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    # 2. Verify brand ownership: user must own targetBrandId
    # If targetBrandId is not supplied, default safely to the authenticated user ID
    target_brand_id = (req.targetBrandId or auth_user_id).strip()
    if not target_brand_id:
        target_brand_id = auth_user_id

    if target_brand_id != auth_user_id:
        # Cross-brand ownership check: verify against brand_core_identity using user-scoped token
        token = credentials.credentials
        try:
            from supabase import create_client
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_key = os.environ.get("SUPABASE_ANON_KEY")
            if supabase_url and supabase_key:
                client = create_client(supabase_url, supabase_key)
                client.options.headers["Authorization"] = f"Bearer {token}"
                brand_query = client.table("brand_core_identity").select("business_id").eq("business_id", target_brand_id).execute()
                if not brand_query.data:
                    raise HTTPException(
                        status_code=403,
                        detail="Access denied: Authenticated user is not authorized to write assets for this brand."
                    )
            else:
                raise HTTPException(status_code=403, detail="Access denied: Unauthorized cross-brand write.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=403, detail=f"Access denied: Brand authorization verification failed: {str(e)}")

    # 3. Resolve image bytes (from base64 payload or local generated url or remote storage url)
    image_bytes = None
    if req.imageB64:
        try:
            image_bytes = base64.b64decode(req.imageB64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data provided.")
    elif req.imageUrl:
        clean_url = req.imageUrl.strip()
        # 1. Match local static paths: /static/generated/<filename> or http://<host>/static/generated/<filename>
        match = re.search(r"/static/generated/([^/?#]+)", clean_url)
        if match:
            filename = os.path.basename(match.group(1))
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            root_dir = os.path.dirname(backend_dir)
            candidates = [
                os.path.join(backend_dir, "generated_images", filename),
                os.path.join(root_dir, "frontend", "public", "static", "generated", filename),
                os.path.join(root_dir, "generated_images", filename),
                os.path.join("generated_images", filename),
                os.path.join("static", "generated", filename),
                os.path.join(os.path.dirname(__file__), "..", "generated_images", filename),
                os.path.join(os.path.dirname(__file__), "..", "static", "generated", filename),
                os.path.join(os.path.dirname(__file__), "..", "..", "generated_images", filename),
                os.path.join(os.path.dirname(__file__), "..", "..", "static", "generated", filename),
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    try:
                        with open(candidate, "rb") as f:
                            image_bytes = f.read()
                        if image_bytes:
                            break
                    except Exception as fe:
                        logger.warning("[Photoshoot] Error reading candidate %s: %s", candidate, fe)
        elif clean_url.startswith("data:"):
            try:
                header, b64_part = clean_url.split(",", 1)
                image_bytes = base64.b64decode(b64_part)
            except Exception as de:
                logger.warning("[Photoshoot] Error decoding data URL in imageUrl: %s", de)
        elif clean_url.startswith("http://") or clean_url.startswith("https://"):
            try:
                import httpx
                with httpx.Client(timeout=10) as hclient:
                    resp = hclient.get(clean_url)
                    if resp.status_code == 200:
                        image_bytes = resp.content
            except Exception as e:
                logger.warning("[Photoshoot] Failed downloading remote imageUrl %s: %s", clean_url, e)

        if not image_bytes:
            raise HTTPException(status_code=400, detail=f"Image file not found for URL: {req.imageUrl}")
    else:
        raise HTTPException(status_code=400, detail="Either imageB64 or imageUrl must be provided.")

    if not image_bytes or len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="Asset image data is empty or corrupted.")

    # Validate image data through technical guardrails
    try:
        image_bytes, detected_fmt, _ = sanitize_and_validate_image(image_bytes)
    except ValidationError as ve:
        raise HTTPException(status_code=400, detail=ve.message)

    # 4. Save file to persistent storage (Cloudinary or local generated_images)
    fn = f"photoshoot_{uuid.uuid4().hex}.jpg"
    folder = f"brands/{target_brand_id}/photoshoots"
    try:
        stored_url = await storage_svc.upload(image_bytes, folder, fn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persistent storage upload failed: {str(e)}")

    if not stored_url:
        raise HTTPException(status_code=500, detail="Storage service failed to return a persistent asset URL.")

    # 5. Persist asset metadata into brand_asset_library
    token = credentials.credentials
    try:
        from supabase import create_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            raise RuntimeError("Database configuration missing: SUPABASE_URL/SUPABASE_ANON_KEY not set.")

        client = create_client(supabase_url, supabase_key)
        client.options.headers["Authorization"] = f"Bearer {token}"

        # Ensure brand_core_identity row exists to satisfy foreign key constraint
        try:
            client.table("brand_core_identity").upsert({
                "business_id": target_brand_id,
                "brand_name": req.productName or "My Brand",
            }, on_conflict="business_id").execute()
        except Exception as e:
            logger.info("[Photoshoot] brand_core_identity ensure check: %s", e)

        # Check for existing asset to prevent duplicates
        try:
            existing = client.table("brand_asset_library").select("id, business_id, asset_url, tags").eq("business_id", target_brand_id).eq("asset_url", stored_url).execute()
            if existing.data and len(existing.data) > 0:
                saved_record = existing.data[0]
                return JSONResponse(content={
                    "success": True,
                    "asset": {
                        "id": saved_record.get("id"),
                        "businessId": target_brand_id,
                        "assetUrl": stored_url,
                        "assetType": "product_image",
                        "label": req.shotLabel,
                        "productName": req.productName,
                        "mode": req.mode,
                        "fileSizeBytes": len(image_bytes),
                    }
                })
        except Exception as dup_err:
            logger.debug("[Photoshoot] Duplicate check: %s", dup_err)

        asset_metadata = {
            "business_id": target_brand_id,
            "asset_type": "product_image",
            "asset_url": stored_url,
            "file_size_bytes": len(image_bytes),
            "mime_type": "image/jpeg",
            "tags": {
                "product_name": req.productName,
                "shot_label": req.shotLabel,
                "mode": req.mode,
                **(req.tags or {}),
            },
            "source": "generated",
        }

        try:
            db_resp = client.table("brand_asset_library").insert(asset_metadata).execute()
        except Exception as insert_err:
            logger.warning("[Photoshoot] Error inserting full asset_metadata, retrying with core columns: %s", insert_err)
            db_resp = client.table("brand_asset_library").insert({
                "business_id": target_brand_id,
                "asset_type": "product_image",
                "asset_url": stored_url,
            }).execute()

        if not db_resp.data:
            raise RuntimeError("Failed to insert asset metadata into brand_asset_library.")

        saved_record = db_resp.data[0]
        return JSONResponse(content={
            "success": True,
            "asset": {
                "id": saved_record.get("id"),
                "businessId": target_brand_id,
                "assetUrl": stored_url,
                "assetType": "product_image",
                "label": req.shotLabel,
                "productName": req.productName,
                "mode": req.mode,
                "fileSizeBytes": len(image_bytes),
            }
        })
    except HTTPException:
        raise
    except Exception as e:
        # Storage Failure Cleanup: Remove orphan file from local storage if database insert fails
        try:
            if stored_url and "/static/generated/" in stored_url:
                orphan_fn = os.path.basename(stored_url)
                orphan_path = os.path.join("generated_images", orphan_fn)
                if os.path.exists(orphan_path):
                    os.remove(orphan_path)
        except Exception as cleanup_err:
            logger.warning("[Photoshoot] Failed cleaning up orphan storage asset: %s", cleanup_err)

        # Report: durable persistence requires both asset and metadata
        raise HTTPException(
            status_code=500,
            detail=f"Durable database persistence failed for asset: {str(e)}"
        )


@router.get("/api/photoshoot/library-assets")
async def get_photoshoot_library_assets(
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
):
    """
    Retrieves all persisted photoshoot assets for the authenticated user from brand_asset_library.
    Enforces user authentication and tenant isolation.
    """
    auth_user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
    if not auth_user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    token = credentials.credentials
    try:
        from supabase import create_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            return JSONResponse(content={"success": True, "assets": []})

        client = create_client(supabase_url, supabase_key)
        client.options.headers["Authorization"] = f"Bearer {token}"

        # Fetch product_image assets owned by this user
        try:
            resp = (
                client.table("brand_asset_library")
                .select("id, business_id, asset_url, asset_type, tags, created_at")
                .eq("business_id", auth_user_id)
                .order("created_at", desc=True)
                .execute()
            )
        except Exception as select_err:
            logger.info("[Photoshoot] Falling back to base brand_asset_library columns: %s", select_err)
            resp = (
                client.table("brand_asset_library")
                .select("id, business_id, asset_url, asset_type, created_at")
                .eq("business_id", auth_user_id)
                .order("created_at", desc=True)
                .execute()
            )

        assets = []
        for row in resp.data or []:
            tags = row.get("tags") or {}
            # Include photoshoot assets
            if tags.get("mode") in ("model", "product_only", "lifestyle") or tags.get("shot_label") or row.get("asset_type") == "product_image":
                assets.append({
                    "id": str(row.get("id")),
                    "type": "photoshoot",
                    "url": row.get("asset_url"),
                    "metadata": {
                        "title": f"{tags.get('product_name', 'Photoshoot')} — {tags.get('shot_label', 'Shot')}",
                        "format": "image/jpeg",
                        "mode": tags.get("mode") or "model",
                        "caption": tags.get("caption"),
                        "hashtags": tags.get("hashtags"),
                        "tags": tags,
                    },
                    "createdAt": row.get("created_at"),
                })

        return JSONResponse(content={"success": True, "assets": assets})
    except Exception as e:
        logger.warning("[Photoshoot] Error fetching library assets: %s", e)
        return JSONResponse(content={"success": True, "assets": []})




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
# WEBSITE (MINISITE)
# ─────────────────────────────────────────────────────────────────────────────

class MinisiteSuggestRequest(BaseModel):
    shopName: str
    category: str
    audience: Optional[str] = None
    objective: Optional[str] = None
    differentiators: Optional[str] = None
    visualDirection: Optional[str] = None

class MinisiteData(BaseModel):
    shopName:          str
    slug:              Optional[str] = None
    tagline:           Optional[str] = None
    heroHeadline:      Optional[str] = None
    heroDescription:   Optional[str] = None
    heroBadge:         Optional[str] = None
    category:          Optional[str] = None
    whatsapp:          str
    instagram:         Optional[str] = None
    address:           Optional[str] = None
    hours:             Optional[str] = None
    upiId:             Optional[str] = None
    primaryColor:      str = "#E8B66F"
    secondaryColor:    Optional[str] = "#14100D"
    accentColor:       Optional[str] = None
    theme:             Optional[str] = "bold_contrast"
    brandStory:        Optional[str] = None
    differentiators:   Optional[List[Any]] = []
    logoUrl:           Optional[str] = None
    showLogo:          Optional[bool] = True
    primaryCtaText:    Optional[str] = "Order on WhatsApp"
    secondaryCtaText:  Optional[str] = "Explore Products"
    phone:             Optional[str] = None
    products:          Optional[List[dict]] = []
    featuredProductId: Optional[str] = None


def _get_deterministic_minisite_suggestions(req: MinisiteSuggestRequest) -> dict:
    """Provides high-quality, category-specific brand copy and layout themes without live AI calls."""
    cat = (req.category or "").strip().lower()

    if "electronic" in cat or "tech" in cat or "mobile" in cat:
        return {
            "theme": "bold_contrast",
            "primaryColor": "#38bdf8",
            "secondaryColor": "#09090b",
            "tagline": f"Next-Gen Audio & Tech by {req.shopName}",
            "heroHeadline": "Engineered for Performance. Built for Life.",
            "heroDescription": f"Discover precision-crafted audio and next-generation tech essentials from {req.shopName}, backed by trusted warranty and fast store dispatch.",
            "heroBadge": "⚡ OFFICIAL BRAND STORE",
            "primaryCta": "Order on WhatsApp",
            "secondaryCta": "View Collection",
            "brandStory": f"At {req.shopName}, we bring cutting-edge electronics and audio innovation directly to our community with guaranteed authentic quality and responsive local support.",
            "differentiators": [
                {"title": "100% Genuine Products", "desc": "Official manufacturer warranty and verified quality on all devices."},
                {"title": "Instant WhatsApp Assist", "desc": "Chat directly with product specialists for instant advice and orders."},
                {"title": "Fast Store Dispatch", "desc": "Same-day local pickup and rapid delivery right to your doorstep."}
            ],
            "products": [
                {"name": "Wireless Noise-Cancelling Earbuds", "price": "1999", "badge": "Bestseller", "description": "Crisp acoustic drivers with 32h playback and IPX5 water resistance.", "emoji": "🎧"},
                {"name": "Fast-Charge Power Bank 20000mAh", "price": "1299", "badge": "New Arrival", "description": "Dual USB-C 22.5W high-speed charging for all your devices.", "emoji": "🔋"},
                {"name": "Magnetic Wireless Charging Dock", "price": "899", "badge": "Popular", "description": "Sleek metallic desktop charger with intelligent temperature control.", "emoji": "⚡"}
            ]
        }
    elif "jewel" in cat:
        return {
            "theme": "luxury_editorial",
            "primaryColor": "#C49B5A",
            "secondaryColor": "#14100D",
            "tagline": f"Timeless Elegance & Heritage by {req.shopName}",
            "heroHeadline": "Every Piece Tells a Story of Grace and Purity.",
            "heroDescription": f"Exquisite handcrafted ornaments and hallmarked designs from {req.shopName}, celebrating life's most precious occasions.",
            "heroBadge": "✨ CERTIFIED HALLMARKED",
            "primaryCta": "Enquire on WhatsApp",
            "secondaryCta": "View Catalogue",
            "brandStory": f"{req.shopName} stands for heirloom craftsmanship and hallmarked purity. Our master artisans create timeless jewellery that turns precious moments into enduring memories.",
            "differentiators": [
                {"title": "Certified Purity Guarantee", "desc": "100% BIS hallmarked gold and certified authentic gemstones."},
                {"title": "Artisanal Heritage Craft", "desc": "Handcrafted by experienced artisans with intricate attention to detail."},
                {"title": "Bespoke Custom Orders", "desc": "Work directly with our design consultants to craft your dream jewellery."}
            ],
            "products": [
                {"name": "Antique Temple Gold-Plated Choker", "price": "3499", "badge": "Heritage Pick", "description": "Intricate classical motifs with premium hand-set accents.", "emoji": "💍"},
                {"name": "Solitaire Crystal Pendant with Chain", "price": "1299", "badge": "Bestseller", "description": "Brilliant cut centerpiece with hypoallergenic silver chain.", "emoji": "✨"},
                {"name": "Handcrafted Kundan Statement Earrings", "price": "2199", "badge": "Festive Special", "description": "Traditional royal craftsmanship with pearl drop details.", "emoji": "💎"}
            ]
        }
    elif "cloth" in cat or "fashion" in cat or "apparel" in cat:
        return {
            "theme": "luxury_editorial",
            "primaryColor": "#E8B66F",
            "secondaryColor": "#14100D",
            "tagline": f"Elevated Everyday Style by {req.shopName}",
            "heroHeadline": "Refined Fashion, Crafted for Contemporary Living.",
            "heroDescription": f"Explore handpicked apparel and curated style collections at {req.shopName}. Premium fabrics tailored for lasting comfort.",
            "heroBadge": "🏷️ NEW SEASON DROPS",
            "primaryCta": "Shop on WhatsApp",
            "secondaryCta": "Explore Catalogue",
            "brandStory": f"Founded with a passion for distinctive style, {req.shopName} crafts wardrobe essentials combining timeless aesthetics, premium textiles, and effortless everyday comfort.",
            "differentiators": [
                {"title": "Handcrafted Excellence", "desc": "Carefully selected fabrics and meticulous stitching in every garment."},
                {"title": "Exclusive Limited Runs", "desc": "Distinctive silhouettes and fresh drops curated for our clientele."},
                {"title": "Hassle-Free Exchange", "desc": "Easy size exchanges and personalized fitting guidance on WhatsApp."}
            ],
            "products": [
                {"name": "Textured Linen Blend Casual Shirt", "price": "1499", "badge": "New Drop", "description": "Breathable luxury linen with tailored modern fit.", "emoji": "👔"},
                {"name": "Tailored Relaxed Fit Chinos", "price": "1799", "badge": "Essential", "description": "Stretch cotton twill with comfortable mid-rise cut.", "emoji": "👖"},
                {"name": "Classic Crew Neck Cotton Tee", "price": "699", "badge": "Top Value", "description": "Heavyweight 220 GSM combed cotton with ribbed collar.", "emoji": "👕"}
            ]
        }
    elif "food" in cat or "drink" in cat or "cafe" in cat or "bakery" in cat:
        return {
            "theme": "warm_vibrant",
            "primaryColor": "#f97316",
            "secondaryColor": "#1c110a",
            "tagline": f"Authentic Flavours & Warm Hospitality by {req.shopName}",
            "heroHeadline": "Savour Every Bite. Made Fresh with Love.",
            "heroDescription": f"Authentic recipes, farm-fresh ingredients, and hygienic preparation daily at {req.shopName}.",
            "heroBadge": "🌿 FRESH DAILY",
            "primaryCta": "Order on WhatsApp",
            "secondaryCta": "View Menu",
            "brandStory": f"At {req.shopName}, we believe great food brings people together. Every recipe is prepared fresh daily using pure spices, uncompromised hygiene, and warm hospitality.",
            "differentiators": [
                {"title": "Fresh Daily Preparation", "desc": "Prepared fresh to order with zero artificial preservatives."},
                {"title": "Strict Hygiene Standards", "desc": "Certified clean kitchen practices and contactless packaging."},
                {"title": "Instant WhatsApp Delivery", "desc": "Hot and fresh meals delivered straight to your location."}
            ],
            "products": [
                {"name": "Signature House Dum Biryani", "price": "349", "badge": "Chef Special", "description": "Slow-cooked aromatic basmati rice with tender spiced layers.", "emoji": "🍛"},
                {"name": "Artisanal Paneer Tikka Platter", "price": "289", "badge": "Bestseller", "description": "Char-grilled fresh cottage cheese infused with rich marinade.", "emoji": "🍢"},
                {"name": "Signature Cold Brew Coffee", "price": "179", "badge": "Refreshing", "description": "16-hour slow steep with hints of chocolate and caramel.", "emoji": "☕"}
            ]
        }
    elif "home" in cat or "decor" in cat or "furniture" in cat or "living" in cat:
        return {
            "theme": "clean_minimal",
            "primaryColor": "#10b981",
            "secondaryColor": "#0b1117",
            "tagline": f"Modern Living & Thoughtful Spaces by {req.shopName}",
            "heroHeadline": "Designed for Calm. Curated for Contemporary Living.",
            "heroDescription": f"Transform your space with handpicked furnishings and functional aesthetics from {req.shopName}.",
            "heroBadge": "🌿 CONTEMPORARY LIVING",
            "primaryCta": "Order on WhatsApp",
            "secondaryCta": "Explore Catalogue",
            "brandStory": f"At {req.shopName}, we design for serenity and utility. Every piece blends modern minimalism with durable materials.",
            "differentiators": [
                {"title": "Minimalist Design", "desc": "Timeless clean lines tailored for modern interiors."},
                {"title": "Sustainable Quality", "desc": "Responsibly sourced materials built for longevity."},
                {"title": "Direct Consultation", "desc": "Interior styling guidance and custom sizing on WhatsApp."}
            ],
            "products": [
                {"name": "Minimalist Ceramic Planter & Stand", "price": "899", "badge": "Bestseller", "description": "Matte ceramic cylinder with natural beech wood stand.", "emoji": "🪴"},
                {"name": "Artisanal Linen Throw Blanket", "price": "1499", "badge": "Cozy Living", "description": "Woven organic cotton with breathable soft drape.", "emoji": "🛋️"},
                {"name": "Warm Ambient Wooden Desk Lamp", "price": "1999", "badge": "Popular", "description": "Dimmable LED with solid teak wood geometric base.", "emoji": "💡"}
            ]
        }
    else:
        return {
            "theme": "clean_minimal",
            "primaryColor": "#E8B66F",
            "secondaryColor": "#14100D",
            "tagline": f"Quality, Care, and Value You Can Count On by {req.shopName}",
            "heroHeadline": "Exceptional Products, Crafted with Care.",
            "heroDescription": f"Welcome to {req.shopName}. We bring you premium selection, fair pricing, and personalized service.",
            "heroBadge": "⭐ VERIFIED BUSINESS",
            "primaryCta": "Enquire on WhatsApp",
            "secondaryCta": "Explore Store",
            "brandStory": f"Serving our customers with integrity, {req.shopName} is committed to offering verified products, dependable quality, and attentive service.",
            "differentiators": [
                {"title": "Guaranteed Quality", "desc": "Every product is personally inspected before reaching you."},
                {"title": "Direct Contact", "desc": "Reach out directly on WhatsApp for custom requests and questions."},
                {"title": "Prompt Local Service", "desc": "Quick responses and reliable fulfillment every time."}
            ],
            "products": [
                {"name": "Featured Product A", "price": "999", "badge": "Popular", "description": "High-grade craftsmanship with reliable performance.", "emoji": "📦"},
                {"name": "Premium Selection B", "price": "1499", "badge": "Bestseller", "description": "Top customer choice with verified durability.", "emoji": "⭐"},
                {"name": "Essential Value C", "price": "499", "badge": "Best Value", "description": "Outstanding everyday value without compromise.", "emoji": "🏷️"}
            ]
        }


@router.post("/api/minisite/ai-suggest")
async def suggest_minisite_ai(req: MinisiteSuggestRequest):
    """Suggest tagline, hero copy, theme, and products using OpenAI or category deterministic fallback."""
    import httpx
    
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not openai_key:
        fallback = _get_deterministic_minisite_suggestions(req)
        return JSONResponse(content={"success": True, **fallback})

    prompt = (
        f"You are an elite e-commerce brand architect and web copywriter for direct-to-consumer and local brands (similar in punchy quality to boAt, Apple, or premium boutique brands).\n"
        f"Suggest a landing page design and marketing copy for the following business:\n"
        f"Business Name: {req.shopName}\n"
        f"Category: {req.category}\n"
        f"Target Audience: {req.audience or 'General consumers'}\n"
        f"Objective: {req.objective or 'WhatsApp orders & enquiries'}\n"
        f"Key Differentiators: {req.differentiators or 'High quality, fair price, trusted service'}\n"
        f"Visual Direction: {req.visualDirection or 'Premium & bold'}\n\n"
        f"Return ONLY a JSON object with these exact keys:\n"
        f"- \"tagline\": A punchy brand slogan (5-8 words)\n"
        f"- \"heroHeadline\": High-impact hero headline (3-7 words, powerful and commercial)\n"
        f"- \"heroDescription\": Compelling 1-2 sentence sub-headline\n"
        f"- \"heroBadge\": 2-3 word uppercase badge (e.g. '⚡ OFFICIAL STORE')\n"
        f"- \"primaryColor\": Hex color matching the vibe (e.g. '#38bdf8', '#E8B66F', '#f97316', '#a78bfa')\n"
        f"- \"theme\": One of 'bold_contrast', 'luxury_editorial', 'clean_minimal', 'warm_vibrant'\n"
        f"- \"primaryCta\": Short action text (e.g. 'Order on WhatsApp', 'Enquire Now')\n"
        f"- \"brandStory\": 2 sentences communicating authentic brand ethos\n"
        f"- \"differentiators\": array of 3 objects with 'title' (3-4 words) and 'desc' (under 12 words)\n"
        f"- \"products\": array of 3 sample products with 'name', 'price' (numeric string), 'badge', 'description', 'emoji'"
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
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"].strip()
            data = json.loads(content)
            return JSONResponse(content={
                "success": True,
                "tagline": data.get("tagline", ""),
                "heroHeadline": data.get("heroHeadline", ""),
                "heroDescription": data.get("heroDescription", ""),
                "heroBadge": data.get("heroBadge", "⚡ FEATURED STORE"),
                "primaryColor": data.get("primaryColor", "#E8B66F"),
                "theme": data.get("theme", "bold_contrast"),
                "primaryCta": data.get("primaryCta", "Order on WhatsApp"),
                "brandStory": data.get("brandStory", ""),
                "differentiators": data.get("differentiators", []),
                "products": data.get("products", [])
            })
    except Exception as e:
        logger.warning("[Minisite AI] Fallback triggered due to error: %s", e)

    fallback = _get_deterministic_minisite_suggestions(req)
    return JSONResponse(content={"success": True, **fallback})


def sanitize_minisite_slug(raw_name: str) -> str:
    """Generates a clean, safe, path-traversal-free slug."""
    cleaned = raw_name.strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned).strip("-")
    cleaned = re.sub(r"-+", "-", cleaned)
    if not cleaned:
        cleaned = "storefront"
    return cleaned[:64]


@router.post("/api/minisite")
async def create_minisite(data: MinisiteData):
    """Generate a sanitized website slug, validate payload, and store landing page configuration."""
    if getattr(data, "slug", None) and str(data.slug).strip():
        slug = sanitize_minisite_slug(str(data.slug))
    else:
        slug = sanitize_minisite_slug(data.shopName)

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sites_dir = os.path.join(backend_dir, "minisites")
    os.makedirs(sites_dir, exist_ok=True)

    site_data = data.model_dump() if hasattr(data, "model_dump") else (data.dict() if hasattr(data, "dict") else dict(data))
    site_data["slug"] = slug
    site_path = os.path.join(sites_dir, f"{slug}.json")

    with open(site_path, "w", encoding="utf-8") as f:
        json.dump(site_data, f, indent=2)

    return JSONResponse(content={
        "success":    True,
        "slug":       slug,
        "siteUrl":    f"https://govisual.in/{slug}",
        "previewUrl": f"/minisite-preview/{slug}",
        "data":       site_data,
    })


@router.get("/s/{slug}")
async def serve_minisite(slug: str):
    """Serve a website configuration by slug with strict path traversal checks."""
    clean_slug = re.sub(r"[^a-z0-9\-]", "", slug.lower().strip())[:64]
    if not clean_slug or clean_slug != slug.lower().strip() or ".." in slug:
        raise HTTPException(status_code=400, detail="Invalid website slug.")

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sites_dir = os.path.abspath(os.path.join(backend_dir, "minisites"))
    target_path = os.path.abspath(os.path.join(sites_dir, f"{clean_slug}.json"))

    # Security: Ensure target path is strictly within sites_dir
    if not target_path.startswith(sites_dir):
        raise HTTPException(status_code=403, detail="Access denied.")

    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Website not found.")

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except Exception as e:
        logger.error("[Minisite] Error reading site %s: %s", clean_slug, e)
        raise HTTPException(status_code=500, detail="Error loading website configuration.")
    # In production: render a server-side HTML template
    # For now: return JSON (frontend Next.js page renders it)
    return JSONResponse(content=data)


# ─────────────────────────────────────────────────────────────────────────────
# CAPTION ALTERNATIVES (Requirement E)
# ─────────────────────────────────────────────────────────────────────────────

class CaptionAlternativesRequest(BaseModel):
    product: str
    brandName: Optional[str] = "Our Shop"
    category: Optional[str] = ""
    shotLabel: Optional[str] = ""
    tone: Optional[str] = "Premium"
    offer: Optional[str] = ""
    purpose: Optional[str] = ""
    language: Optional[str] = "English"
    visualDescription: Optional[str] = ""
    background: Optional[str] = ""
    lighting: Optional[str] = ""


@router.post("/api/captions/alternatives")
async def get_caption_alternatives(req: CaptionAlternativesRequest):
    """
    Generate 3 distinct, image-aware caption alternatives (punchy, story, offer)
    with editable copy and hashtags for creatives and photoshoots.
    """
    from services.caption_service import generate_caption_alternatives
    res = generate_caption_alternatives(
        product=req.product,
        brand_name=req.brandName or "Our Shop",
        category=req.category or "",
        shot_label=req.shotLabel or "",
        tone=req.tone or "Premium",
        offer=req.offer or "",
        purpose=req.purpose or "",
        language=req.language or "English",
        visual_description=req.visualDescription or "",
        background=req.background or "",
        lighting=req.lighting or "",
    )
    return JSONResponse(content=res)



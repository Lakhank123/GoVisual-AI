"""
GoVisual AI — Instagram Routes
FastAPI endpoints for Instagram Professional OAuth connection, status inspection,
disconnection, and creative direct publishing.
"""
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from services.auth import get_current_user
from database.instagram_db import instagram_repo, SQLiteInstagramRepository
from services.token_encryption import TokenEncryptionService
from services.addons.instagram_service import InstagramService
from services.addons.instagram_exceptions import (
    InstagramError,
    UnsupportedAccountTypeError,
    TokenExchangeError,
    PublicMediaStorageError,
    MediaContainerError,
    PublishingError,
)

from services.caption_service import (
    generate_instagram_post_content,
    generate_instagram_strategy,
)

router = APIRouter(prefix="/api/instagram", tags=["instagram"])

# Lazy / singleton access
_encryption_svc: Optional[TokenEncryptionService] = None
_instagram_svc: Optional[InstagramService] = None

def get_encryption_svc() -> TokenEncryptionService:
    global _encryption_svc
    if _encryption_svc is None:
        _encryption_svc = TokenEncryptionService()
    return _encryption_svc

def get_instagram_svc() -> InstagramService:
    global _instagram_svc
    if _instagram_svc is None:
        _instagram_svc = InstagramService()
    return _instagram_svc


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class PublishRequest(BaseModel):
    candidate_id: str
    caption: str
    hashtags: Optional[str] = None
    image_url: Optional[str] = None


class SuggestContentRequest(BaseModel):
    product: str
    brand_name: str
    category: Optional[str] = ""
    mood: Optional[str] = ""
    purpose: Optional[str] = ""
    offer: Optional[str] = ""
    language: Optional[str] = "English"


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/strategy")
async def get_instagram_strategy(
    category: str = Query("Retail"),
    business_name: str = Query("Your Shop"),
    goal: str = Query("Increase Sales"),
    user: dict = Depends(get_current_user),
):
    """
    Returns an actionable, non-technical Instagram content strategy guide
    tailored to the business type and goals.
    """
    try:
        strategy = generate_instagram_strategy(
            category=category,
            business_name=business_name,
            goal=goal,
        )
        return JSONResponse(content={"success": True, "data": strategy})
    except Exception as e:
        from services.addons.photoshoot_service import sanitize_error
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))


@router.post("/suggest-content")
async def suggest_instagram_content(
    req: SuggestContentRequest,
    user: dict = Depends(get_current_user),
):
    """
    Suggests structured caption, hashtags, and creative audio recommendations
    using available brand, product, and campaign context.
    Protected by server-side authentication.
    """
    try:
        content = await generate_instagram_post_content(
            product=req.product.strip() if req.product else "Product",
            brand_name=req.brand_name.strip() if req.brand_name else "GoVisual",
            category=(req.category or "").strip(),
            mood=(req.mood or "").strip(),
            purpose=(req.purpose or "").strip(),
            offer=(req.offer or "").strip(),
            language=(req.language or "English").strip(),
        )
        return JSONResponse(content={"success": True, "data": content})
    except Exception as e:
        from services.addons.photoshoot_service import sanitize_error
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))


@router.get("/connect")
async def connect_instagram(
    user: dict = Depends(get_current_user),
    ig_service: InstagramService = Depends(get_instagram_svc),
):
    """
    Initiates Instagram OAuth:
    1. Authenticates current GoVisual user.
    2. Generates secure random OAuth state.
    3. Saves state against user ID.
    4. Returns the Meta/Instagram authorization URL.
    """
    user_id = str(user.id if hasattr(user, "id") else user.get("id"))
    state = secrets.token_urlsafe(32)
    instagram_repo.save_oauth_state(state, user_id)

    try:
        auth_url = ig_service.get_auth_url(state)
        return JSONResponse(content={"auth_url": auth_url})
    except InstagramError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/callback", response_class=HTMLResponse)
async def instagram_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_reason: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    ig_service: InstagramService = Depends(get_instagram_svc),
    enc_service: TokenEncryptionService = Depends(get_encryption_svc),
):
    """
    Receives OAuth callback from Meta:
    1. Validates and consumes state exactly once (CSRF & replay protection).
    2. Exchanges code for token & upgrades to long-lived credential.
    3. Verifies account is Business or Creator.
    4. Encrypts token and stores connection.
    5. Returns communication bridge to close popup and notify parent window.
    """
    # Check if user denied or Meta returned an error
    if error:
        err_msg = error_description or error_reason or error
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message=f"Instagram connection cancelled or denied: {err_msg}"
        ), status_code=400)

    if not code or not state:
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message="Missing authorization code or state parameter."
        ), status_code=400)

    # Validate and consume state
    user_id = instagram_repo.consume_oauth_state(state)
    if not user_id:
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message="Invalid or expired OAuth session. Please try connecting again."
        ), status_code=400)

    # Exchange code for access token
    try:
        token_data = await ig_service.exchange_code(code)
    except TokenExchangeError as e:
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message=f"Token exchange failed: {str(e)}"
        ), status_code=400)
    except Exception as e:
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message=f"Failed to authenticate with Meta: {str(e)}"
        ), status_code=500)

    access_token = token_data["access_token"]
    expires_in = token_data.get("expires_in", 5184000)

    # Validate Account Type (Business or Creator required)
    try:
        account_info = await ig_service.get_account_info(access_token)
    except UnsupportedAccountTypeError as e:
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message=str(e)
        ), status_code=400)
    except Exception as e:
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message=f"Failed to verify Instagram account: {str(e)}"
        ), status_code=500)

    # Encrypt token before persisting
    try:
        encrypted_token = enc_service.encrypt(access_token)
    except Exception as e:
        return HTMLResponse(content=_render_popup_response(
            success=False,
            error_message=f"Token security processing error: {str(e)}"
        ), status_code=500)

    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    ).isoformat()

    # Persist in isolated SQLite
    instagram_repo.upsert_connection(
        user_id=user_id,
        instagram_user_id=account_info["instagram_user_id"],
        username=account_info["username"],
        account_type=account_info["account_type"],
        access_token_encrypted=encrypted_token,
        token_expires_at=expires_at,
        status="active"
    )

    return HTMLResponse(content=_render_popup_response(
        success=True,
        username=account_info["username"]
    ))


@router.get("/status")
async def instagram_status(
    user: dict = Depends(get_current_user),
):
    """
    Returns current Instagram connection status for the authenticated user.
    Never returns access tokens or secrets.
    """
    user_id = str(user.id if hasattr(user, "id") else user.get("id"))
    connection = instagram_repo.get_connection(user_id)

    if not connection or connection.get("status") != "active":
        return JSONResponse(content={"connected": False, "status": "disconnected"})

    # Check token expiration if available
    expires_at_str = connection.get("token_expires_at")
    if expires_at_str:
        try:
            if "T" in expires_at_str:
                exp_dt = datetime.fromisoformat(expires_at_str)
            else:
                exp_dt = datetime.strptime(expires_at_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp_dt:
                return JSONResponse(content={
                    "connected": False,
                    "status": "expired",
                    "message": "Instagram token expired. Please reconnect."
                })
        except Exception:
            pass

    return JSONResponse(content={
        "connected": True,
        "username": connection.get("username"),
        "instagram_user_id": connection.get("instagram_user_id"),
        "account_type": connection.get("account_type"),
        "connected_at": connection.get("connected_at"),
        "status": "active"
    })


@router.post("/disconnect")
async def disconnect_instagram(
    user: dict = Depends(get_current_user),
):
    """
    Disconnects Instagram for the authenticated user.
    Does not affect Supabase user, Brand Brain, or creatives.
    """
    user_id = str(user.id if hasattr(user, "id") else user.get("id"))
    success = instagram_repo.disconnect(user_id)
    return JSONResponse(content={
        "success": True,
        "message": "Instagram account disconnected."
    })


@router.post("/publish")
async def publish_to_instagram(
    req: PublishRequest,
    user: dict = Depends(get_current_user),
    ig_service: InstagramService = Depends(get_instagram_svc),
    enc_service: TokenEncryptionService = Depends(get_encryption_svc),
):
    """
    Publishes a selected GoVisual creative candidate to Instagram:
    1. Authenticates user & checks active Instagram connection.
    2. Decrypts access token in memory.
    3. Resolves public HTTPS JPEG URL (via Cloudinary if local).
    4. Creates media container and polls status with bounded retries.
    5. Publishes media container.
    6. Fetches and returns the actual live post permalink.
    """
    user_id = str(user.id if hasattr(user, "id") else user.get("id"))
    connection = instagram_repo.get_connection(user_id)

    if not connection or connection.get("status") != "active":
        raise HTTPException(
            status_code=400,
            detail="Instagram account is not connected. Please connect your account first."
        )

    # Decrypt access token in memory
    try:
        access_token = enc_service.decrypt(connection["access_token_encrypted"])
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Authentication token decryption failed. Please reconnect your Instagram account."
        )

    ig_user_id = connection["instagram_user_id"]

    # Build final caption including hashtags
    full_caption = req.caption or ""
    if req.hashtags and req.hashtags.strip():
        tags = req.hashtags.strip()
        if not full_caption:
            full_caption = tags
        elif tags not in full_caption:
            full_caption = f"{full_caption}\n\n{tags}"

    # Determine image URL
    image_url = req.image_url or ""
    if not image_url:
        raise HTTPException(
            status_code=400,
            detail="No image URL provided for creative candidate."
        )

    # Execute direct publishing flow
    try:
        result = await ig_service.publish_creative(
            ig_user_id=ig_user_id,
            access_token=access_token,
            image_url=image_url,
            caption=full_caption,
        )
        return JSONResponse(content={
            "success":   True,
            "media_id":  result["media_id"],
            "permalink": result["permalink"],
            "username":  connection.get("username"),
        })
    except PublicMediaStorageError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except MediaContainerError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except PublishingError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except InstagramError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected publishing error: {str(e)}")


# ─── Popup HTML Helper ───────────────────────────────────────────────────────

def _render_popup_response(success: bool, username: str = "", error_message: str = "") -> str:
    """Renders HTML that communicates with the opener window and auto-closes."""
    if success:
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Instagram Connected — GoVisual AI</title>
    <style>
        body {{
            background: #060a06;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }}
        .card {{
            background: #0d160d;
            border: 1px solid #1a2a1a;
            border-radius: 16px;
            padding: 32px;
            max-width: 360px;
        }}
        .badge {{
            color: #39ff14;
            font-size: 32px;
            margin-bottom: 12px;
        }}
        h2 {{ margin: 0 0 8px; font-size: 18px; }}
        p {{ color: #888; font-size: 14px; margin-bottom: 16px; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">✓</div>
        <h2>Instagram Connected!</h2>
        <p>Connected to <strong>@{username}</strong></p>
        <p>This window will close automatically...</p>
    </div>
    <script>
        if (window.opener) {{
            window.opener.postMessage({{
                type: 'INSTAGRAM_AUTH_SUCCESS',
                username: '{username}'
            }}, '*');
            setTimeout(() => window.close(), 1200);
        }} else {{
            window.location.href = '/dashboard?instagram=connected';
        }}
    </script>
</body>
</html>"""
    else:
        # Sanitize error message for HTML/JS
        safe_msg = error_message.replace("'", "\\'").replace('"', '&quot;')
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Instagram Connection Failed — GoVisual AI</title>
    <style>
        body {{
            background: #060a06;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }}
        .card {{
            background: #160d0d;
            border: 1px solid #2a1a1a;
            border-radius: 16px;
            padding: 32px;
            max-width: 380px;
        }}
        .badge {{
            color: #ff4d4f;
            font-size: 32px;
            margin-bottom: 12px;
        }}
        h2 {{ margin: 0 0 8px; font-size: 18px; }}
        p {{ color: #bbb; font-size: 13px; line-height: 1.5; margin-bottom: 20px; }}
        button {{
            background: #333;
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            cursor: pointer;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">⚠</div>
        <h2>Connection Failed</h2>
        <p>{safe_msg}</p>
        <button onclick="window.close()">Close Window</button>
    </div>
    <script>
        if (window.opener) {{
            window.opener.postMessage({{
                type: 'INSTAGRAM_AUTH_ERROR',
                error: '{safe_msg}'
            }}, '*');
        }}
    </script>
</body>
</html>"""

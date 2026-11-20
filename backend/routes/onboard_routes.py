import os
import traceback
import uuid
from fastapi import APIRouter, HTTPException, Depends, Security, Request, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.extraction import DataSourceService
from services.intelligence import get_intelligence_provider
from services.brand_brain_service import BrandBrainService
from database.local_workspace_store import LocalWorkspaceStore
from services.auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/brand/onboard", tags=["Onboarding"])

extraction_svc = DataSourceService()
intelligence_svc = get_intelligence_provider()
brand_brain_svc = BrandBrainService()
auth_security = HTTPBearer(auto_error=True)
optional_security = HTTPBearer(auto_error=False)

class ExtractRequest(BaseModel):
    google_place_id: Optional[str] = None
    website_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    manual_data: Optional[Dict[str, Any]] = None

class AnalyseRequest(BaseModel):
    raw_data: Dict[str, Any]

class SaveRequest(BaseModel):
    brand_brain_session: Dict[str, Any]

class SyncRequest(BaseModel):
    brandProfile: Optional[Dict[str, Any]] = None
    workspace: Optional[Dict[str, Any]] = None


@router.post("/extract")
async def extract_signals(req: ExtractRequest):
    """
    Extracts data from multiple public sources in parallel.
    Degrades gracefully if a source fails.
    """
    try:
        raw_data = await extraction_svc.extract_all(
            google_place_id=req.google_place_id,
            website_url=req.website_url,
            instagram_handle=req.instagram_handle,
            manual_data=req.manual_data
        )
        return {"success": True, "raw_data": raw_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyse")
async def analyse_signals(req: AnalyseRequest):
    """
    Passes merged raw data to the Brand Intelligence Provider (Groq).
    Returns field-level confidence schema.
    """
    try:
        analysis_result = await intelligence_svc.analyze_brand_signals(req.raw_data)
        return {"success": True, "analysis": analysis_result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_brand_brain(
    req: SaveRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security),
):
    """
    Finalizes the Brand Brain session and writes to persistent storage.
    If the client is authenticated, binds strictly to the verified user's ID and email.
    If unauthenticated, generates an isolated session ID to permit pre-login wizard onboarding.
    """
    try:
        token = credentials.credentials if credentials else None
        user_id = None
        email = None

        if token:
            try:
                from services.auth import verify_supabase_jwt
                user = verify_supabase_jwt(token)
                user_id = str(user.id)
                email = getattr(user, "email", "")
            except HTTPException:
                raise
            except Exception:
                pass

        if not user_id:
            # Generate unauthenticated session UUID (cannot impersonate another user)
            user_id = f"anon_{uuid.uuid4().hex[:12]}"
            email = None

        business_id = await brand_brain_svc.save_brand_brain(
            req.brand_brain_session,
            token=token,
            user_id=user_id,
            email=email
        )
        return {"success": True, "business_id": business_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/identity")
async def get_brand_identity(
    user: AuthenticatedUser = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(auth_security),
):
    """
    Retrieves the persisted Brand Brain strictly for the authenticated user.
    Unauthenticated or cross-tenant access is rejected.
    """
    token = credentials.credentials
    user_id = str(user.id)
    user_email = user.email or ""

    brain = await brand_brain_svc.get_brand_brain(user_id, token=token, email=user_email)
    return {"success": True, "brand": brain}


@router.get("/sync")
async def get_workspace_sync(
    user: AuthenticatedUser = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(auth_security),
):
    """
    Returns full persistent workspace data strictly for the verified authenticated user.
    Cross-user access via query parameters is prevented.
    """
    token = credentials.credentials
    user_id = str(user.id)
    user_email = user.email or ""

    brand = await brand_brain_svc.get_brand_brain(user_id, token=token, email=user_email)
    user_data = LocalWorkspaceStore.get_user(user_id) or (LocalWorkspaceStore.get_user(user_email) if user_email else None)
    assets = LocalWorkspaceStore.get_library_assets(user_id) or (LocalWorkspaceStore.get_library_assets(user_email) if user_email else [])
    counts = LocalWorkspaceStore.get_generation_count(user_id) or (LocalWorkspaceStore.get_generation_count(user_email) if user_email else 0)

    return {
        "success": True,
        "brand": brand,
        "user": user_data,
        "assets": assets,
        "generation_count": counts,
        "has_completed_onboarding": bool(brand.get("core", {}).get("brand_name") or user_data)
    }


@router.post("/sync")
async def post_workspace_sync(
    req: SyncRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(auth_security),
):
    """
    Saves and synchronizes workspace data strictly for the verified authenticated user.
    """
    token = credentials.credentials
    user_id = str(user.id)
    email = user.email or ""

    if req.brandProfile:
        await brand_brain_svc.save_brand_brain(req.brandProfile, token=token, user_id=user_id, email=email)

    if req.workspace:
        LocalWorkspaceStore.save_user(user_id, req.workspace, email=email)

    return {"success": True, "message": "Workspace synchronized successfully"}

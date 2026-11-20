import os
import traceback
from fastapi import APIRouter, HTTPException, Depends, Security, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.extraction import DataSourceService
from services.intelligence import get_intelligence_provider
from services.brand_brain_service import BrandBrainService
from database.local_workspace_store import LocalWorkspaceStore

router = APIRouter(prefix="/brand/onboard", tags=["Onboarding"])

extraction_svc = DataSourceService()
intelligence_svc = get_intelligence_provider()
brand_brain_svc = BrandBrainService()
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
    email: Optional[str] = None
    user_id: Optional[str] = None
    brandProfile: Optional[Dict[str, Any]] = None
    workspace: Optional[Dict[str, Any]] = None

@router.post("/extract")
async def extract_signals(req: ExtractRequest):
    """
    Extracts data from multiple sources in parallel.
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
        print("Received analyse request")
        print("Merged brand signals")
        analysis_result = await intelligence_svc.analyze_brand_signals(req.raw_data)
        print("Returning JSON")
        return {"success": True, "analysis": analysis_result}
    except Exception as e:
        print(f"Exception during /analyse: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_brand_brain(
    req: SaveRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security),
):
    """
    Finalizes the Brand Brain session and writes to persistent storage and Supabase.
    Binds to authenticated user's ID and email when logged in.
    """
    try:
        token = credentials.credentials if credentials else None
        user_id = None
        email = None
        if token:
            try:
                from services.auth import get_current_user
                user = get_current_user(credentials)
                user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
                email = getattr(user, "email", "") or (user.get("email") if isinstance(user, dict) else "")
            except Exception:
                pass

        if not email and isinstance(req.brand_brain_session, dict):
            email = req.brand_brain_session.get("email")

        business_id = await brand_brain_svc.save_brand_brain(
            req.brand_brain_session,
            token=token,
            user_id=user_id,
            email=email
        )
        return {"success": True, "business_id": business_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/identity")
async def get_brand_identity(
    email: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security),
):
    """
    Retrieves the persisted Brand Brain for the authenticated user or query email.
    """
    token = credentials.credentials if credentials else None
    user_id = None
    user_email = email

    if credentials and credentials.credentials:
        try:
            from services.auth import get_current_user
            user = get_current_user(credentials)
            user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
            user_email = user_email or getattr(user, "email", "") or (user.get("email") if isinstance(user, dict) else "")
        except Exception:
            pass

    target_id = user_id or user_email
    if not target_id:
        raise HTTPException(status_code=401, detail="Authentication credentials or email required.")

    brain = await brand_brain_svc.get_brand_brain(target_id, token=token, email=user_email)
    return {"success": True, "brand": brain}

@router.get("/sync")
async def get_workspace_sync(
    email: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security),
):
    """
    Returns full persistent workspace data (brand, user, library, counts) by email or user ID.
    """
    token = credentials.credentials if credentials else None
    resolved_email = email
    resolved_id = user_id

    if credentials and credentials.credentials:
        try:
            from services.auth import get_current_user
            user = get_current_user(credentials)
            resolved_id = resolved_id or str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
            resolved_email = resolved_email or getattr(user, "email", "") or (user.get("email") if isinstance(user, dict) else "")
        except Exception:
            pass

    identifier = resolved_id or resolved_email or ""
    brand = await brand_brain_svc.get_brand_brain(identifier, token=token, email=resolved_email)
    user_data = LocalWorkspaceStore.get_user(identifier) or (LocalWorkspaceStore.get_user(resolved_email) if resolved_email else None)
    assets = LocalWorkspaceStore.get_library_assets(identifier) or (LocalWorkspaceStore.get_library_assets(resolved_email) if resolved_email else [])
    counts = LocalWorkspaceStore.get_generation_count(identifier) or (LocalWorkspaceStore.get_generation_count(resolved_email) if resolved_email else 0)

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
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security),
):
    """
    Saves and synchronizes workspace data to persistent storage.
    """
    token = credentials.credentials if credentials else None
    user_id = req.user_id
    email = req.email

    if credentials and credentials.credentials:
        try:
            from services.auth import get_current_user
            user = get_current_user(credentials)
            user_id = user_id or str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
            email = email or getattr(user, "email", "") or (user.get("email") if isinstance(user, dict) else "")
        except Exception:
            pass

    target_id = user_id or email or "default_user"
    if req.brandProfile:
        await brand_brain_svc.save_brand_brain(req.brandProfile, token=token, user_id=target_id, email=email)

    if req.workspace:
        LocalWorkspaceStore.save_user(target_id, req.workspace, email=email)

    return {"success": True, "message": "Workspace synchronized successfully"}

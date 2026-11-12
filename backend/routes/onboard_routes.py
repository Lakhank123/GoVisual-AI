import os
import traceback
from fastapi import APIRouter, HTTPException, Depends, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any

from services.extraction import DataSourceService
from services.intelligence import get_intelligence_provider
from services.brand_brain_service import BrandBrainService

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
    Finalizes the Brand Brain session and writes to Supabase via BrandBrainService.
    Binds to authenticated user's ID when logged in.
    """
    try:
        token = credentials.credentials if credentials else None
        user_id = None
        if token:
            try:
                from services.auth import get_current_user
                user = get_current_user(credentials)
                user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
            except Exception:
                pass

        business_id = await brand_brain_svc.save_brand_brain(
            req.brand_brain_session,
            token=token,
            user_id=user_id
        )
        return {"success": True, "business_id": business_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/identity")
async def get_brand_identity(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security),
):
    """
    Retrieves the persisted Brand Brain for the authenticated user.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication credentials required.")

    token = credentials.credentials
    from services.auth import get_current_user
    user = get_current_user(credentials)
    user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else ""))
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    brain = await brand_brain_svc.get_brand_brain(user_id, token=token)
    return {"success": True, "brand": brain}

import uuid
import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from services.auth import get_current_user
from services.generation_engine.api.models import (
    DispatchGenerationRequest, DispatchGenerationResponse,
    JobStatusResponse, AssetManifestResponse, AssetListResponse,
    ProviderListResponse, HealthResponse, ErrorResponse, ErrorDetail
)
from services.generation_engine.api.errors import (
    GenerationEngineError, ProviderUnavailableError, ValidationFailedError
)

router = APIRouter(prefix="/api/v1/generation", tags=["generation_engine"])

def create_base_response(request: Request):
    return {
        "request_id": request.state.request_id if hasattr(request.state, "request_id") else str(uuid.uuid4()),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

async def generation_engine_exception_handler(request: Request, exc: GenerationEngineError):
    status_code = 500
    if isinstance(exc, ValidationFailedError):
        status_code = 422
    elif isinstance(exc, ProviderUnavailableError):
        status_code = 503
        
    base = create_base_response(request)
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            success=False,
            error=ErrorDetail(
                code=exc.__class__.__name__,
                message=exc.message,
                details=exc.details
            ),
            **base
        ).dict()
    )

@router.post("/dispatch", response_model=DispatchGenerationResponse)
async def dispatch_generation(req: DispatchGenerationRequest, request: Request, user: dict = Depends(get_current_user)):
    # Mocking idempotency check and dispatch
    # Implementation will check DB for cached generation_hash or existing session_id job
    base = create_base_response(request)
    return DispatchGenerationResponse(
        job_id=str(uuid.uuid4()),
        generation_id=str(uuid.uuid4()),
        status="queued",
        is_cached=False,
        **base
    )

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, request: Request, user: dict = Depends(get_current_user)):
    base = create_base_response(request)
    return JobStatusResponse(
        job_id=job_id,
        generation_id=str(uuid.uuid4()),
        status="processing",
        progress=50,
        **base
    )

@router.get("/manifests/{generation_id}", response_model=AssetManifestResponse)
async def get_manifest(generation_id: str, request: Request, user: dict = Depends(get_current_user)):
    base = create_base_response(request)
    return AssetManifestResponse(
        manifest={"generation_id": generation_id, "assets": []},
        **base
    )

@router.get("/assets/{generation_id}", response_model=AssetListResponse)
async def get_assets(generation_id: str, request: Request, user: dict = Depends(get_current_user)):
    base = create_base_response(request)
    return AssetListResponse(
        generation_id=generation_id,
        assets=[],
        **base
    )

@router.get("/providers", response_model=ProviderListResponse)
async def get_providers(request: Request, user: dict = Depends(get_current_user)):
    base = create_base_response(request)
    return ProviderListResponse(
        providers=[],
        **base
    )

@router.get("/health", response_model=HealthResponse)
async def get_health(request: Request):
    base = create_base_response(request)
    return HealthResponse(
        health={
            "status": "healthy",
            "provider_health": {},
            "database_connected": True,
            "storage_connected": True,
            "dispatcher_status": "active",
            "cache_status": "active"
        },
        **base
    )

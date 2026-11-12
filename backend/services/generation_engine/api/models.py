from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# Requests
class DispatchGenerationRequest(BaseModel):
    session_id: str
    target_provider: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)
    correlation_id: Optional[str] = None

# Standard Error Response
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
    request_id: str
    timestamp: str

# Standard Success Responses
class BaseSuccessResponse(BaseModel):
    success: bool = True
    request_id: str
    timestamp: str

class DispatchGenerationResponse(BaseSuccessResponse):
    job_id: str
    generation_id: str
    status: str
    is_cached: bool = False

class JobStatusResponse(BaseSuccessResponse):
    job_id: str
    generation_id: str
    status: str
    progress: int

class AssetResponse(BaseModel):
    asset_id: str
    asset_type: str
    stage: str
    url: str

class AssetListResponse(BaseSuccessResponse):
    generation_id: str
    assets: List[AssetResponse]

class AssetManifestResponse(BaseSuccessResponse):
    manifest: Dict[str, Any]

class ProviderInfo(BaseModel):
    name: str
    enabled: bool
    capabilities: Dict[str, Any]
    model: str
    version: str
    health: str
    estimated_latency_ms: int

class ProviderListResponse(BaseSuccessResponse):
    providers: List[ProviderInfo]

class HealthReport(BaseModel):
    status: str
    provider_health: Dict[str, str]
    database_connected: bool
    storage_connected: bool
    dispatcher_status: str
    cache_status: str

class HealthResponse(BaseSuccessResponse):
    health: HealthReport

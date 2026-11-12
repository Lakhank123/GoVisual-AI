from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class GenerationSettings(BaseModel):
    aspect_ratio: str = "1:1"
    quality: str = "standard"
    target_format: str = "png"
    # additional generic generation settings

class ProviderMetadata(BaseModel):
    latency_ms: int = 0
    cost: float = 0.0
    seed: Optional[int] = None
    model_version: Optional[str] = None
    provider_name: str = ""

class GenerationMetadata(BaseModel):
    generation_hash: Optional[str] = None
    provider_metadata: Optional[ProviderMetadata] = None
    additional_data: Dict[str, Any] = Field(default_factory=dict)

class AssetDescriptor(BaseModel):
    asset_id: str
    asset_type: str  # e.g. "image", "video"
    stage: str       # e.g. "raw_output", "background_removed", "composited"
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    storage_provider: str
    storage_path: str
    checksum: str
    created_at: float
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

class HistoryEntry(BaseModel):
    stage: str
    status: str
    duration_ms: int
    error: Optional[str] = None

class PipelineResult(BaseModel):
    success: bool
    manifest_id: Optional[str] = None
    errors: List[str] = Field(default_factory=list)

class ProviderCapabilities(BaseModel):
    supports_images: bool = False
    supports_video: bool = False
    supports_audio: bool = False
    supports_negative_prompt: bool = False
    supports_multiple_outputs: bool = False
    supports_seed: bool = False
    supports_upscaling: bool = False
    supports_editing: bool = False
    max_resolution: Optional[str] = None
    supported_formats: List[str] = Field(default_factory=list)

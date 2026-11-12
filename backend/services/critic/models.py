from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class FailureType(str, Enum):
    PRODUCT_ERROR = "PRODUCT_ERROR"
    BRAND_ERROR = "BRAND_ERROR"
    PROMPT_ERROR = "PROMPT_ERROR"
    COMPOSITION_ERROR = "COMPOSITION_ERROR"
    AESTHETIC_ERROR = "AESTHETIC_ERROR"
    TEXT_ERROR = "TEXT_ERROR"
    REALISM_ERROR = "REALISM_ERROR"

class FailureSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DetectedFailure(BaseModel):
    failure_type: FailureType
    severity: FailureSeverity
    evidence: str
    explanation: str
    affected_dimension: str

class CandidateScore(BaseModel):
    product_fidelity: int = Field(..., ge=0, le=100, description="25% weight")
    product_placement: int = Field(..., ge=0, le=100, description="15% weight")
    scene_integration: int = Field(..., ge=0, le=100, description="15% weight")
    composition: int = Field(..., ge=0, le=100, description="12% weight")
    brand_consistency: int = Field(..., ge=0, le=100, description="15% weight")
    marketing_effectiveness: int = Field(..., ge=0, le=100, description="10% weight")
    text_logo_safety: int = Field(..., ge=0, le=100, description="8% weight")
    weighted_total: float = 0.0

class CriticResult(BaseModel):
    candidate_id: str
    strategy_id: str
    scores: CandidateScore
    failures: List[DetectedFailure] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
    overall_reasoning: str
    pass_: bool = Field(True, alias="pass")
    issues: List[str] = []
    confidence: str = "HIGH"

from enum import Enum
from pydantic import BaseModel, Field

class ConfidenceLevel(str, Enum):
    OBSERVED = "OBSERVED"
    INFERRED = "INFERRED"
    UNKNOWN = "UNKNOWN"

class ConfidenceScore(BaseModel):
    level: ConfidenceLevel = Field(..., description="The confidence level of this attribute")
    reasoning: str | None = Field(None, description="Why this confidence level was chosen")

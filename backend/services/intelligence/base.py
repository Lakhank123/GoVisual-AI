from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel

class ConfidenceField(BaseModel):
    value: Any
    confidence: int
    reason: str
    sources: List[str]

class BrandIntelligenceProvider(ABC):
    """
    Abstract base class for Brand Intelligence analysis.
    This abstraction allows future modules to use different LLMs,
    Computer Vision models, or OCR without breaking the core system.
    """
    
    @abstractmethod
    async def analyze_brand_signals(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes raw merged signals (Google, Website, Instagram, Logo)
        and returns a structured JSON representing the Brand Brain Core Identity,
        Visual DNA, and Audience. Every inferred field must follow the 
        ConfidenceField schema.
        """
        pass

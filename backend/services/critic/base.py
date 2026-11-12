from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from .models import CriticResult

class CriticProvider(ABC):
    """
    Abstract interface for evaluating generated candidates.
    Future implementations could wrap an LLM/Vision model (e.g. OpenAI GPT-4o, Claude 3.5 Sonnet).
    """
    
    @abstractmethod
    async def evaluate_candidate(
        self,
        candidate_id: str,
        strategy_id: str,
        image_bytes: Optional[bytes],
        reference_image_bytes: Optional[bytes],
        product_understanding: Dict[str, Any],
        brand_dna: Dict[str, Any],
        marketing_requirement: str,
        prompt_used: str
    ) -> CriticResult:
        pass

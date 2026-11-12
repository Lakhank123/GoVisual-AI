from abc import ABC, abstractmethod
from typing import List
from .models import CreativeRequest, CreativeResult

class ImageGenerationProvider(ABC):
    """
    Abstract base class for V2 Image Generation Providers.
    Any provider (OpenAI, Gemini, Flux, Mock) must implement this interface.
    """
    
    @abstractmethod
    async def generate(self, request: CreativeRequest) -> List[CreativeResult]:
        """
        Generates one or more creatives based on the CreativeRequest.
        The number of results should match request.candidate_count where possible.
        """
        pass

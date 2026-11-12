from typing import List
from ..base import ImageGenerationProvider
from ..models import CreativeRequest, CreativeResult

class GeminiImageProvider(ImageGenerationProvider):
    """
    Adapter for Google Gemini Image Generation.
    TODO: Implement actual API calls when paid API is integrated.
    """
    def __init__(self):
        self.provider_name = "gemini"
        self.model_name = "gemini-3-pro-image" # or future equivalent
        
    async def generate(self, request: CreativeRequest) -> List[CreativeResult]:
        # TODO: Construct API payload using reference_images via inline_data
        # TODO: Make httpx async request to Gemini API
        # TODO: Handle multiple candidates if Gemini natively supports returning N images
        # TODO: Parse response and return base64 decoded bytes
        raise NotImplementedError("Gemini API integration not yet implemented for V2 architecture.")

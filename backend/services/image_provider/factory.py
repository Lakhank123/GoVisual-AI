import os
from .base import ImageGenerationProvider

def get_image_generation_provider() -> ImageGenerationProvider:
    """
    Factory method to instantiate the correct ImageGenerationProvider 
    based on the IMAGE_PROVIDER environment variable.
    """
    provider_name = os.getenv("IMAGE_PROVIDER", "mock").strip().lower()
    
    if provider_name == "mock":
        from .providers.mock_provider import MockImageProvider
        return MockImageProvider()
    elif provider_name == "openai":
        from .providers.openai_provider import OpenAIImageProvider
        return OpenAIImageProvider()
    elif provider_name == "gemini":
        from .providers.gemini_provider import GeminiImageProvider
        return GeminiImageProvider()
    elif provider_name == "flux":
        from .providers.flux_provider import FluxImageProvider
        return FluxImageProvider()
    else:
        # Default fallback to mock for safety in development
        from .providers.mock_provider import MockImageProvider
        return MockImageProvider()

from abc import ABC, abstractmethod
from typing import Dict, Any
from services.generation_engine.core.generation_context import GenerationContext
from services.generation_engine.core.models import ProviderCapabilities

class BaseGenerationProvider(ABC):
    @abstractmethod
    async def generate(self, context: GenerationContext) -> Dict[str, Any]:
        """
        Executes the generation based on the context.
        Returns a dictionary containing raw bytes and provider metadata (e.g. latency, cost, seed).
        """
        pass
    
    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities:
        """
        Returns a typed capability model describing the capabilities of the provider.
        """
        pass

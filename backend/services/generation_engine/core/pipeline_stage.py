from abc import ABC, abstractmethod
from typing import Optional
from .generation_context import GenerationContext

class PipelineStage(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the pipeline stage."""
        pass

    @abstractmethod
    async def execute(self, context: GenerationContext) -> GenerationContext:
        """Executes the pipeline stage, modifying and returning the context."""
        pass

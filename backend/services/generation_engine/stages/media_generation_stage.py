import logging
from services.generation_engine.core.pipeline_stage import PipelineStage
from services.generation_engine.core.generation_context import GenerationContext
from services.generation_engine.providers.factory import ProviderFactory
from services.generation_engine.events.event_publisher import event_publisher

logger = logging.getLogger(__name__)

class ImageGenerationStage(PipelineStage):
    @property
    def name(self) -> str:
        return "image_generation"

    async def execute(self, context: GenerationContext) -> GenerationContext:
        """
        Invokes the configured provider to generate the base asset.
        """
        provider_name = context.target_provider
        if not provider_name:
            raise ValueError("Target provider is not specified in the generation context.")
            
        provider = ProviderFactory.get_provider(provider_name)
        
        logger.info(f"Generating asset using provider: {provider_name}")
        event_publisher.publish("asset_generation_started", {"session_id": context.session_id, "provider": provider_name})
        
        # Execute provider generation
        result = await provider.generate(context)
        
        # Store intermediate raw asset
        context.generated_assets["raw_output"] = result.get("data")
        
        # Update metadata
        for key, value in result.get("metadata", {}).items():
            context.metadata[key] = value
            
        event_publisher.publish("asset_generation_completed", {"session_id": context.session_id, "provider": provider_name})
        
        return context

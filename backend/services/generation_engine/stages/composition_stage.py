import logging
from services.generation_engine.core.pipeline_stage import PipelineStage
from services.generation_engine.core.generation_context import GenerationContext
from services.generation_engine.events.event_publisher import event_publisher

logger = logging.getLogger(__name__)

class CompositionStage(PipelineStage):
    @property
    def name(self) -> str:
        return "composition"

    async def execute(self, context: GenerationContext) -> GenerationContext:
        """
        Composites product images, logos, and watermarks onto the generated background.
        """
        raw_output = context.generated_assets.get("raw_output")
        product_image = context.generated_assets.get("background_removed") or context.generation_request.get("product_image")
        
        if not raw_output:
            logger.info("No raw output available for composition. Skipping.")
            return context
            
        logger.info("Executing composition stage.")
        event_publisher.publish("composition_started", {"session_id": context.session_id})
        
        try:
            # Here we would call the actual compositing logic from services.compositor
            # Compositor overlays product_image onto raw_output, potentially adding brand colors.
            
            # Mocking the output for now
            composited_data = raw_output + b"_composited"
            
            context.generated_assets["composited"] = composited_data
            event_publisher.publish("composition_completed", {"session_id": context.session_id})
            
        except Exception as e:
            logger.error(f"Composition failed: {str(e)}")
            context.errors.append({"stage": self.name, "error": str(e)})
            event_publisher.publish("composition_failed", {"session_id": context.session_id, "error": str(e)})
            
        return context

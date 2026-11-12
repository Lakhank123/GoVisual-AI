import logging
from services.generation_engine.core.pipeline_stage import PipelineStage
from services.generation_engine.core.generation_context import GenerationContext
from services.generation_engine.events.event_publisher import event_publisher
# Assuming a mock import for existing logic
# from services.background_removal import remove_background

logger = logging.getLogger(__name__)

class BackgroundRemovalStage(PipelineStage):
    @property
    def name(self) -> str:
        return "background_removal"

    async def execute(self, context: GenerationContext) -> GenerationContext:
        """
        Removes the background from the provided product image.
        """
        product_image = context.generation_request.get("product_image")
        
        if not product_image:
            logger.info("No product image provided. Skipping background removal.")
            return context
            
        logger.info("Executing background removal stage.")
        event_publisher.publish("background_removal_started", {"session_id": context.session_id})
        
        try:
            # Here we would call the actual background removal logic
            # removed_bg_data = await remove_background(product_image)
            
            # Mocking the output for now
            removed_bg_data = product_image + b"_nobg"
            
            context.generated_assets["background_removed"] = removed_bg_data
            event_publisher.publish("background_removal_completed", {"session_id": context.session_id})
            
        except Exception as e:
            logger.error(f"Background removal failed: {str(e)}")
            # We don't fail the entire pipeline if this optional step fails, we just log it.
            context.errors.append({"stage": self.name, "error": str(e)})
            event_publisher.publish("background_removal_failed", {"session_id": context.session_id, "error": str(e)})
            
        return context

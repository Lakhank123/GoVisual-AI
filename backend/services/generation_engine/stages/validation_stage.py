import logging
from services.generation_engine.core.pipeline_stage import PipelineStage
from services.generation_engine.core.generation_context import GenerationContext
from services.generation_engine.events.event_publisher import event_publisher
from services.generation_engine.events.lifecycle_events import LifecycleEvent

logger = logging.getLogger(__name__)

class ValidationStage(PipelineStage):
    @property
    def name(self) -> str:
        return "validation"

    async def execute(self, context: GenerationContext) -> GenerationContext:
        """
        Validates the generated output from the provider.
        """
        event_publisher.publish(LifecycleEvent.ValidationStarted, {"session_id": context.session_id})
        
        raw_output = context.generated_assets.get("raw_output")
        if not raw_output:
            logger.error("No raw output found to validate.")
            context.errors.append({"stage": self.name, "error": "No raw output found to validate."})
            event_publisher.publish(LifecycleEvent.ValidationCompleted, {"session_id": context.session_id, "is_valid": False})
            return context
            
        # In a real implementation, we would check resolution, empty bytes, etc.
        # For now, we assume the asset is valid if bytes are present.
        is_valid = len(raw_output) > 0
        
        event_publisher.publish(LifecycleEvent.ValidationCompleted, {"session_id": context.session_id, "is_valid": is_valid})
        return context

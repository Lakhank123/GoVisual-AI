import time
import logging
from typing import List
from .generation_context import GenerationContext
from .pipeline_stage import PipelineStage
from services.generation_engine.events.event_publisher import event_publisher
from services.generation_engine.events.lifecycle_events import LifecycleEvent

logger = logging.getLogger(__name__)

class PipelineOrchestrator:
    def __init__(self, stages: List[PipelineStage]):
        self.stages = stages

    async def execute_pipeline(self, context: GenerationContext) -> GenerationContext:
        """Executes the complete pipeline by running each stage in sequence."""
        event_publisher.publish(LifecycleEvent.GenerationStarted, {"session_id": context.session_id})
        
        for stage in self.stages:
            stage_start_time = time.time()
            try:
                logger.info(f"Executing stage: {stage.name}")
                # We can't map arbitrary strings perfectly to the enum, but we can emit generic info or rely on stages to emit their specific start/end.
                # For generic stage logging, we can just log to the context.
                
                context = await stage.execute(context)
                
                duration = time.time() - stage_start_time
                context.history.append({
                    "stage": stage.name,
                    "status": "success",
                    "duration_ms": int(duration * 1000)
                })
                
            except Exception as e:
                duration = time.time() - stage_start_time
                logger.error(f"Stage {stage.name} failed: {str(e)}")
                context.history.append({
                    "stage": stage.name,
                    "status": "error",
                    "error": str(e),
                    "duration_ms": int(duration * 1000)
                })
                context.errors.append({"stage": stage.name, "error": str(e)})
                
                event_publisher.publish(LifecycleEvent.GenerationFailed, {"session_id": context.session_id, "failed_stage": stage.name, "error": str(e)})
                raise
                
        event_publisher.publish(LifecycleEvent.GenerationCompleted, {"session_id": context.session_id})
        return context

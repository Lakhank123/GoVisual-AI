import logging
import hashlib
import time
import uuid
from services.generation_engine.core.pipeline_stage import PipelineStage
from services.generation_engine.core.generation_context import GenerationContext
from services.generation_engine.core.models import AssetDescriptor
from services.generation_engine.storage.base_storage import StorageProvider
from services.generation_engine.events.event_publisher import event_publisher
from services.generation_engine.events.lifecycle_events import LifecycleEvent

logger = logging.getLogger(__name__)

class ExportStage(PipelineStage):
    def __init__(self, storage_provider: StorageProvider):
        self.storage_provider = storage_provider

    @property
    def name(self) -> str:
        return "export"

    async def execute(self, context: GenerationContext) -> GenerationContext:
        """
        Exports all intermediate and final assets to the storage provider.
        Constructs the AssetDescriptors and adds them to context.metadata.additional_data.
        """
        event_publisher.publish(LifecycleEvent.StorageStarted, {"session_id": context.session_id})
        
        descriptors = []
        for stage, data in context.generated_assets.items():
            if not isinstance(data, bytes):
                continue
                
            filename = f"{context.session_id}_{stage}_{int(time.time())}.png"
            storage_path = await self.storage_provider.upload(data, filename, "image/png")
            
            descriptor = AssetDescriptor(
                asset_id=str(uuid.uuid4()),
                asset_type="image",
                stage=stage,
                mime_type="image/png",
                storage_provider=self.storage_provider.__class__.__name__,
                storage_path=storage_path,
                checksum=hashlib.sha256(data).hexdigest(),
                created_at=time.time()
            )
            descriptors.append(descriptor.dict())
            
        context.metadata.additional_data["asset_descriptors"] = descriptors
        
        event_publisher.publish(LifecycleEvent.StorageCompleted, {"session_id": context.session_id})
        return context

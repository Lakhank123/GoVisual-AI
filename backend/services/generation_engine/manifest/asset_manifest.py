from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from services.generation_engine.core.models import AssetDescriptor, GenerationMetadata

class AssetManifest(BaseModel):
    generation_id: str
    
    # Store explicit asset descriptors rather than just dicts
    assets: List[AssetDescriptor] = Field(default_factory=list)
    
    metadata: GenerationMetadata = Field(default_factory=GenerationMetadata)
    processing_history: List[Dict[str, Any]] = Field(default_factory=list)
    
    def get_asset_by_stage(self, stage: str) -> Optional[AssetDescriptor]:
        for asset in self.assets:
            if asset.stage == stage:
                return asset
        return None

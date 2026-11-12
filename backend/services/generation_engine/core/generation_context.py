from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from .models import GenerationSettings, GenerationMetadata, HistoryEntry

class GenerationContext(BaseModel):
    """
    GenerationContext travels through the pipeline.
    
    Ownership & Lifecycle Documentation:
    - session_id: 
        Creator: API Route / Intake
        Readers: All stages, Manifest Builder, Logger
        Modifiers: None
        Final Owner: DB
    - brand_brain: 
        Creator: Intake Stage
        Readers: PromptEngine, ValidationStage, CompositionStage
        Modifiers: None
        Final Owner: DB (Reference only)
    - generation_request:
        Creator: Intake Stage
        Readers: CacheStage, BackgroundRemovalStage
        Modifiers: None
        Final Owner: DB (Manifest)
    - optimized_prompt:
        Creator: Prompt Engine / Intake Stage
        Readers: CacheStage, GenerationStage
        Modifiers: None
        Final Owner: Manifest
    - target_provider:
        Creator: Intake Stage
        Readers: GenerationStage, ValidationStage
        Modifiers: Fallback orchestrator (if retry needed)
        Final Owner: Manifest
    - generated_assets: 
        Creator: Pipeline Stages (Generation, BackgroundRemoval, Composition)
        Readers: Subsequent Pipeline Stages, ExportStage
        Modifiers: Successive stages adding keys (raw, cropped, final)
        Final Owner: StorageStage -> Manifest
    - metadata:
        Creator: CacheStage, GenerationStage (Provider metadata)
        Readers: FinalizationStage
        Modifiers: Any stage adding telemetry
        Final Owner: Manifest
    - history:
        Creator: Orchestrator
        Readers: FinalizationStage, Debugging
        Modifiers: Orchestrator (appends per stage)
        Final Owner: Manifest
    - settings:
        Creator: Intake Stage
        Readers: GenerationStage, ValidationStage, CompositionStage
        Modifiers: None
        Final Owner: Manifest
    - errors:
        Creator: Orchestrator / Failing Stages
        Readers: FinalizationStage
        Modifiers: Any stage catching non-fatal errors
        Final Owner: Manifest
    """
    session_id: str
    brand_brain: Dict[str, Any] = Field(default_factory=dict)
    generation_request: Dict[str, Any] = Field(default_factory=dict)
    optimized_prompt: str = ""
    target_provider: str = ""
    
    # Tracks intermediate stages (raw, cropped, final). Stores raw bytes or dicts.
    generated_assets: Dict[str, Any] = Field(default_factory=dict)
    
    # Typed metadata
    metadata: GenerationMetadata = Field(default_factory=GenerationMetadata)
    
    # Audit trail
    history: List[HistoryEntry] = Field(default_factory=list)
    
    # Typed settings
    settings: GenerationSettings = Field(default_factory=GenerationSettings)
    
    # Collected non-fatal errors
    errors: List[Dict[str, Any]] = Field(default_factory=list)

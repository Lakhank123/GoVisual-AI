from pydantic import BaseModel
from typing import Optional, List

class CreativeStrategy(BaseModel):
    """
    Structured internal object representing a distinct creative strategy for generation.
    It deliberately separates visual components to ensure structured planning and to
    prevent generic text generation.
    """
    strategy_id: str
    strategy_name: str
    creative_direction: str
    
    # Core visual axes
    visual_style: Optional[str] = None
    environment: Optional[str] = None
    lighting: Optional[str] = None
    composition: Optional[str] = None
    camera_direction: Optional[str] = None
    mood: Optional[str] = None
    
    # Context
    target_audience: Optional[str] = None
    marketing_intent: Optional[str] = None
    
    # Validation/Differentiation text
    differentiation_rationale: Optional[str] = None

from pydantic import BaseModel, Field
from typing import List, Dict, Any
from .creative_strategy import CreativeStrategy

class CreativePlan(BaseModel):
    """
    Container for the multiple distinct Creative Strategies proposed for a specific request.
    """
    marketing_requirement: str
    product_context: Dict[str, Any]
    brand_context: Dict[str, Any]
    
    strategies: List[CreativeStrategy] = Field(default_factory=list)
    candidate_count: int = 4
    
    planner_metadata: Dict[str, Any] = Field(default_factory=dict)

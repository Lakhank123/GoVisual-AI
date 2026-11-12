from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .confidence import ConfidenceScore, ConfidenceLevel

class PhysicalAttributes(BaseModel):
    shape: Optional[str] = None
    form_factor: Optional[str] = None
    dimensions_estimate: Optional[str] = None
    orientation: Optional[str] = None
    visible_components: List[str] = Field(default_factory=list)
    material_appearance: Optional[str] = None
    surface_finish: Optional[str] = None

class VisualAttributes(BaseModel):
    dominant_colors: List[str] = Field(default_factory=list)
    secondary_colors: List[str] = Field(default_factory=list)
    texture: Optional[str] = None
    finish: Optional[str] = None
    transparency: Optional[str] = None
    reflectivity: Optional[str] = None

class Branding(BaseModel):
    visible_brand_name: Optional[str] = None
    visible_logo: bool = False
    visible_text: List[str] = Field(default_factory=list)
    packaging_text: List[str] = Field(default_factory=list)
    brand_marks: List[str] = Field(default_factory=list)

class Presentation(BaseModel):
    camera_angle: Optional[str] = None
    camera_distance: Optional[str] = None
    framing: Optional[str] = None
    background: Optional[str] = None
    lighting: Optional[str] = None
    shadows: Optional[str] = None
    reflections: Optional[str] = None
    perspective: Optional[str] = None

class ProductRegion(BaseModel):
    bounding_box: Optional[List[int]] = None # [x, y, w, h]
    mask_available: bool = False
    mask_path: Optional[str] = None

class ProductUnderstanding(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    product_type: Optional[str] = None
    short_description: Optional[str] = None
    
    physical_attributes: PhysicalAttributes = Field(default_factory=PhysicalAttributes)
    visual_attributes: VisualAttributes = Field(default_factory=VisualAttributes)
    branding: Branding = Field(default_factory=Branding)
    presentation: Presentation = Field(default_factory=Presentation)
    product_region: ProductRegion = Field(default_factory=ProductRegion)
    
    preservation_constraints: List[str] = Field(default_factory=list)
    
    # Confidence metrics for key fields
    confidence: Dict[str, ConfidenceScore] = Field(default_factory=dict)
    
    uncertainties: List[str] = Field(default_factory=list)
    
    source_image: Optional[str] = None

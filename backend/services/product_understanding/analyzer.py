import logging
from typing import Dict, Any, Optional
from .models import (
    ProductUnderstanding,
    PhysicalAttributes,
    VisualAttributes,
    Branding,
    Presentation,
    ConfidenceScore,
    ConfidenceLevel
)

logger = logging.getLogger("GoVisual.ProductUnderstandingAnalyzer")

class ProductUnderstandingAnalyzer:
    """
    Parses the raw JSON analysis from the Vision Provider and maps it into
    the strongly-typed ProductUnderstanding data contract, assigning
    confidence scores where applicable.
    """
    
    def analyze(self, raw_analysis: Dict[str, Any]) -> ProductUnderstanding:
        pu = ProductUnderstanding()
        
        pu.product_name = raw_analysis.get("product_name")
        pu.product_category = raw_analysis.get("product_category")
        pu.product_type = raw_analysis.get("product_type")
        
        # Physical
        raw_phys = raw_analysis.get("physical_attributes", {})
        pu.physical_attributes = PhysicalAttributes(
            shape=raw_phys.get("shape"),
            form_factor=raw_phys.get("form_factor"),
            visible_components=raw_phys.get("visible_components", []),
            material_appearance=raw_phys.get("material_appearance"),
            surface_finish=raw_phys.get("surface_finish")
        )
        
        # Visual
        raw_vis = raw_analysis.get("visual_attributes", {})
        pu.visual_attributes = VisualAttributes(
            dominant_colors=raw_vis.get("dominant_colors", []),
            secondary_colors=raw_vis.get("secondary_colors", []),
            texture=raw_vis.get("texture"),
            finish=raw_vis.get("finish")
        )
        
        # Branding
        raw_brand = raw_analysis.get("branding", {})
        pu.branding = Branding(
            visible_brand_name=raw_brand.get("visible_brand_name"),
            visible_logo=bool(raw_brand.get("visible_logo")),
            visible_text=raw_brand.get("visible_text", []),
            packaging_text=raw_brand.get("packaging_text", [])
        )
        
        # Presentation
        raw_pres = raw_analysis.get("presentation", {})
        pu.presentation = Presentation(
            camera_angle=raw_pres.get("camera_angle"),
            background=raw_pres.get("background"),
            lighting=raw_pres.get("lighting"),
            shadows=raw_pres.get("shadows")
        )
        
        pu.preservation_constraints = raw_analysis.get("preservation_constraints", [])
        pu.uncertainties = raw_analysis.get("uncertainties", [])
        
        # Assign basic confidences based on parsed data presence
        self._assign_confidence(pu)
        
        return pu

    def _assign_confidence(self, pu: ProductUnderstanding):
        """
        Assigns confidence to various attributes based on what was observed.
        """
        # Product Identity
        if pu.product_type:
            pu.confidence["product_type"] = ConfidenceScore(
                level=ConfidenceLevel.OBSERVED,
                reasoning="Identified specific product type from visual features"
            )
            
        # Colors
        if pu.visual_attributes.dominant_colors:
            pu.confidence["dominant_colors"] = ConfidenceScore(
                level=ConfidenceLevel.OBSERVED,
                reasoning="Extracted primary colors visible on the product"
            )
            
        # Branding
        if pu.branding.visible_brand_name or pu.branding.visible_logo:
            pu.confidence["branding"] = ConfidenceScore(
                level=ConfidenceLevel.OBSERVED,
                reasoning="Identified distinct brand marks or text"
            )
            
        # If there are uncertainties, lower the overall confidence slightly
        # For simplicity, we just mark uncertainties explicitly
        if pu.uncertainties:
            pu.confidence["uncertainties"] = ConfidenceScore(
                level=ConfidenceLevel.UNKNOWN,
                reasoning="Vision provider explicitly marked these aspects as uncertain"
            )

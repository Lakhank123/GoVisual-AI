import os
import logging
from typing import Dict, Any, Optional

from .models import ProductUnderstanding
from .vision_provider import ProductVisionProvider, GroqVisionProviderAdapter
from .analyzer import ProductUnderstandingAnalyzer
from .mask_service import ProductMaskService
from .validator import ProductUnderstandingValidator

logger = logging.getLogger("GoVisual.ProductUnderstandingService")

class ProductUnderstandingService:
    """
    Orchestrates the conversion of a product reference image into a 
    canonical, validated ProductUnderstanding contract.
    """
    
    def __init__(
        self, 
        vision_provider: Optional[ProductVisionProvider] = None,
        mask_service: Optional[ProductMaskService] = None,
        validator: Optional[ProductUnderstandingValidator] = None
    ):
        self.vision_provider = vision_provider or GroqVisionProviderAdapter()
        self.analyzer = ProductUnderstandingAnalyzer()
        self.mask_service = mask_service or ProductMaskService()
        self.validator = validator or ProductUnderstandingValidator()
        
    async def understand(self, image_path: str, product_metadata: Optional[Dict[str, Any]] = None) -> Optional[ProductUnderstanding]:
        """
        Executes the product understanding pipeline.
        """
        logger.info(f"[PU_Service] Starting understanding for: {image_path}")
        
        if not os.path.exists(image_path):
            logger.error(f"[PU_Service] Image path does not exist: {image_path}")
            return None
            
        with open(image_path, "rb") as f:
            image_bytes = f.read()
            
        # 1. Vision Analysis
        logger.info("[PU_Service] Triggering Vision Provider")
        raw_result = await self.vision_provider.analyze(image_bytes)
        
        if raw_result.get("status") != "success":
            logger.error(f"[PU_Service] Vision analysis failed: {raw_result.get('error')}")
            return None
            
        # 2. Parse and Assign Confidence
        logger.info("[PU_Service] Parsing analysis into Canonical form")
        pu = self.analyzer.analyze(raw_result["analysis"])
        pu.source_image = image_path
        
        # Merge in any pre-existing product metadata (like product ID from DB)
        if product_metadata:
            if "product_id" in product_metadata:
                pu.product_id = product_metadata["product_id"]
        
        # 3. Mask Generation
        logger.info("[PU_Service] Requesting Mask/Foreground extraction")
        mask_bytes = self.mask_service.generate_mask_assets(image_bytes)
        
        if mask_bytes:
            # We don't overwrite the original image.
            # We save the transparent version for downstream compositional use.
            directory = os.path.dirname(image_path)
            basename = os.path.basename(image_path)
            name, ext = os.path.splitext(basename)
            mask_path = os.path.join(directory, f"{name}_transparent.png")
            
            try:
                with open(mask_path, "wb") as f:
                    f.write(mask_bytes)
                pu.product_region.mask_available = True
                pu.product_region.mask_path = mask_path
                logger.info(f"[PU_Service] Transparent mask saved to {mask_path}")
            except Exception as e:
                logger.error(f"[PU_Service] Failed to save mask: {e}")
        else:
            logger.warning("[PU_Service] Mask generation returned None")
            
        # 4. Validation
        logger.info("[PU_Service] Validating Output")
        is_valid = self.validator.validate(pu)
        if not is_valid:
            logger.error("[PU_Service] Validation failed, but returning data for debugging.")
            
        return pu

    async def analyze_product(self, image_bytes: bytes) -> Any:
        """
        Directly analyzes a product from image bytes.
        Returns a simplified namespace or dict containing status and analysis.
        """
        logger.info("[PU_Service] Triggering Vision Provider directly")
        raw_result = await self.vision_provider.analyze(image_bytes)
        
        if raw_result.get("status") != "success":
            logger.error(f"[PU_Service] Vision analysis failed: {raw_result.get('error')}")
            return type("Result", (object,), {"status": "failed", "error": raw_result.get("error")})
            
        logger.info("[PU_Service] Parsing analysis into Canonical form")
        pu = self.analyzer.analyze(raw_result["analysis"])
        
        return type("Result", (object,), {"status": "success", "analysis": pu})

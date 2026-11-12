from .models import ProductUnderstanding
import logging

logger = logging.getLogger("GoVisual.ProductUnderstandingValidator")

class ProductUnderstandingValidator:
    """
    Validates that the ProductUnderstanding contract is correctly populated
    and avoids empty required fields or contradictory states.
    """
    
    def validate(self, pu: ProductUnderstanding) -> bool:
        is_valid = True
        
        # Must have basic identification
        if not pu.product_category and not pu.product_type:
            logger.error("[Validator] Failed: Missing product category and type")
            is_valid = False
            
        # Must have preservation constraints
        if not pu.preservation_constraints:
            logger.error("[Validator] Failed: No preservation constraints generated")
            is_valid = False
            
        # Mask logic consistency
        if pu.product_region.mask_available and not pu.product_region.mask_path:
            logger.error("[Validator] Failed: mask_available is True but mask_path is missing")
            is_valid = False
            
        if not is_valid:
            logger.error("[Validator] ProductUnderstanding validation FAILED.")
        else:
            logger.info("[Validator] ProductUnderstanding validation PASSED.")
            
        return is_valid

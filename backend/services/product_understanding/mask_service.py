import logging
from typing import Optional
from services.background_removal import remove_background, refine_edges

logger = logging.getLogger("GoVisual.ProductMaskService")

class ProductMaskService:
    """
    Separates the product from the background using the existing background_removal module.
    Does NOT permanently modify the original image, but provides the separated assets
    if segmentation is successful.
    """
    def __init__(self):
        pass
        
    def generate_mask_assets(self, image_bytes: bytes) -> Optional[bytes]:
        """
        Attempts to isolate the product and returns a transparent PNG bytes.
        """
        logger.info("[MaskService] Attempting background removal...")
        try:
            # We reuse the existing rembg pipeline
            transparent_bytes = remove_background(image_bytes)
            refined_bytes = refine_edges(transparent_bytes)
            return refined_bytes
        except Exception as e:
            logger.error(f"[MaskService] Failed to generate mask: {e}")
            return None

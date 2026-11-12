import os
import io
import time
import logging
from typing import Dict, Any, Optional
from PIL import Image
from huggingface_hub import InferenceClient
from services.storage import StorageService

from .mock_regeneration_provider import RegenerationProvider

logger = logging.getLogger("GoVisual.SelfCorrection")

class FluxRegenerationProvider(RegenerationProvider):
    def __init__(self):
        token = os.environ.get("HF_API_TOKEN2")
        if not token:
            logger.warning("[FluxRegeneration] WARNING: HF_API_TOKEN2 not found.")
        self.model_name = "black-forest-labs/FLUX.2-klein-4B"
        self.client = InferenceClient(api_key=token)
        self.storage_svc = StorageService()

    async def regenerate(
        self,
        candidate_data: Dict[str, Any],
        repair_instruction: str,
        reference_image_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        
        if not reference_image_bytes:
            raise ValueError("Reference image is required for FLUX image_to_image regeneration.")
            
        original_prompt = candidate_data.get("prompt_used", "")
        new_prompt = f"{original_prompt}\n\nCRITICAL REPAIR INSTRUCTION: {repair_instruction}"
        
        logger.info(f"[FLUX_GENERATION] Regenerating candidate {candidate_data.get('candidate_id')} with repair.")
        start_time = time.time()
        
        try:
            ref_image = Image.open(io.BytesIO(reference_image_bytes)).convert("RGB")
            
            res_image = self.client.image_to_image(
                image=ref_image,
                prompt=new_prompt,
                model=self.model_name
            )
            
            out_bytes = io.BytesIO()
            res_image.save(out_bytes, format="PNG")
            img_data = out_bytes.getvalue()
            
            new_candidate_id = f"{candidate_data.get('candidate_id')}_repaired"
            url = await self.storage_svc.upload(
                img_data,
                folder="govisual/generated/v2",
                filename=f"flux_v2_{new_candidate_id}.png"
            )
            
            latency = time.time() - start_time
            
            new_data = candidate_data.copy()
            new_data["candidate_id"] = new_candidate_id
            new_data["image_bytes"] = img_data
            new_data["url"] = url
            new_data["prompt_used"] = new_prompt
            new_data["status"] = "SUCCESS"
            new_data["latency"] = latency
            return new_data
            
        except Exception as e:
            logger.error(f"[FLUX_GENERATION] Regeneration failed: {e}")
            latency = time.time() - start_time
            new_data = candidate_data.copy()
            new_data["candidate_id"] = f"{candidate_data.get('candidate_id')}_repaired"
            new_data["status"] = "FAILED"
            new_data["error"] = str(e)
            new_data["latency"] = latency
            return new_data

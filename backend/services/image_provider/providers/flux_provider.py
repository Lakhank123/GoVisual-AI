from typing import List
import os
import time
from huggingface_hub import InferenceClient
from PIL import Image
import io
from ..base import ImageGenerationProvider
from ..models import CreativeRequest, CreativeResult
from services.storage import StorageService

class FluxImageProvider(ImageGenerationProvider):
    """
    Real integration with FLUX.2-klein-4B using Hugging Face InferenceClient.
    """
    def __init__(self):
        self.provider_name = "huggingface"
        self.model_name = "black-forest-labs/FLUX.2-klein-4B"
        
        token = os.environ.get("HF_API_TOKEN2")
        if not token:
            print("[FluxProvider] WARNING: HF_API_TOKEN2 not found.")
        self.client = InferenceClient(api_key=token)
        self.storage_svc = StorageService()
        
    async def generate(self, request: CreativeRequest) -> List[CreativeResult]:
        start_time = time.time()
        
        try:
            if not request.reference_images or len(request.reference_images) == 0:
                raise ValueError("Reference image is required for FLUX image_to_image generation")
                
            ref_image = Image.open(io.BytesIO(request.reference_images[0])).convert("RGB")
            
            # The client is synchronous, so we could run it in a thread pool,
            # but for this test we'll just run it directly (blocking is OK for this experiment)
            res_image = self.client.image_to_image(
                image=ref_image,
                prompt=request.computed_prompt,
                model=self.model_name
            )
            
            # Convert result back to bytes
            out_bytes = io.BytesIO()
            res_image.save(out_bytes, format="PNG")
            img_data = out_bytes.getvalue()
            
            # Upload to Cloudinary to get a URL for the frontend
            url = await self.storage_svc.upload(
                img_data,
                folder="govisual/generated/v2",
                filename=f"flux_v2_{request.candidate_id}.png"
            )
            
            latency = time.time() - start_time
            
            return [CreativeResult(
                candidate_id=request.candidate_id,
                strategy_name=request.strategy_name,
                image_url=url,
                image_bytes=img_data,
                prompt_used=request.computed_prompt,
                provider=self.provider_name,
                model=self.model_name,
                latency=latency,
                status="SUCCESS",
                reference_conditioned=True,
                error=None
            )]
            
        except Exception as e:
            latency = time.time() - start_time
            return [CreativeResult(
                candidate_id=request.candidate_id,
                strategy_name=request.strategy_name,
                image_url="",
                image_bytes=b"",
                prompt_used=request.computed_prompt,
                provider=self.provider_name,
                model=self.model_name,
                latency=latency,
                status="FAILED",
                reference_conditioned=True,
                error=str(e)
            )]

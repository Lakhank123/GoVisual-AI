import base64
import os
import time
from typing import Any, Dict, Optional

from openai import AsyncOpenAI
from services.storage import StorageService
from services.logo_overlay import apply_exact_logo

from ..regeneration_service import RegenerationProvider


class OpenAIRegenerationProvider(RegenerationProvider):
    def __init__(self):
        self.model_name = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")
        self.quality = os.getenv("OPENAI_IMAGE_QUALITY", "medium")
        self.size = os.getenv("OPENAI_IMAGE_SIZE", "1024x1024")
        self.storage_svc = StorageService()

    async def regenerate(
        self,
        candidate_data: Dict[str, Any],
        repair_instruction: str,
        reference_image_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_AI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key is not configured.")
        if not reference_image_bytes:
            raise ValueError("Reference image is required for OpenAI regeneration.")

        prompt = f"{candidate_data.get('prompt_used', '')}\n\nCRITICAL REPAIR INSTRUCTION: {repair_instruction}"
        start_time = time.time()
        client = AsyncOpenAI(api_key=api_key)
        response = await client.images.edit(
            model=self.model_name,
            image=("product-reference.png", reference_image_bytes, "image/png"),
            prompt=prompt,
            size=self.size,
            quality=self.quality,
            n=1,
        )
        image_bytes = base64.b64decode(response.data[0].b64_json)
        image_bytes = apply_exact_logo(
            image_bytes,
            candidate_data.get("logo_image"),
            candidate_data.get("logo_position", "top-right"),
        )
        image_url = await self.storage_svc.upload(
            image_bytes,
            folder="govisual/generated/v2",
            filename=f"openai_repaired_{candidate_data.get('candidate_id', 'candidate')}.png",
        )

        result = candidate_data.copy()
        result.update(
            {
                "candidate_id": f"{candidate_data.get('candidate_id', '')}_repaired",
                "image_bytes": image_bytes,
                "url": image_url,
                "prompt_used": prompt,
                "provider": "openai",
                "model": self.model_name,
                "status": "SUCCESS",
                "latency": time.time() - start_time,
                "reference_conditioned": True,
                "error": None,
            }
        )
        return result
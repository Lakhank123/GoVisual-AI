import os
import time
import base64
from typing import List
from ..base import ImageGenerationProvider
from ..models import CreativeRequest, CreativeResult
from openai import AsyncOpenAI
from services.storage import StorageService
from services.creative_planner.creative_compositor import apply_advertising_overlays

class OpenAIImageProvider(ImageGenerationProvider):
    """
    Production Adapter for OpenAI Image Generation APIs.
    Dispatches reference-conditioned image edits and applies exact logo, headline,
    promotional badge, and verified feature chips non-destructively post-generation.
    """
    def __init__(self):
        self.provider_name = "openai"
        self.model_name = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")
        self.quality = os.getenv("OPENAI_IMAGE_QUALITY", "medium")
        self.size = os.getenv("OPENAI_IMAGE_SIZE", "1024x1024")
        self.storage_svc = StorageService()
        
    async def generate(self, request: CreativeRequest) -> List[CreativeResult]:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_AI_API_KEY")
        if not api_key:
            return [self._create_error_result(request, "OPEN_AI_API_KEY not set")]

        client = AsyncOpenAI(api_key=api_key)
        start_time = time.time()

        if not request.reference_images:
            return [self._create_error_result(request, "Reference image is required for OpenAI image editing.")]

        try:
            quality = request.generation_options.get("quality", self.quality)
            
            # Support single reference or dual composite reference (Product + Model)
            if len(request.reference_images) >= 2:
                import io
                from PIL import Image
                with Image.open(io.BytesIO(request.reference_images[0])) as p_img, Image.open(io.BytesIO(request.reference_images[1])) as m_img:
                    p_rgb = p_img.convert("RGB")
                    m_rgb = m_img.convert("RGB")
                    canvas = Image.new("RGB", (1024, 1024), (255, 255, 255))
                    p_copy = p_rgb.copy()
                    p_copy.thumbnail((512, 1024), Image.Resampling.LANCZOS)
                    canvas.paste(p_copy, ((512 - p_copy.width) // 2, (1024 - p_copy.height) // 2))
                    m_copy = m_rgb.copy()
                    m_copy.thumbnail((512, 1024), Image.Resampling.LANCZOS)
                    canvas.paste(m_copy, (512 + (512 - m_copy.width) // 2, (1024 - m_copy.height) // 2))
                    buf = io.BytesIO()
                    canvas.save(buf, format="PNG")
                    ref_bytes = buf.getvalue()
                image_tuple = ("dual_reference.png", ref_bytes, "image/png")
            else:
                image_tuple = ("product-reference.png", request.reference_images[0], "image/png")

            response = await client.images.edit(
                model=self.model_name,
                image=image_tuple,
                prompt=request.computed_prompt[:1000],
                size=request.resolution or self.size,
                quality=quality,
                n=1,
            )
            
            raw_image_data = base64.b64decode(response.data[0].b64_json)
            
            # Apply exact advertising overlays (Logo, Headline, Offer, Verified Feature chips)
            gen_opts = request.generation_options or {}
            final_image_data = apply_advertising_overlays(
                image_bytes=raw_image_data,
                logo_bytes=request.logo_image,
                logo_position=request.logo_position,
                headline_text=gen_opts.get("headline_text"),
                offer_text=gen_opts.get("offer_text"),
                feature_chips=gen_opts.get("feature_chips"),
                primary_color_hex=gen_opts.get("primary_color"),
            )
            
            image_url = await self.storage_svc.upload(
                final_image_data,
                folder="govisual/generated/v2",
                filename=f"openai_v2_{request.candidate_id}.png",
            )
            
            metadata = {
                "logo_image": request.logo_image,
                "logo_position": request.logo_position,
                "creative_brief": (request.metadata or {}).get("creative_brief"),
                "verified_features": (request.metadata or {}).get("verified_features", []),
                "headline": gen_opts.get("headline_text"),
                "offer": gen_opts.get("offer_text"),
            }
            latency = time.time() - start_time
            
            res = CreativeResult(
                candidate_id=request.candidate_id,
                strategy_name=request.strategy_name,
                image_url=image_url,
                provider=self.provider_name,
                model=self.model_name,
                prompt_used=request.computed_prompt,
                image_bytes=final_image_data,
                latency_seconds=latency,
                latency=latency,
                status="SUCCESS",
                reference_conditioned=True,
                metadata=metadata,
            )
            return [res]
            
        except Exception as e:
            latency = time.time() - start_time
            return [self._create_error_result(request, str(e), latency=latency)]

    def _create_error_result(self, request: CreativeRequest, error_msg: str, latency: float = 0.0) -> CreativeResult:
        return CreativeResult(
            candidate_id=request.candidate_id,
            strategy_name=request.strategy_name,
            provider=self.provider_name,
            model=self.model_name,
            prompt_used=request.computed_prompt,
            latency_seconds=latency,
            latency=latency,
            status="FAILED",
            error=error_msg,
            reference_conditioned=True
        )

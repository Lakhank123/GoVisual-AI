import os
import io
import time
import asyncio
from typing import List
from PIL import Image
from ..base import ImageGenerationProvider
from ..models import CreativeRequest, CreativeResult
from services.creative_planner.creative_compositor import apply_advertising_overlays

class MockImageProvider(ImageGenerationProvider):
    """
    Development & Testing provider that simulates V2 native image generation 
    offline without calling paid APIs or consuming credits.
    """
    def __init__(self):
        self.provider_name = "mock"
        self.model_name = "mock-v1"

    async def generate(self, request: CreativeRequest) -> List[CreativeResult]:
        # Small delay for realistic async execution
        await asyncio.sleep(0.05)
        
        start_time = time.time()
        
        # Try loading baseline image if present, else synthesize a clean test canvas
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        test_img_path = os.path.join(
            base_dir, "..", "research", "phase0", "baseline", "single_test", "P001", "C01", "final_creative.png"
        )
        
        image_bytes = None
        error_msg = None
        
        if os.path.exists(test_img_path):
            try:
                with open(test_img_path, "rb") as f:
                    image_bytes = f.read()
            except Exception as e:
                pass

        if not image_bytes:
            # If reference image is provided, adapt it onto a 1024x1024 canvas
            if request.reference_images and len(request.reference_images) > 0:
                try:
                    ref_img = Image.open(io.BytesIO(request.reference_images[0])).convert("RGB")
                    canvas = Image.new("RGB", (1024, 1024), (245, 245, 245))
                    ref_copy = ref_img.copy()
                    ref_copy.thumbnail((700, 700), Image.Resampling.LANCZOS)
                    x = (1024 - ref_copy.width) // 2
                    y = (1024 - ref_copy.height) // 2
                    canvas.paste(ref_copy, (x, y))
                    buf = io.BytesIO()
                    canvas.save(buf, format="PNG")
                    image_bytes = buf.getvalue()
                except Exception:
                    pass
            
            if not image_bytes:
                # Synthesize a high-quality test canvas
                canvas = Image.new("RGB", (1024, 1024), (30, 25, 22))
                buf = io.BytesIO()
                canvas.save(buf, format="PNG")
                image_bytes = buf.getvalue()

        # Apply exact advertising overlays
        gen_opts = request.generation_options or {}
        image_bytes = apply_advertising_overlays(
            image_bytes=image_bytes,
            logo_bytes=request.logo_image,
            logo_position=request.logo_position,
            headline_text=gen_opts.get("headline_text"),
            offer_text=gen_opts.get("offer_text"),
            feature_chips=gen_opts.get("feature_chips"),
            primary_color_hex=gen_opts.get("primary_color"),
        )
        
        results = []
        latency = time.time() - start_time
        
        metadata = {
            "logo_image": request.logo_image,
            "logo_position": request.logo_position,
            "creative_brief": (request.metadata or {}).get("creative_brief"),
            "verified_features": (request.metadata or {}).get("verified_features", []),
            "headline": gen_opts.get("headline_text"),
            "offer": gen_opts.get("offer_text"),
        }

        # Generate the requested number of candidates
        for i in range(request.candidate_count):
            cand_id = request.candidate_id or f"mock_cand_{i}"
            filename = f"mock_{cand_id}_{i}.png"
            os.makedirs("generated_images", exist_ok=True)
            with open(os.path.join("generated_images", filename), "wb") as f:
                f.write(image_bytes)

            result = CreativeResult(
                candidate_id=cand_id,
                strategy_name=request.strategy_name or f"Strategy {i+1}",
                image_bytes=image_bytes,
                image_url=f"/static/generated/{filename}",
                provider=self.provider_name,
                model=self.model_name,
                prompt_used=request.computed_prompt or "MOCK_PROMPT",
                references_used=["product_image"] if request.reference_images else [],
                generation_parameters=request.generation_options,
                latency_seconds=latency,
                latency=latency,
                status="SUCCESS",
                error=error_msg,
                metadata=metadata,
                reference_conditioned=True,
            )
            results.append(result)
            
        return results

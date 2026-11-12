import os
import base64
import json
import httpx
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger("GoVisual.ProductUnderstanding")

class ProductVisionProvider(ABC):
    @abstractmethod
    async def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyzes the reference image and returns raw extracted product attributes.
        """
        pass

class GroqVisionProviderAdapter(ProductVisionProvider):
    """
    Adapter that uses the Groq Vision API to extract highly structured product information.
    We reimplement the httpx call here to avoid modifying the V1 legacy implementation
    and to allow a much more complex prompt structure tailored for Phase 1.4.
    """
    
    def __init__(self, model_name: str = "qwen/qwen3.8-27b"):
        # We can use a powerful vision model from Groq
        self.model_name = os.getenv("GROQ_VISION_MODEL", model_name)
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()

    async def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("[VISION] No GROQ_API_KEY found. Analysis will fail.")
            return {"status": "failed", "error": "No GROQ_API_KEY"}

        prompt_instructions = """
        You are an expert product vision analyzer.
        Analyze this product image and extract detailed structured information.
        Return ONLY valid JSON matching this exact structure, with no markdown formatting:
        {
            "product_name": "Name of the product if visible/obvious, else null",
            "product_category": "Broad category e.g., automotive, beverage, beauty",
            "product_type": "Specific type e.g., SUV, soda can, lipstick",
            "physical_attributes": {
                "shape": "Overall shape",
                "form_factor": "Form factor",
                "visible_components": ["component1", "component2"],
                "material_appearance": "Material look e.g., metallic, glass, matte plastic",
                "surface_finish": "Surface finish e.g., glossy, textured"
            },
            "visual_attributes": {
                "dominant_colors": ["color1", "color2"],
                "secondary_colors": ["color3"],
                "texture": "Visible texture",
                "finish": "Glossy, matte, etc."
            },
            "branding": {
                "visible_brand_name": "Brand name if visible, else null",
                "visible_logo": true/false,
                "visible_text": ["Any specific text on product"],
                "packaging_text": ["Text on packaging"]
            },
            "presentation": {
                "camera_angle": "Angle e.g., straight on, low angle",
                "background": "Describe the background scene of the reference image",
                "lighting": "Lighting conditions",
                "shadows": "Shadow descriptions"
            },
            "preservation_constraints": [
                "List exactly what visual aspects MUST be preserved in future generations"
            ],
            "uncertainties": [
                "List any details you are unsure about based on the image"
            ]
        }
        
        CRITICAL RULES:
        1. Separate the PRODUCT from the BACKGROUND. Describe the background in presentation.background.
        2. Do NOT invent or hallucinate details. If you cannot see it, leave it null or empty.
        3. Only describe what is visually present in the image.
        """

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        
        mime_type = "image/jpeg"
        if image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            mime_type = "image/png"
        elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[8:12]:
            mime_type = "image/webp"

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_instructions},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}}
                    ]
                }
            ],
            "max_completion_tokens": 512,
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code >= 400:
                    logger.error(f"[VISION] Groq API Error {response.status_code}: {response.text[:500]}")
                    return {"status": "failed", "error": f"API Error: {response.status_code}"}
                
                data = response.json()
                
            content = data.get("choices", [])[0].get("message", {}).get("content", "")
            if not content:
                return {"status": "failed", "error": "Empty response"}
                
            try:
                analysis = json.loads(content)
                return {"status": "success", "analysis": analysis}
            except json.JSONDecodeError:
                return {"status": "failed", "error": "JSON parse error"}
            
        except Exception as e:
            return {"status": "failed", "error": str(e)}

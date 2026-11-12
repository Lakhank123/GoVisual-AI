import os
import json
import base64
import httpx
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("GoVisual.ImageAnalysis")

class ImageAnalysisProvider(ABC):
    @abstractmethod
    async def analyze(self, image_bytes: bytes, intent: str | None = None) -> dict:
        """
        Analyzes the reference image and extracts product details, lighting, and composition.
        Returns a dict containing the structured visual context and status, e.g.:
        {"status": "success", "analysis": {...}} or {"status": "failed", "analysis": None, "error": "..."}
        """
        pass

class GroqVisionProvider(ImageAnalysisProvider):
    def __init__(self, model_name: str = "qwen/qwen3.8-27b"):
        self.model_name = os.getenv("GROQ_VISION_MODEL", model_name)
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()

    async def analyze(self, image_bytes: bytes, intent: str | None = None) -> dict:
        if not self.api_key:
            logger.warning("[VISION] No GROQ_API_KEY found, skipping image analysis.")
            return {"status": "failed", "analysis": None, "error": "No API Key"}

        logger.info("[VISION] Groq analysis started")
        
        prompt_instructions = (
            "Analyze this product image carefully. Return JSON strictly following this schema: "
            "{\"product_type\": \"...\", \"appearance\": \"...\", \"dominant_colors\": \"...\", "
            "\"camera_angle\": \"...\", \"background\": \"...\", \"lighting\": \"...\", "
            "\"composition\": \"...\", \"visual_style\": \"...\"} "
            "Keep descriptions very concise. Focus heavily on preserving the product's identity."
        )

        # Base64 encode the image
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        
        # Determine image mime type simply for Groq compatibility
        # Start bytes of PNG vs JPG
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
            "max_tokens": 512,
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code >= 400:
                    logger.error(f"[VISION] Analysis failed. HTTP {response.status_code}: {response.text[:500]}")
                    return {"status": "failed", "analysis": None, "error": f"API Error: {response.status_code}"}
                
                data = response.json()
                
            content = data.get("choices", [])[0].get("message", {}).get("content", "")
            if not content:
                logger.error("[VISION] No content from Groq Vision.")
                return {"status": "failed", "analysis": None, "error": "Empty response"}
                
            try:
                analysis = json.loads(content)
                
                if isinstance(analysis.get("dominant_colors"), str):
                    analysis["dominant_colors"] = [c.strip() for c in analysis["dominant_colors"].split(",")]
                    
                logger.info("[VISION] Groq analysis completed")
                logger.info("[VISION] Analysis parsed")
                return {"status": "success", "analysis": analysis, "error": None}
            except json.JSONDecodeError:
                logger.error("[VISION] Failed to parse JSON from Groq Vision.")
                return {"status": "failed", "analysis": None, "error": "JSON parse error"}
            
        except Exception as e:
            logger.error(f"[VISION] Analysis failed - fallback activated: {str(e)}")
            return {"status": "failed", "analysis": None, "error": str(e)}

class GeminiVisionProvider(ImageAnalysisProvider):
    # Retaining GeminiProvider as legacy just in case, but default is Groq.
    def __init__(self):
        self.api_key = ""
    async def analyze(self, image_bytes, intent=None):
        return {"status": "failed", "analysis": None, "error": "Deprecated"}

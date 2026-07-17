import os
import json
import httpx
import logging
from typing import Dict, Any

from services.intelligence.base import BrandIntelligenceProvider

logger = logging.getLogger(__name__)

class GroqBrandIntelligence(BrandIntelligenceProvider):
    
    def __init__(self, model_name: str = "llama-3.3-70b-versatile"):
        self.model_name = model_name
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()

    async def analyze_brand_signals(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends raw extracted signals to Groq to generate the Brand Brain structured output.
        """
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set.")
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        
        system_instruction = """
        You are GoVisual AI's expert Brand Analyst. Your job is to analyze raw signals 
        from a business (Google Places, Website, Instagram, Logo, Manual input) and build a 
        structured Brand Brain.
        
        You must output valid JSON only. DO NOT include markdown blocks like ```json.
        
        For every inferred field, you MUST return an object matching this schema:
        {
          "value": <the actual value, type depends on field>,
          "confidence": <integer 0-100>,
          "reason": "<short explanation why you inferred this>",
          "sources": ["<Google>", "<Website>", etc]
        }
        
        Required top-level fields:
        - brand_tone (string)
        - visual_style (string)
        - primary_language (string)
        - secondary_languages (array of strings)
        - brand_personality_tags (array of strings)
        - price_positioning (string)
        - audience_segments (array of strings)
        - photography_style (string)
        - color_grading (string)
        - image_mood (string)
        - lighting (string)
        - visual_dna (object containing the brand colors)
        
        The `visual_dna` object MUST have the following structure:
        {
          "primary_color": <ConfidenceField object containing hex string>,
          "secondary_color": <ConfidenceField object containing hex string>,
          "accent_colors": <ConfidenceField object containing array of hex strings>,
          "dominant_color": <ConfidenceField object containing hex string>,
          "brand_gradient": null,
          "palette": [
            {
              "hex": "<#RRGGBB format only>",
              "role": "<primary | secondary | accent>",
              "source": "<logo | website | css | google_business | instagram | ai_inferred>",
              "confidence": <0-100>,
              "manual_override": false
            }
          ]
        }
        
        Note for colors: 
        1. Parse the extracted colors from the raw signals (which include their sources).
        2. Remove noisy colors and merge visually similar duplicate colors into a single standard #RRGGBB hex code.
        3. Reject any invalid HEX values.
        4. Populate the `palette` array with these rich color metadata objects.
        5. Also populate `primary_color`, `secondary_color`, `accent_colors`, and `dominant_color` under `visual_dna` using standard ConfidenceField objects.
        """
        
        prompt = f"Raw signals to analyze:\n{json.dumps(raw_data, indent=2)}\n\nGenerate the Brand Brain JSON."
        
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }
        
        import re
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        print("Calling Groq...")
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            print("Groq response received")
            print("Parsing response...")
            
            try:
                content = data["choices"][0]["message"]["content"]
                
                # If the response is markdown, extract only the JSON
                if content.strip().startswith("```"):
                    # Extract content inside markdown block
                    match = re.search(r"```(?:json)?(.*?)```", content, re.DOTALL)
                    if match:
                        content = match.group(1).strip()
                        
                return json.loads(content)
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                print(f"Failed to parse Groq response: {e}")
                print(f"Raw response: {data.get('choices', [{}])[0].get('message', {}).get('content', 'No content')}")
                logger.error(f"Failed to parse Groq response: {e}")
                raise ValueError("Invalid response from Groq Analyst")

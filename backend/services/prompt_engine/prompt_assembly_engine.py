import json
from typing import Dict, Any
from .prompt_template_service import PromptTemplateService

class PromptAssemblyEngine:
    def __init__(self):
        self.template_service = PromptTemplateService()

    def assemble(self, brand_brain: Dict[str, Any], creative_request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combines Brand Identity, Visual DNA, Colors, and the Creative Request 
        into a single Structured Prompt Object.
        """
        core = brand_brain.get("core", {})
        visual_dna = brand_brain.get("visual_dna", {})
        audience = brand_brain.get("audience", {})
        
        brand_name = core.get("brand_name", "")
        brand_tone = core.get("brand_tone", {}).get("value", "neutral")
        visual_style = visual_dna.get("visual_style", {}).get("value", "clean")
        photography_style = visual_dna.get("photography_style", {}).get("value", "lifestyle")
        lighting = visual_dna.get("lighting", {}).get("value", "natural")
        mood = visual_dna.get("image_mood", {}).get("value", "vibrant")
        
        primary_color = visual_dna.get("primary_color", {}).get("value", "")
        secondary_color = visual_dna.get("secondary_color", {}).get("value", "")
        
        creative_type = creative_request.get("creative_type", "Product Photography")
        platform = creative_request.get("platform", "Instagram Post")
        product = creative_request.get("product", "product")
        offer = creative_request.get("offer")
        festival = creative_request.get("festival")
        target_audience = creative_request.get("audience") or audience.get("primary_segment", "general")
        cta = creative_request.get("cta")

        # Fetch template
        template = self.template_service.get_template(creative_type)
        
        # Assemble sections
        subject = f"A professional {photography_style} photo of {product}"
        if festival:
            subject += f" themed around {festival} celebration"
            
        context = f"for a {visual_style} brand named {brand_name} targeting {target_audience}. Brand tone is {brand_tone}."
        
        visuals = f"Visual style: {visual_style}. Lighting: {lighting}. Mood: {mood}. Primary color: {primary_color}. Secondary color: {secondary_color}. {template.get('lighting', '')}."
        
        marketing = f"Platform: {platform}. Objective: {creative_request.get('objective', 'engagement')}."
        if offer:
            marketing += f" Featuring an offer: {offer}."
        if cta:
            marketing += f" Call to action: {cta}."
            
        composition = f"{template.get('composition', '')}. {template.get('camera_angle', '')}. {template.get('background', '')}."
        
        structured_prompt = {
            "subject": subject,
            "context": context,
            "visuals": visuals,
            "marketing": marketing,
            "composition": composition,
            "quality": template.get("quality", ""),
            "negative_prompt": self.template_service.get_negative_prompt(),
            "raw_text": f"{subject}, {context}, {visuals}, {composition}, {marketing}. {template.get('quality', '')}"
        }
        
        return structured_prompt

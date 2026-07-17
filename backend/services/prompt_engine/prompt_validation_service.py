from typing import Dict, Any, List

class PromptValidationService:
    def validate(self, brand_brain: Dict[str, Any], creative_request: Dict[str, Any]) -> List[str]:
        """
        Validates the Brand Brain and Creative Request to ensure all necessary 
        components are present before assembly.
        """
        errors = []

        # Validate Brand Brain presence
        if not brand_brain:
            errors.append("Brand Brain is missing or empty.")
            return errors

        visual_dna = brand_brain.get("visual_dna", {})
        core = brand_brain.get("core", {})
        
        # Validate required Brand Brain fields
        primary_color = visual_dna.get("primary_color")
        if not primary_color or not primary_color.get("value"):
            errors.append("Brand Brain is missing a primary color in Visual DNA.")

        brand_tone = core.get("brand_tone")
        if not brand_tone or not brand_tone.get("value"):
            errors.append("Brand Brain is missing a brand tone.")
            
        visual_style = visual_dna.get("visual_style")
        if not visual_style or not visual_style.get("value"):
            errors.append("Brand Brain is missing a visual style.")

        # Validate Creative Request
        if not creative_request:
            errors.append("Creative Request is missing.")
            return errors
            
        platform = creative_request.get("platform")
        if not platform:
            errors.append("Creative Request is missing a platform.")
            
        creative_type = creative_request.get("creative_type")
        if not creative_type:
            errors.append("Creative Request is missing a creative type.")

        product = creative_request.get("product")
        if not product:
            errors.append("Creative Request is missing a selected product.")

        return errors

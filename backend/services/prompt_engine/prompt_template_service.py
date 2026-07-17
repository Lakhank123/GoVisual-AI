from typing import Dict, Any

class PromptTemplateService:
    def __init__(self):
        # Reusable templates decoupled from specific brand data
        self.templates = {
            "Product Photography": {
                "composition": "Centered product focus, sharp details, professional studio setup",
                "camera_angle": "Eye-level or slight high angle to show product features",
                "lighting": "Soft studio lighting, balanced shadows",
                "background": "Clean, complementary to the product, non-distracting",
                "quality": "High resolution, photorealistic, sharp focus, 8k, award-winning photography"
            },
            "Offer Poster": {
                "composition": "Dynamic layout, clear space for typography, striking visual hierarchy",
                "camera_angle": "Straight on, bold perspective",
                "lighting": "High contrast, vibrant lighting",
                "background": "Solid or gradient matching brand colors to make offer pop",
                "quality": "Crisp vector-like clarity, high contrast, commercial advertisement style"
            },
            "Festival Creative": {
                "composition": "Festive elements framing the product, joyful arrangement",
                "camera_angle": "Eye-level, immersive perspective",
                "lighting": "Warm, festive lighting (e.g., bokeh, string lights, candles)",
                "background": "Thematic festival background without overwhelming the product",
                "quality": "Vibrant colors, rich textures, photorealistic"
            },
            "Luxury Branding": {
                "composition": "Minimalist, elegant, negative space",
                "camera_angle": "Dramatic low angle or intimate macro",
                "lighting": "Dramatic chiaroscuro, subtle highlights",
                "background": "Dark, premium textures (marble, velvet, silk)",
                "quality": "Cinematic, luxurious, editorial fashion photography"
            },
            "Minimal Branding": {
                "composition": "Rule of thirds, extreme negative space, clean lines",
                "camera_angle": "Straight on, flat lay",
                "lighting": "Even, bright natural light",
                "background": "Pure white or light pastel",
                "quality": "Ultra-clean, modern, minimalist, sharp"
            }
        }
        
        self.default_negative = "text, watermark, ugly, blurry, low resolution, deformed, bad proportions, bad lighting, cluttered"

    def get_template(self, creative_type: str) -> Dict[str, str]:
        """
        Returns a prompt template based on the creative type.
        Falls back to a general template if not found.
        """
        # Try exact match, otherwise try to map or fallback
        # In a real app, creative_type could map to these via a config
        return self.templates.get(creative_type, self.templates["Product Photography"])
        
    def get_negative_prompt(self) -> str:
        return self.default_negative

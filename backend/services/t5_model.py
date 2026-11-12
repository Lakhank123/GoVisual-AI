import os
import sys
import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _resolve_model_path(path_env: str) -> str:
    if os.path.isabs(path_env) and os.path.exists(path_env):
        return path_env
    if os.path.exists(path_env):
        return os.path.abspath(path_env)
    joined_base = os.path.join(BASE_DIR, path_env.lstrip("./\\"))
    if os.path.exists(joined_base):
        return os.path.abspath(joined_base)
    default_path = os.path.join(BASE_DIR, "ml_model")
    if os.path.exists(default_path):
        return os.path.abspath(default_path)
    return path_env

MODEL_PATH = _resolve_model_path(os.getenv("T5_MODEL_PATH", os.path.join(BASE_DIR, "ml_model")))
ALLOW_FALLBACK = os.getenv("T5_ALLOW_FALLBACK", "false").strip().lower() == "true"


class PromptService:

    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self.using_fallback = True

    def _load(self):
        if self._model is not None:
            return
        try:
            from transformers import T5Tokenizer, T5ForConditionalGeneration
            print(f"[T5] Loading tokenizer from: {MODEL_PATH}")
            self._tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
            print("[T5] Tokenizer loaded successfully.")
            
            print(f"[T5] Loading model from: {MODEL_PATH}")
            self._model = T5ForConditionalGeneration.from_pretrained(MODEL_PATH, local_files_only=True)
            self._model = self._model.to(self._device)
            self._model.eval()
            self.using_fallback = False
            print("[T5] Model loaded successfully.")
        except Exception as e:
            print(f"[T5 ERROR] Failed to load T5 model from {MODEL_PATH}")
            print(f"[T5 ERROR] Exception: {e}")
            self._model = None
            if not ALLOW_FALLBACK:
                raise RuntimeError(f"T5 model failed to load from {MODEL_PATH}: {e}")
            else:
                print("[T5] T5_ALLOW_FALLBACK is true, using fallback prompts.")

    def is_loaded(self) -> bool:
        return self._model is not None

    def build_input_string(self, **kwargs) -> str:
        # Standard Campaign & Brand Info
        input_text = (
            f"CAMPAIGN BRIEF:\nproduct: {kwargs.get('product', '')} | category: {kwargs.get('category', '')} | "
            f"purpose: {kwargs.get('purpose', '')} | offer: {kwargs.get('offer', '')}\n"
            f"BRAND PROFILE:\nbrand: {kwargs.get('brand_name', '')} | colors: {kwargs.get('brand_colors', '')}\n"
            f"CREATIVE STYLE:\nmood: {kwargs.get('mood', '')} | style: {kwargs.get('background', '')} | "
            f"format: {kwargs.get('format', '')} | lighting: {kwargs.get('lighting', '')}\n"
        )
        
        # Inject Visual Context if available
        analysis = kwargs.get('image_analysis')
        intent = kwargs.get('image_intent')
        
        if analysis:
            input_text += (
                f"\nREFERENCE IMAGE CONTEXT:\n"
                f"Product: {analysis.get('product_type', 'Product')} - {analysis.get('appearance', '')}\n"
                f"Colors: {', '.join(analysis.get('dominant_colors', []))}\n"
                f"Camera: {analysis.get('camera_angle', '')}\n"
                f"Background: {analysis.get('background', '')}\n"
                f"Lighting: {analysis.get('lighting', '')}\n"
                f"Composition: {analysis.get('composition', '')}\n"
                f"Style: {analysis.get('visual_style', '')}\n"
            )
            
        if intent:
            input_text += f"\nREFERENCE INTENT:\n{intent}\n"
            
            # Translate intent to T5 preserve instructions
            preserve = []
            allow = []
            if "only" in intent.lower():
                preserve = ["Product identity", "appearance", "colors", "shape"]
                allow = ["Background", "lighting", "composition", "camera angle"]
            elif "camera" in intent.lower():
                preserve = ["Product", "camera angle"]
                allow = ["Background", "lighting"]
            elif "lighting" in intent.lower():
                preserve = ["Product", "lighting characteristics"]
                allow = ["Background", "camera angle"]
            elif "background" in intent.lower():
                preserve = ["Product", "background"]
                allow = ["Lighting", "camera angle"]
            elif "entire" in intent.lower():
                preserve = ["Product", "camera angle", "framing", "background", "lighting", "composition"]
                allow = ["Minor stylistic enhancements"]
            elif "inspiration" in intent.lower():
                preserve = ["General vibe"]
                allow = ["Everything else, do not attempt strict reproduction"]
                
            if preserve:
                input_text += f"PRESERVE:\n{', '.join(preserve)}\nALLOW TO CHANGE:\n{', '.join(allow)}\n"

        return input_text

    def generate(self, input_text: str) -> list:
        print("\n=== [T5 GENERATION START] ===")
        print(f"[T5 INPUT]:\n{input_text}")
        
        self._load()
        if self._model is None:
            if not ALLOW_FALLBACK:
                raise RuntimeError("T5 model is not loaded and fallback is disabled.")
            return self._fallback_prompts(input_text)
            
        try:
            prefixed = "generate prompts: " + input_text
            inputs = self._tokenizer(
                prefixed, return_tensors="pt",
                max_length=256, truncation=True
            ).to(self._device)
            with torch.no_grad():
                outputs = self._model.generate(
                    **inputs, max_length=512, num_beams=4,
                    early_stopping=True, no_repeat_ngram_size=3,
                )
            decoded = self._tokenizer.decode(outputs[0], skip_special_tokens=True)
            print(f"[T5 RAW OUTPUT]:\n{decoded}")
            
            parsed_prompts = self._parse_output(decoded, input_text)
            for i, p in enumerate(parsed_prompts):
                print(f"[T5 PARSED PROMPT {i+1}]:\n{p}")
            print("=== [T5 GENERATION END] ===\n")
            
            return parsed_prompts
        except Exception as e:
            print(f"[T5 GENERATION ERROR]: {e}")
            if not ALLOW_FALLBACK:
                raise RuntimeError(f"T5 generate error: {e}")
            return self._fallback_prompts(input_text)

    def _parse_output(self, decoded: str, input_text: str) -> list:
        REF = (
            " Use the uploaded reference image to match the exact product "
            "model, color, and physical form. Do not substitute a generic product."
        )
        parts = decoded.split("[SEP]")
        prompts = []
        for part in parts[:3]:
            for prefix in ["PROMPT1:", "PROMPT2:", "PROMPT3:"]:
                part = part.replace(prefix, "")
            prompts.append(part.strip() + REF)
        fallbacks = self._fallback_prompts(input_text)
        while len(prompts) < 3:
            prompts.append(fallbacks[len(prompts)])
        return prompts[:3]

    def _fallback_prompts(self, input_text: str) -> list:
        # Simple extraction from the structured text
        product = "product"
        brand = "the brand"
        mood = "premium"
        bg = "studio"
        light = "cinematic"
        colors = "brand colors"
        intent = "inspiration"
        
        for line in input_text.split('\n'):
            line = line.lower()
            if "product:" in line and "category:" in line:
                product = line.split("product:")[1].split("|")[0].strip()
            if "brand:" in line:
                brand = line.split("brand:")[1].split("|")[0].strip()
            if "colors:" in line:
                colors = line.split("colors:")[1].split("|")[0].strip()
            if "mood:" in line:
                mood = line.split("mood:")[1].split("|")[0].strip()
            if "style:" in line:
                bg = line.split("style:")[1].split("|")[0].strip()
                
        # Parse intent directly from input_text block
        if "REFERENCE INTENT:" in input_text:
            intent_idx = input_text.find("REFERENCE INTENT:") + 17
            intent_end = input_text.find("PRESERVE:", intent_idx)
            if intent_end == -1: intent_end = len(input_text)
            intent = input_text[intent_idx:intent_end].strip().lower()

        # We are generating the scene/background to composite the real product onto.
        # Structured Prompts
        # BASIC VARIANT: Clean, minimalist, bright
        basic_prompt = (
            f"SUBJECT: High-end commercial product photography of {product} for {brand}. "
            f"SCENE: Clean, minimalist {bg} environment with subtle depth. "
            f"LIGHTING: Bright, even studio lighting, soft key light, natural highlights. "
            f"COMPOSITION: Center framing, natural perspective, realistic ground contact. "
            f"CAMERA: 85mm lens, f/8, sharp focus. "
            f"COLOR PALETTE: Neutral and {colors} accents. "
            f"MOOD: {mood}, professional, commercial."
        )
        
        # PROFESSIONAL VARIANT: Premium, lifestyle/editorial, sophisticated
        pro_prompt = (
            f"SUBJECT: Premium editorial lifestyle photography of {product} for {brand}. "
            f"SCENE: Sophisticated, high-end {bg} environment perfectly matching the product category. "
            f"LIGHTING: Dramatic directional lighting, {light}, soft natural shadows, rich contrast. "
            f"COMPOSITION: Dynamic 3/4 angle, elegant placement, cinematic depth. "
            f"CAMERA: 50mm lens, shallow depth of field (f/2.8), beautiful bokeh. "
            f"COLOR PALETTE: Rich {colors} gradient tones. "
            f"MOOD: {mood}, luxurious, premium."
        )
        
        # CREATIVE VARIANT: Cinematic, dramatic, artistic
        creative_prompt = (
            f"SUBJECT: Award-winning cinematic campaign photography of {product} for {brand}. "
            f"SCENE: Striking, artistic {bg} with volumetric atmosphere and environmental depth. "
            f"LIGHTING: Dramatic chiaroscuro, rim lighting, glowing {colors} accents, {light}. "
            f"COMPOSITION: Bold, experimental framing, epic scale, dynamic perspective. "
            f"CAMERA: 35mm lens, cinematic anamorphic look, extreme detail. "
            f"REALISM: Photorealistic CGI quality, physically accurate reflections and shadows. "
            f"MOOD: {mood}, epic, striking."
        )

        return [basic_prompt, pro_prompt, creative_prompt]

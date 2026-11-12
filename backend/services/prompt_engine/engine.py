import os
import torch
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

class PromptExpansionEngine:
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
            logger.info(f"Loading T5 from: {MODEL_PATH}")
            self._tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
            self._model = T5ForConditionalGeneration.from_pretrained(MODEL_PATH, local_files_only=True)
            self._model = self._model.to(self._device)
            self._model.eval()
            self.using_fallback = False
            logger.info("T5 model loaded successfully.")
        except Exception as e:
            logger.warning(f"T5 not loaded ({e}), using fallback rule-based generation.")
            self._model = None

    def _generate_master_prompt(self, fields: dict, image_analysis: str | None) -> str:
        """
        Creates ONE Master Marketing Prompt combining all context.
        """
        product = fields.get("product", "product")
        brand = fields.get("brand_name", "the brand")
        goal = fields.get("purpose", "")
        audience = fields.get("audience", "")
        cta = fields.get("offer", "")
        tone = fields.get("mood", "")
        style = fields.get("background", "")
        
        master = (
            f"Marketing campaign for {brand} featuring their {product}. "
            f"Style: {style}. Tone: {tone}. "
        )
        if goal:
            master += f"Goal: {goal}. "
        if audience:
            master += f"Target Audience: {audience}. "
        if cta:
            master += f"Call to Action: {cta}. "

        if image_analysis:
            master += f"\n[IMAGE CONTEXT TO PRESERVE: {image_analysis}]"

        logger.info(f"Master Prompt Generated:\n{master}")
        return master

    def expand(self, fields: dict, image_analysis: str | None = None) -> tuple[str, dict[str, str]]:
        """
        Takes inputs and image context, generates the Master Prompt, and expands it into 3 variations.
        Returns (Master Prompt, {tier: expanded_prompt})
        """
        master_prompt = self._generate_master_prompt(fields, image_analysis)
        
        self._load()
        if self._model is None:
            expanded = self._fallback_expansion(master_prompt, fields, image_analysis)
            return master_prompt, expanded
            
        try:
            # We use the T5 model to generate variations based on the master prompt
            prefixed = "expand marketing prompt: " + master_prompt
            inputs = self._tokenizer(
                prefixed, return_tensors="pt",
                max_length=512, truncation=True
            ).to(self._device)
            
            with torch.no_grad():
                outputs = self._model.generate(
                    **inputs, max_length=1024, num_beams=4,
                    early_stopping=True, no_repeat_ngram_size=3,
                )
            decoded = self._tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Assuming T5 is fine-tuned to output [SEP] separated variations, 
            # or we gracefully fallback to rule-based parsing
            expanded = self._parse_t5_output(decoded, master_prompt, fields, image_analysis)
            return master_prompt, expanded
            
        except Exception as e:
            logger.error(f"T5 generation error: {e}. Falling back to rule-based expansion.")
            expanded = self._fallback_expansion(master_prompt, fields, image_analysis)
            return master_prompt, expanded

    def _parse_t5_output(self, decoded: str, master_prompt: str, fields: dict, image_analysis: str | None) -> dict[str, str]:
        parts = decoded.split("[SEP]")
        prompts = {}
        tiers = ["Basic", "Professional", "Creative"]
        
        for i, part in enumerate(parts[:3]):
            if i < len(tiers):
                # Clean up any PROMPT: prefixes
                for prefix in ["PROMPT1:", "PROMPT2:", "PROMPT3:", "Basic:", "Professional:", "Creative:"]:
                    part = part.replace(prefix, "")
                prompts[tiers[i]] = part.strip()
                
        # Fill missing with fallbacks
        fallbacks = self._fallback_expansion(master_prompt, fields, image_analysis)
        for t in tiers:
            if t not in prompts or len(prompts[t]) < 10:
                prompts[t] = fallbacks[t]
                
        return prompts

    def _fallback_expansion(self, master_prompt: str, fields: dict, image_analysis: str | None) -> dict[str, str]:
        brand_colors = fields.get("brand_colors", "")
        product = fields.get("product", "product")
        
        preservation = ""
        if image_analysis:
            preservation = f" PRESERVE EXACT PRODUCT DETAILS: {image_analysis}."

        basic = f"{master_prompt}. Clean, straightforward commercial photograph. Sharp focus, brand accurate colors ({brand_colors}).{preservation}"
        prof = f"{master_prompt}. High-end professional advertising studio shot. Dramatic lighting, dynamic angles. {brand_colors} thematic elements.{preservation}"
        creative = f"{master_prompt}. Artistic, highly stylized, visually striking composition. Unique environmental storytelling. Cinematic grading. {brand_colors} accents.{preservation}"

        return {
            "Basic": basic,
            "Professional": prof,
            "Creative": creative
        }

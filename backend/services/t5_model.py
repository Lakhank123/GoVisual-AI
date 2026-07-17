import os
import torch

MODEL_PATH = os.getenv("T5_MODEL_PATH", "./ml_model")


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
            print(f"Loading T5 from: {MODEL_PATH}")
            self._tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
            self._model = T5ForConditionalGeneration.from_pretrained(MODEL_PATH, local_files_only=True)
            self._model = self._model.to(self._device)
            self._model.eval()
            self.using_fallback = False
            print("T5 model loaded.")
        except Exception as e:
            print(f"T5 not loaded ({e}), using fallback.")
            self._model = None

    def is_loaded(self) -> bool:
        return self._model is not None

    def generate(self, input_text: str) -> list:
        self._load()
        if self._model is None:
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
            return self._parse_output(decoded, input_text)
        except Exception as e:
            print(f"T5 generate error: {e}")
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
        fields = {}
        for part in input_text.split("|"):
            if ":" in part:
                k, v = part.split(":", 1)
                fields[k.strip()] = v.strip()
        product = fields.get("product", "product")
        brand = fields.get("brand", "the brand")
        price = fields.get("price", "")
        mood = fields.get("mood", "premium")
        bg = fields.get("background", "studio")
        light = fields.get("lighting", "cinematic")
        colors = fields.get("colors", "brand colors")
        REF = " Use the uploaded reference image to match the exact product."
        return [
            (f"Clean commercial photograph of {product} for {brand}. "
             f"Front angle, {bg} background, even {light} lighting. "
             f"Brand name at bottom, price Rs.{price} visible. "
             f"Mood: {mood}. Deep focus, all details sharp." + REF),
            (f"Premium brand photography of {product} for {brand}. "
             f"Dynamic 3/4 angle with dramatic {light}. "
             f"{colors} palette in background gradients. "
             f"Shallow bokeh, brand name in bold sans-serif. "
             f"Price Rs.{price} as floating badge. Mood: {mood}." + REF),
            (f"Cinematic campaign image of {product} for {brand}. "
             f"Artistic angle with volumetric light in {colors}. "
             f"Atmospheric {bg} with particle depth layers. "
             f"Brand name typographically integrated as light. "
             f"Rs.{price} in frosted glass badge. "
             f"Award-winning CGI quality." + REF),
        ]

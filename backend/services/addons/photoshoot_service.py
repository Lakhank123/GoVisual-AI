"""
GoVisual AI — Addon: AI Product Photoshoot Service
Reference-conditioned product photoshoot pipeline supporting AI Model, Product Studio, and Lifestyle modes.
"""
import os
import io
import re
import json
import base64
import logging
from typing import List, Dict, Any, Optional
import httpx
from PIL import Image
from services.image_guardrails import sanitize_and_validate_image, ValidationError

logger = logging.getLogger(__name__)

# Server-side trusted catalog mapping for approved preset models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRESET_MODELS_DIR = os.path.join(BASE_DIR, "..", "frontend", "public", "models", "photoshoot")

PRESET_MODEL_CATALOG: Dict[str, Dict[str, str]] = {
    "aarav": {
        "name": "Aarav",
        "gender": "male",
        "style": "Modern Commercial",
        "filename": "aarav.png",
        "description": "modern commercial Indian male model in his late 20s, confident, approachable, clean-groomed, premium lifestyle aesthetic",
    },
    "rohan": {
        "name": "Rohan",
        "gender": "male",
        "style": "Clean Professional",
        "filename": "rohan.png",
        "description": "sharp professional Indian male model aged 30-35, polished corporate grooming, neat hair, trustworthy executive appearance",
    },
    "kabir": {
        "name": "Kabir",
        "gender": "male",
        "style": "Bold Editorial",
        "filename": "kabir.png",
        "description": "bold high-fashion Indian male model in his mid 20s, striking angular features, editorial intensity, contemporary trendsetter",
    },
    "ananya": {
        "name": "Ananya",
        "gender": "female",
        "style": "Natural Contemporary",
        "filename": "ananya.png",
        "description": "radiant contemporary Indian female model in her mid 20s, natural fresh makeup, warm graceful smile, authentic elegance",
    },
    "meera": {
        "name": "Meera",
        "gender": "female",
        "style": "Elegant Luxury",
        "filename": "meera.png",
        "description": "sophisticated luxury Indian female model aged 28-34, poised regal demeanor, refined classical poise, high-end couture aesthetic",
    },
    "isha": {
        "name": "Isha",
        "gender": "female",
        "style": "Youthful Expressive",
        "filename": "isha.png",
        "description": "vibrant youthful Indian female model aged 20-25, expressive dynamic charm, playful modern Gen Z aesthetic",
    },
}

BACKGROUND_PROMPTS: Dict[str, str] = {
    # Preset IDs
    "white-studio": "pure white infinite studio cyclorama, high-key commercial lighting, soft diffused floor reflections",
    "gradient-blue": "smooth minimal blue studio gradient with subtle ambient rim light and clean backdrop",
    "mumbai-street": "sunlit Mumbai urban lifestyle setting, soft cinematic depth of field, warm architectural bokeh",
    "festive-diwali": "luxurious festive celebratory interior, warm ambient diya glow, golden fairy lights with soft bokeh",
    "nature-green": "organic botanical aesthetic, lush natural foliage, soft dappled morning sunlight, fresh wellness atmosphere",
    "luxury-dark": "moody dark luxury setup, matte charcoal background, dramatic sculptural accent lighting, golden highlights",
    # Canonical questionnaire background choices
    "bright studio white": "pure white clean commercial studio cyclorama, high-key commercial lighting, pristine floor reflections",
    "plain white": "pure white seamless clean e-commerce studio background, minimal diffused shadows",
    "outdoor lifestyle": "authentic sunlit outdoor lifestyle environment, natural urban architectural depth of field, organic daytime setting",
    "dark tech": "modern dark tech atmosphere, sleek matte charcoal surfaces, subtle futuristic ambient accents, dramatic contrast",
    "abstract gradient": "smooth contemporary abstract studio gradient backdrop, soft rim illumination, clean minimalist aesthetic",
    "festive themed": "luxurious festive celebratory interior, warm ambient diya glow, golden fairy lights with soft celebratory bokeh",
}

LIGHTING_PROMPTS: Dict[str, str] = {
    "soft natural light": "soft diffused natural window light, gentle wrap-around illumination, low contrast, flattering true-to-life tones",
    "dramatic spotlight": "dramatic commercial spotlight illumination, sharp defined highlights, deep contrast, focused artistic shadows",
    "neon glow": "vibrant contemporary neon glow, dual-tone edge accents, electric atmospheric mood, cinematic color reflections",
    "bright daylight": "crisp bright natural daylight, clear luminous illumination, rich true-to-life colors, clean sunlight shadows",
    "cinematic dark": "cinematic moody low-key lighting, sculptural rim lights, dramatic shadows, sophisticated ambient contrast",
}

MOOD_PROMPTS: Dict[str, str] = {
    "premium & luxurious": "ultra-premium luxury aesthetic, opulent elegance, refined high-end craftsmanship atmosphere",
    "bold & energetic": "bold high-energy visual tone, striking dynamic contrast, vivid presence, confident vibrancy",
    "clean & minimal": "clean minimalist Scandinavian styling, uncluttered breathing room, pure modern simplicity",
    "warm & friendly": "warm approachable welcoming mood, cozy comfortable tones, authentic relatable charm",
    "festive & colorful": "festive celebration atmosphere, vibrant joyful colors, celebratory cultural richness",
}

def build_photoshoot_prompt(
    product_name: str,
    shot_label: str,
    shot_desc: str,
    mode: str,
    product_desc: str = "",
    model_ref: Optional[Dict[str, Any]] = None,
    background: str = "",
    lighting: str = "",
    mood: str = "",
    price: Optional[str] = None,
    offer: Optional[str] = None,
    urgency: Optional[str] = None,
    main_text: Optional[str] = None,
    language: Optional[str] = None,
    brand_name: Optional[str] = None,
) -> str:
    """
    Pure prompt construction utility that incorporates all user questionnaire answers
    and photoshoot settings into a single cohesive, non-contradictory prompt.
    Tested without requiring external AI API calls.
    """
    # 1. Shot role and composition
    prompt_elements = [
        f"Commercial advertisement product photography: {shot_label} — {shot_desc}.",
        f"Mode: {mode}.",
        f"Product: {product_name}. Visual specifics: {product_desc or product_name}.",
    ]

    # 2. Setting / Background (canonical resolution without contradictory overrides)
    bg_raw = background or "bright studio white"
    bg_key = bg_raw.strip().lower()
    bg_resolved = BACKGROUND_PROMPTS.get(bg_key, BACKGROUND_PROMPTS.get(bg_raw, bg_raw))
    prompt_elements.append(f"Setting: {bg_resolved}.")

    # 3. Model or Product-Only Instruction
    if model_ref and model_ref.get("image_bytes"):
        model_prompt_text = (
            f"Features Indian model {model_ref['name']} ({model_ref.get('style', '')}): {model_ref.get('description', '')}. "
            "The reference image shows the product on the left and the model on the right. "
            "Composite them so the model naturally wears or presents the product."
        )
    elif model_ref:
        model_prompt_text = (
            f"AUTHORITATIVE ADULT MODEL SPECIFICATION: Features adult Indian model {model_ref['name']} "
            f"({model_ref.get('style', '')}): {model_ref.get('description', '')}. "
            "Incorporate the model naturally interacting with, wearing, or presenting the product."
        )
    else:
        model_prompt_text = "Strict product-only composition. Do not introduce people, faces, hands, or body parts."
    prompt_elements.append(model_prompt_text)

    # 4. Lighting condition
    if lighting and lighting.strip():
        lt_key = lighting.strip().lower()
        lt_resolved = LIGHTING_PROMPTS.get(lt_key, lighting.strip())
        prompt_elements.append(f"Lighting: {lt_resolved}.")

    # 5. Visual mood
    if mood and mood.strip():
        mood_key = mood.strip().lower()
        mood_resolved = MOOD_PROMPTS.get(mood_key, mood.strip())
        prompt_elements.append(f"Visual mood: {mood_resolved}.")

    # 6. Commercial details (Offer, Urgency, Price)
    if offer and str(offer).strip() and str(offer).strip().lower() != "no offer":
        prompt_elements.append(f"Promotional offer context: {str(offer).strip()}.")
    if urgency and str(urgency).strip() and str(urgency).strip().lower() != "no urgency":
        prompt_elements.append(f"Campaign urgency: {str(urgency).strip()}.")
    if price and str(price).strip():
        prompt_elements.append(f"Price positioning: ₹{str(price).strip()}.")

    # 7. Brand and Language context
    if brand_name and str(brand_name).strip() and str(brand_name).strip().lower() not in ("my brand", "your shop"):
        prompt_elements.append(f"Brand context: {str(brand_name).strip()}.")
    if language and str(language).strip() and str(language).strip().lower() != "english":
        prompt_elements.append(f"Target audience language context: {str(language).strip()}.")

    # 8. Main text headline
    if main_text and str(main_text).strip():
        prompt_elements.append(f"Campaign headline / visual badge requirement: '{str(main_text).strip()}'.")

    # 9. Style anchor
    prompt_elements.append("Style: high-end commercial e-commerce photography, medium quality, crisp focus, accurate lighting.")

    return " ".join(prompt_elements)

# Exactly 3 distinct shot compositions by mode
MODE_SHOT_COMPOSITIONS: Dict[str, List[tuple]] = {
    "model": [
        ("Lifestyle Close-Up", "close-up editorial shot, model interacting with or wearing the product naturally, crisp focus on product details with model's face and hands in harmonious composition"),
        ("Hero Showcase", "three-quarter commercial portrait framing, model presenting the product prominently in balanced hero lighting"),
        ("Macro Detail", "tight macro focus on the product craftsmanship, textures, and finishes as worn or held by the model"),
    ],
    "product_only": [
        ("Product Hero", "isolated hero angle, perfectly level product center-frame, commercial e-commerce lighting, pristine reflections"),
        ("Detail Shot", "macro texture close-up focusing strictly on fine materials, branding, craftsmanship, and build quality"),
        ("Studio Setting", "three-quarter angled studio shot of the product positioned cleanly on a premium pedestal with subtle shadows"),
    ],
    "lifestyle": [
        ("Contextual In-Use", "natural candid scene capturing the product in an authentic daily environment and lifestyle context"),
        ("Atmospheric Hero", "wide environmental lifestyle composition framing the product organically within ambient architectural decor"),
        ("Macro Lifestyle", "intimate close-up of the product amidst authentic lifestyle props and complementary natural elements"),
    ],
}


def sanitize_error(msg: str) -> str:
    """Strip API keys, tokens, and internal filesystem paths from error messages."""
    if not msg:
        return "Unknown error"
    # Redact OpenAI keys
    msg = re.sub(r"sk-[a-zA-Z0-9_\-]{20,}", "[REDACTED_KEY]", msg)
    # Redact Google / Gemini keys
    msg = re.sub(r"AIza[a-zA-Z0-9_\-]{30,}", "[REDACTED_KEY]", msg)
    # Redact Bearer tokens
    msg = re.sub(r"Bearer\s+[a-zA-Z0-9_\.\-]+", "Bearer [REDACTED]", msg)
    # Redact Windows local drive paths (e.g. C:\Users\...)
    msg = re.sub(r"[A-Za-z]:\\[A-Za-z0-9_.\\]+", "[INTERNAL_PATH]", msg)
    # Redact Unix absolute paths (/Users/..., /home/...)
    msg = re.sub(r"(?:/[a-zA-Z0-9_.-]+){3,}", "[INTERNAL_PATH]", msg)
    return msg


class PhotoshootService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_AI_API_KEY") or ""
        self.openai_image_model = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2").strip()
        self.openai_image_quality = os.getenv("OPENAI_IMAGE_QUALITY", "medium").strip()
        self.openai_image_size = os.getenv("OPENAI_IMAGE_SIZE", "1024x1024").strip()
        # In-memory storage cache for validated custom adult models (scoped by model_id)
        self._custom_models: Dict[str, Dict[str, Any]] = {}
        # Persistent storage directory for custom models to survive restarts and multi-workers
        self.custom_models_dir = os.path.join("generated_images", "custom_models")
        os.makedirs(self.custom_models_dir, exist_ok=True)
        self._load_persisted_custom_models()

    def _load_persisted_custom_models(self):
        """Loads persisted custom model metadata and references from disk if available."""
        if not os.path.exists(self.custom_models_dir):
            return
        try:
            for item in os.listdir(self.custom_models_dir):
                item_path = os.path.join(self.custom_models_dir, item)
                if os.path.isdir(item_path) and item.startswith("custom_"):
                    meta_file = os.path.join(item_path, "metadata.json")
                    if os.path.exists(meta_file):
                        with open(meta_file, "r", encoding="utf-8") as f:
                            meta = json.load(f)
                        img_bytes = None
                        img_file = os.path.join(item_path, "reference.png")
                        if os.path.exists(img_file):
                            with open(img_file, "rb") as img_f:
                                img_bytes = img_f.read()
                        meta["image_bytes"] = img_bytes
                        self._custom_models[meta["id"]] = meta
        except Exception as e:
            logger.warning("[Photoshoot] Failed loading persisted custom models: %s", e)

    def _persist_custom_model(self, model_entry: Dict[str, Any]):
        """Persists custom model metadata and image bytes to server disk for multi-worker / restart durability."""
        try:
            model_id = model_entry["id"]
            model_folder = os.path.join(self.custom_models_dir, model_id)
            os.makedirs(model_folder, exist_ok=True)
            meta = {k: v for k, v in model_entry.items() if k != "image_bytes"}
            meta_path = os.path.join(model_folder, "metadata.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)
            if model_entry.get("image_bytes"):
                img_path = os.path.join(model_folder, "reference.png")
                with open(img_path, "wb") as f:
                    f.write(model_entry["image_bytes"])
        except Exception as e:
            logger.warning("[Photoshoot] Failed persisting custom model %s: %s", model_entry.get("id"), e)


    def register_custom_model(
        self,
        name: str,
        gender: str,
        age: int,
        style: str,
        skin_tone: str = "medium",
        hair_style: str = "neat professional",
        description: str = "",
        reference_image_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """
        Validates and registers a custom fictional adult model.
        Strictly enforces adult constraints (age >= 18) and sanitizes identifiers.
        Never trusts client-supplied filesystem paths.
        """
        if not name or not name.strip():
            raise ValueError("Custom model name is required.")
        clean_name = name.strip()

        # Enforce adult constraint
        if not isinstance(age, int) or age < 18:
            raise ValueError(f"Custom model must be an adult (age 18+). Received age: {age}")
        if age > 95:
            raise ValueError("Age must be realistic for commercial modeling (under 95).")

        clean_gender = gender.strip().lower() if gender else "female"
        if clean_gender not in ("male", "female", "non-binary"):
            clean_gender = "female"

        clean_style = style.strip() if style else "Modern Commercial"
        clean_skin_tone = skin_tone.strip() if skin_tone else "medium"
        clean_hair_style = hair_style.strip() if hair_style else "neat professional"

        # Synthesize authoritative adult model description if not provided
        if not description or not description.strip():
            desc = (
                f"fictional adult Indian {clean_gender} model aged {age}, {clean_style} presentation, "
                f"{clean_skin_tone} skin tone, {clean_hair_style} hair, confident photogenic commercial appearance"
            )
        else:
            desc = description.strip()

        # Generate safe model ID slug (custom_{slug}_{suffix})
        slug = re.sub(r"[^a-z0-9]", "_", clean_name.lower()).strip("_")
        custom_id = f"custom_{slug}"

        # Validate reference image if provided
        if reference_image_bytes:
            try:
                sanitize_and_validate_image(reference_image_bytes)
            except ValidationError as ve:
                raise ValueError(ve.message)
            except Exception as e:
                raise ValueError(f"Custom model image is not a valid image format: {e}")

        model_entry = {
            "id": custom_id,
            "name": clean_name,
            "gender": clean_gender,
            "age": age,
            "style": clean_style,
            "skin_tone": clean_skin_tone,
            "hair_style": clean_hair_style,
            "description": desc,
            "is_custom": True,
            "image_bytes": reference_image_bytes,
        }

        self._custom_models[custom_id] = model_entry
        self._persist_custom_model(model_entry)
        return model_entry

    def get_model_reference(self, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Safely resolve a preset or custom model ID to trusted reference data.
        Never trusts client-supplied filesystem paths. Only maps from PRESET_MODEL_CATALOG
        or server-registered custom models.
        """
        if not model_id or not isinstance(model_id, str):
            return None

        clean_id = model_id.strip().lower()

        # Check in-memory custom models first
        if clean_id in self._custom_models:
            return self._custom_models[clean_id]

        # Check disk-persisted custom models (e.g. registered in another worker)
        disk_model_folder = os.path.join(self.custom_models_dir, clean_id)
        if os.path.exists(disk_model_folder):
            meta_file = os.path.join(disk_model_folder, "metadata.json")
            if os.path.exists(meta_file):
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    img_bytes = None
                    img_file = os.path.join(disk_model_folder, "reference.png")
                    if os.path.exists(img_file):
                        with open(img_file, "rb") as img_f:
                            img_bytes = img_f.read()
                    meta["image_bytes"] = img_bytes
                    self._custom_models[clean_id] = meta
                    return meta
                except Exception as e:
                    logger.warning("[Photoshoot] Error loading disk model %s: %s", clean_id, e)

        if clean_id not in PRESET_MODEL_CATALOG:
            return None

        entry = PRESET_MODEL_CATALOG[clean_id]
        file_path = os.path.join(PRESET_MODELS_DIR, entry["filename"])

        # Also support capitalized fallback on case-sensitive filesystems
        if not os.path.exists(file_path):
            alt_path = os.path.join(PRESET_MODELS_DIR, entry["filename"].capitalize())
            if os.path.exists(alt_path):
                file_path = alt_path

        if not os.path.exists(file_path):
            logger.warning("[Photoshoot] Model reference image not found on disk for model: %s", clean_id)
            return None

        with open(file_path, "rb") as f:
            image_bytes = f.read()

        return {
            "id": clean_id,
            "name": entry["name"],
            "gender": entry["gender"],
            "style": entry["style"],
            "description": entry["description"],
            "image_bytes": image_bytes,
            "is_custom": False,
        }

    async def generate_photoshoot(
        self,
        product_image_bytes: bytes,
        product_name: str,
        avatar_id: str = "studio-plain",
        background_id: str = "white-studio",
        mode: str = "model",
        include_model: bool = True,
        shot_count: int = 3,
        logo_bytes: Optional[bytes] = None,
        creative_context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate reference-aware product photoshoot images.
        Consumes separate product and model visual references based on active mode.
        Returns exactly 3 distinct output candidates by default.
        """
        # Validate product image with guardrails
        try:
            sanitized_product_bytes, _, _ = sanitize_and_validate_image(product_image_bytes)
            product_image_bytes = sanitized_product_bytes
        except ValidationError as ve:
            raise ValueError(ve.message)
        except Exception as e:
            raise ValueError(f"Uploaded product file is not a valid image: {e}")

        # Validate mode strictly against canonical photoshoot modes
        canonical_modes = {"model", "product_only", "lifestyle"}
        if mode not in canonical_modes:
            allowed = ", ".join(sorted(canonical_modes))
            raise ValueError(f"Invalid photoshoot mode '{mode}'. Allowed modes are: {allowed}.")
        normalized_mode = mode

        # Resolve model reference according to mode requirements
        model_ref: Optional[Dict[str, Any]] = None

        if normalized_mode == "model":
            if not avatar_id or avatar_id == "studio-plain":
                raise ValueError("AI Model Photoshoot mode requires an approved model ID (e.g. aarav, ananya, meera, rohan, kabir, isha).")
            model_ref = self.get_model_reference(avatar_id)
            if not model_ref:
                allowed = ", ".join(sorted(PRESET_MODEL_CATALOG.keys()))
                raise ValueError(f"Invalid model ID '{avatar_id}'. AI Model mode requires one of: {allowed}.")

        elif normalized_mode == "product_only":
            # Strict product studio mode: zero human references
            model_ref = None

        elif normalized_mode == "lifestyle":
            # Lifestyle mode: reference model included only if requested and valid
            if include_model:
                if avatar_id and avatar_id != "studio-plain":
                    model_ref = self.get_model_reference(avatar_id)
                    if not model_ref:
                        allowed = ", ".join(sorted(PRESET_MODEL_CATALOG.keys()))
                        raise ValueError(f"Invalid model ID '{avatar_id}' for lifestyle photoshoot with model. Allowed models are: {allowed}.")
                else:
                    model_ref = None
            else:
                model_ref = None

        # Contextual background description (favor explicit user questionnaire choice)
        user_bg = (creative_context.get("background") if creative_context else None) or background_id
        bg_desc = BACKGROUND_PROMPTS.get(user_bg.strip().lower(), BACKGROUND_PROMPTS.get(background_id, BACKGROUND_PROMPTS["white-studio"]))

        # Visual product understanding via multimodal vision (if OpenAI key available)
        product_desc = ""
        if self.openai_api_key:
            try:
                product_desc = await self._describe_product(product_image_bytes)
            except Exception as e:
                logger.warning("[Photoshoot] Product vision description warning: %s", sanitize_error(str(e)))

        # Exactly 3 candidate compositions by mode
        compositions = MODE_SHOT_COMPOSITIONS.get(normalized_mode, MODE_SHOT_COMPOSITIONS["model"])
        candidate_shots = compositions[:shot_count]
        results: List[Dict[str, Any]] = []

        for shot_label, shot_desc in candidate_shots:
            try:
                generated_bytes = await self._dispatch_reference_generation(
                    product_image_bytes=product_image_bytes,
                    product_name=product_name,
                    product_desc=product_desc,
                    model_ref=model_ref,
                    bg_desc=bg_desc,
                    shot_label=shot_label,
                    shot_desc=shot_desc,
                    mode=normalized_mode,
                    creative_context=creative_context,
                )

                if logo_bytes:
                    try:
                        from services.logo_overlay import apply_exact_logo
                        generated_bytes = apply_exact_logo(generated_bytes, logo_bytes)
                    except Exception as le:
                        logger.warning("[Photoshoot] Logo overlay failed: %s", le)

                # Deterministic exact text overlay if requested by user
                exact_text = ""
                if creative_context:
                    exact_text = str(creative_context.get("main_text") or creative_context.get("mainText") or "").strip()
                if exact_text:
                    try:
                        from services.text_overlay import apply_exact_text_overlay
                        generated_bytes = apply_exact_text_overlay(generated_bytes, exact_text)
                    except Exception as te:
                        logger.warning("[Photoshoot] Text overlay warning: %s", te)

                b64 = base64.b64encode(generated_bytes).decode("utf-8")
                results.append({
                    "label": shot_label,
                    "image_b64": b64,
                    "success": True,
                    "mode": normalized_mode,
                    "model_id": model_ref["id"] if model_ref else None,
                })
            except Exception as exc:
                clean_err = sanitize_error(str(exc))
                logger.error("[Photoshoot] Shot '%s' failed: %s", shot_label, clean_err)
                results.append({
                    "label": shot_label,
                    "image_b64": "",
                    "success": False,
                    "error": clean_err,
                    "mode": normalized_mode,
                })

        return results

    async def _describe_product(self, product_bytes: bytes) -> str:
        """Use OpenAI gpt-4o-mini with Vision to extract precise visual features of the product."""
        b64_str = base64.b64encode(product_bytes).decode("utf-8")
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Describe the exact physical product in this image in under 35 words: "
                                "product type, materials, dominant colors, geometric silhouette, visible branding/logos, "
                                "and defining visual features. Focus exclusively on the physical product."
                            ),
                        },
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_str}"}},
                    ],
                }
            ],
            "max_tokens": 120,
        }
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            logger.warning("[Photoshoot] Vision call status %d: %s", resp.status_code, sanitize_error(resp.text[:100]))
        return ""

    async def _dispatch_reference_generation(
        self,
        product_image_bytes: bytes,
        product_name: str,
        product_desc: str,
        model_ref: Optional[Dict[str, Any]],
        bg_desc: str,
        shot_label: str,
        shot_desc: str,
        mode: str,
        creative_context: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """
        Dispatches reference-conditioned image generation using OpenAI images.edit.
        Reuses the existing OpenAI provider, model configuration, and OPENAI_API_KEY.
        """
        if not self.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured for Photoshoot image generation.")

        return await self._generate_openai_reference(
            product_image_bytes=product_image_bytes,
            product_name=product_name,
            product_desc=product_desc,
            model_ref=model_ref,
            bg_desc=bg_desc,
            shot_label=shot_label,
            shot_desc=shot_desc,
            mode=mode,
            creative_context=creative_context,
        )



    def _create_dual_reference_canvas(self, product_bytes: bytes, model_bytes: bytes) -> bytes:
        """Create a side-by-side composite reference image for dual reference conditioning."""
        with Image.open(io.BytesIO(product_bytes)) as prod_img, Image.open(io.BytesIO(model_bytes)) as mod_img:
            prod_rgb = prod_img.convert("RGB")
            mod_rgb = mod_img.convert("RGB")

            canvas = Image.new("RGB", (1024, 1024), (255, 255, 255))
            # Left half: 512x1024 (contain fit product)
            prod_copy = prod_rgb.copy()
            prod_copy.thumbnail((512, 1024), Image.Resampling.LANCZOS)
            x_p = (512 - prod_copy.width) // 2
            y_p = (1024 - prod_copy.height) // 2
            canvas.paste(prod_copy, (x_p, y_p))

            # Right half: 512x1024 (contain fit model)
            mod_copy = mod_rgb.copy()
            mod_copy.thumbnail((512, 1024), Image.Resampling.LANCZOS)
            x_m = 512 + (512 - mod_copy.width) // 2
            y_m = (1024 - mod_copy.height) // 2
            canvas.paste(mod_copy, (x_m, y_m))

            out_buf = io.BytesIO()
            canvas.save(out_buf, format="PNG")
            return out_buf.getvalue()

    async def _generate_openai_reference(
        self,
        product_image_bytes: bytes,
        product_name: str,
        product_desc: str,
        model_ref: Optional[Dict[str, Any]],
        bg_desc: str,
        shot_label: str,
        shot_desc: str,
        mode: str,
        creative_context: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """
        OpenAI Reference-Conditioned Generation using images.edit.
        When model reference is included, composites product + model into a dual-reference canvas.
        Uses medium quality where supported.
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.openai_api_key)

        if model_ref and model_ref.get("image_bytes"):
            composite_bytes = self._create_dual_reference_canvas(
                product_bytes=product_image_bytes,
                model_bytes=model_ref["image_bytes"],
            )
            ref_image_tuple = ("dual_reference.png", composite_bytes, "image/png")
            model_prompt_text = (
                f"Features Indian model {model_ref['name']} ({model_ref['style']}): {model_ref['description']}. "
                "The reference image shows the product on the left and the model on the right. "
                "Composite them so the model naturally wears or presents the product."
            )
        elif model_ref:
            ref_image_tuple = ("product.png", product_image_bytes, "image/png")
            model_prompt_text = (
                f"AUTHORITATIVE ADULT MODEL SPECIFICATION: Features adult Indian model {model_ref['name']} "
                f"({model_ref.get('style', '')}): {model_ref.get('description', '')}. "
                "Incorporate the model naturally interacting with, wearing, or presenting the product."
            )
        else:
            ref_image_tuple = ("product.png", product_image_bytes, "image/png")
            model_prompt_text = "Strict product-only composition. Do not introduce people, faces, hands, or body parts."

        user_bg = (creative_context.get("background") if creative_context else None) or bg_desc
        user_lighting = (creative_context.get("lighting") if creative_context else None) or ""
        user_mood = (creative_context.get("mood") if creative_context else None) or ""
        user_price = creative_context.get("price") if creative_context else None
        user_offer = creative_context.get("offer") if creative_context else None
        user_urgency = creative_context.get("urgency") if creative_context else None
        user_main_text = (creative_context.get("main_text") or creative_context.get("mainText")) if creative_context else None
        user_language = creative_context.get("language") if creative_context else None
        user_brand = (creative_context.get("brand_name") or creative_context.get("businessName")) if creative_context else None

        full_prompt = build_photoshoot_prompt(
            product_name=product_name,
            shot_label=shot_label,
            shot_desc=shot_desc,
            mode=mode,
            product_desc=product_desc,
            model_ref=model_ref,
            background=user_bg,
            lighting=user_lighting,
            mood=user_mood,
            price=user_price,
            offer=user_offer,
            urgency=user_urgency,
            main_text=user_main_text,
            language=user_language,
            brand_name=user_brand,
        )

        model_to_use = self.openai_image_model or os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2").strip()
        kwargs: Dict[str, Any] = {
            "model": model_to_use,
            "image": ref_image_tuple,
            "prompt": full_prompt[:1000],
            "size": self.openai_image_size or "1024x1024",
            "n": 1,
        }
        # DALL-E 2 edit does not support quality parameter; pass quality for gpt-image models
        if model_to_use != "dall-e-2":
            kwargs["quality"] = self.openai_image_quality or "medium"

        try:
            response = await client.images.edit(**kwargs)
        except Exception as e:
            sanitized = sanitize_error(str(e))
            raise RuntimeError(f"OpenAI reference generation failed: {sanitized}")

        if response.data and response.data[0].b64_json:
            return base64.b64decode(response.data[0].b64_json)
        elif response.data and response.data[0].url:
            async with httpx.AsyncClient(timeout=45) as dl:
                img_res = await dl.get(response.data[0].url)
                if img_res.status_code == 200:
                    return img_res.content

        raise ValueError("No valid image data received from OpenAI reference generation.")

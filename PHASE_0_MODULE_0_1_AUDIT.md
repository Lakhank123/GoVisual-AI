# GO VISUAL AI 2.0 — PHASE 0 — MODULE 0.1 AUDIT

## 1. Current Architecture

### Frontend
- **Framework:** Next.js (App Router)
- **Language:** TypeScript/React
- **Routing:** Next.js file-system based (`app/`)
- **API Communication:** Standard browser `fetch` APIs.
- **Authentication:** Supabase Auth (likely handled through the backend and Next.js frontend).
- **Generation Pages:** `app/generation/wizard/`, `app/results/`, `app/studio/`, `app/dashboard/`.

### Backend
- **Framework:** FastAPI
- **Language:** Python
- **Entry Point:** `backend/main.py`
- **Services:** Modular service classes under `backend/services/` (e.g. `brand.py`, `t5_model.py`, `image_gen.py`, `compositor.py`).
- **AI Orchestration:** Conducted in `main.py` sequentially (Vision -> T5 Prompt -> Background Gen -> Background Removal -> Compositing -> Watermark -> Upload).
- **Database Interaction:** Supabase python client (`services/auth.py` and `main.py`).

### Infrastructure
- **Database:** Supabase PostgreSQL
- **Storage:** Cloudinary (via `storage.py`) or Local Filesystem (`generated_images/`)
- **External AI Providers:** Hugging Face API, Groq, Google Gemini, OpenAI, Pollinations.

---

## 2. Frontend

- Heavy use of inline styles and tailwind-like globals.
- Dedicated pages for the generation wizard, results viewing, library (dashboard), and brand book.
- Assets are downloaded securely using `fetch` to Blob to `Object URL`.

---

## 3. Backend

- Defines REST endpoints `/generate`, `/generate-samples`, `/brand-lookup`, `/brand-profile`.
- `main.py` is the orchestrator that wires together vision, prompt generation, image generation, compositing, and cloud storage.
- Stores generation sessions and prompts directly to Supabase tables (`generation_sessions`, `generation_prompts`, `generated_assets`).

---

## 4. AI/ML Components

- **Vision Analysis:** Groq API (`qwen/qwen3.6-27b`) or Gemini for extracting visual descriptors and context from product images.
- **Prompt Engineering:** Local T5 model (`transformers`) generating structured multi-variant prompts.
- **Background Removal:** Internal functions (likely rembg or similar, in `background_removal.py`).
- **Image Generation:** Multiple providers acting as a background generator.

---

## 5. T5 Pipeline

- **File:** `backend/services/t5_model.py`
- **Model:** Local T5 (`T5ForConditionalGeneration`) loaded from `ml_model/`.
- **Input:** A heavily structured string containing Campaign Brief, Brand Profile, Creative Style, Reference Image Context (from Groq), and Reference Intent (what to preserve/allow).
- **Output Mechanism:** Predicts 3 prompts separated by `[SEP]`. The parser appends a strict reference instruction to each prompt.
- **Fallback:** If the T5 model fails to load or inference fails, it falls back to hardcoded regex-based string interpolations for "Basic", "Professional", and "Creative" prompts (if `T5_ALLOW_FALLBACK` is true).

---

## 6. Image Generation Pipeline

- **File:** `backend/services/image_gen.py`
- **Models:** Hugging Face (FLUX.1-schnell, SDXL, SD 1.5), Gemini (`gemini-2.0-flash-preview-image-generation`), OpenAI (`dall-e-3`), or Pollinations.
- **Prompt Processing:** `_clean_prompt` strips the product name, typography requests, pricing, and generic product words from the T5 prompt. It forces the generator to output an *empty background scene* ("Maintain empty compositional space in the center... Clean image, no text...").
- **Product Conditioning:** **The image generator DOES NOT receive the product image as a conditioning input.** The system relies entirely on text-to-image for generating a background, and the product is composited later. (Note: The Gemini pipeline does pass the image, but the prompt still asks it to "Generate a high-quality marketing creative image", acting mostly as inspiration).
- **Fallback:** If HF FLUX fails, it automatically falls back to SDXL, then SD 1.5. If all fail, it raises an exception. A `placeholder` fallback also exists generating colored boxes with text.

---

## 7. Product/Reference Image Pipeline

1. Uploaded via frontend.
2. Sent to `GroqVisionProvider` to analyze lighting, color, camera angle, and style.
3. If `BACKGROUND_REMOVAL` is true, the image is passed to `remove_background()` and `refine_edges()` in `background_removal.py` to get a transparent PNG.
4. The transparent PNG is stored in memory and passed directly to the `compositor.py` for post-generation blending.

---

## 8. Brand Intelligence

- **File:** `backend/services/brand.py`
- Uses Google Places API (`/maps/api/place/textsearch/json` and `details/json`) to fetch brand name, location, and photos.
- `ColorThief` extracts a 3-color palette from the first Google business photo.
- This data is used to populate `brand_name` and `brand_colors` inside the T5 prompt. No visual LoRAs or textual inversion embeddings are utilized.

---

## 9. Compositing Pipeline

- **File:** `backend/services/compositor.py`
- Blends the generated background (from HF/Gemini) and the transparent product PNG.
- **Transformations:**
  - Resizes product based on hardcoded category configurations (e.g., Electronics scale=0.50, Food=0.65).
  - Matches lighting by measuring the brightness/color of the background crop area and applying `ImageEnhance` to the product (`_apply_lighting_tint`).
  - Casts artificial ambient occlusion and directional shadows using blurred alpha masks.
  - Generates fake glossy reflections at the bottom of the product.

---

## 10. Database

- **Provider:** Supabase
- **Tables Identified in Code:** `generation_sessions`, `generation_prompts`, `generated_assets`, `user_profiles` (assumed).
- Used for tracking generation statuses and saving asset URLs. Auth is verified using `supabase.auth.get_user()`.

---

## 11. Storage

- **File:** `backend/services/storage.py`
- Uses **Cloudinary** if `CLOUDINARY_API_KEY` is provided, otherwise falls back to saving files locally in `./generated_images` and serving them statically via FastAPI.

---

## 12. Library and Download

- The frontend dashboard fetches assets from Supabase.
- **Download Mechanism:** Uses `fetch(url) -> blob -> window.URL.createObjectURL(blob)` and creates a temporary `<a>` tag with the `download` attribute to force browser download. This avoids CORS issues if configured properly, but is a standard client-side implementation.

---

## 13. External APIs

| Service | Purpose | File | API/SDK | Data Sent | Data Returned | Failure Handling |
| ------- | ------- | ---- | ------- | --------- | ------------- | ---------------- |
| Google Places | Brand Discovery | `brand.py` | REST | Query, place_id | JSON with photos, colors | Try/except, Mock fallback |
| Groq | Vision Analysis | `image_analysis.py` | REST | Image B64, intent | JSON visual context | Return empty/fallback |
| Hugging Face | Image Gen | `image_gen.py` | HF Inference | Cleaned Prompt | Generated Image | Try/except, fallback chain |
| Gemini / OpenAI | Image Gen | `image_gen.py` | SDK / REST | Prompt, Image | Generated Image | Exception raised |
| Cloudinary | Storage | `storage.py` | SDK | Image Bytes | Secure URL | Fallback to local storage |

---

## 14. Current Metrics and Logging

- Basic `print` and `logger.info` statements in FastAPI routes.
- **Missing Metrics:** No latency tracking, no model evaluation metrics, no automated quality scores (pLDDT equivalents for images), no prompt adherence tracking.

---

## 15. Failure and Fallback Mechanisms

| Failure | Detection | Fallback | User-visible result |
| ------- | --------- | -------- | ------------------- |
| Google Places down | `try/except` in `brand.py` | Uses `_mock_results` / `_mock_profile` | Generic brand profile returned |
| Groq Vision down | `try/except` HTTP >= 400 | Returns `{"status": "failed"}` | Prompt generated without visual context |
| T5 load/infer fail | Exception caught | Uses hardcoded python string templates | Prompts feel generic but still generate |
| HF Image Gen fail | `try/except` in `image_gen.py`| Drops to next model in chain (FLUX -> SDXL -> SD1.5) | Image style heavily degrades |

---

## 16. Current Limitations

### A. Image-generation limitations
Models only generate empty backgrounds; they are not fully conditioning on the product itself via ControlNet or IP-Adapter.

### B. Product-fidelity limitations
Because the product is composited post-generation, lighting and perspective matches are entirely dependent on algorithmic heuristics (Pillow ImageEnhance), which often look "pasted on" or floaty.

### C. Brand-consistency limitations
Brand identity is merely injected as text (e.g. "red and blue colors"). The model has no true semantic understanding of the brand's unique visual DNA or exact logo placement natively.

### D. Prompt-generation limitations
T5 model outputs can be erratic. The fallback mechanism relies on rudimentary string formatting.

### E. Evaluation limitations
No automated way to evaluate if the generated image actually respects the prompt or if the compositing looks realistic.

---

## 17. Complete End-to-End Generation Flow

| Stage | File | Function | Input | Output | Model/API | Key Parameters | Failure Handling |
| ----- | ---- | -------- | ----- | ------ | --------- | -------------- | ---------------- |
| 1. Request | `main.py` | `/generate` | Form Data + Image | `db_session_id` | N/A | N/A | HTTP 400 if missing data |
| 2. Vision | `image_analysis.py` | `analyze()` | Product Image Bytes | JSON visual description | Groq `qwen3.6-27b` | `temperature=0.2` | Returns `None` on fail |
| 3. Prompting | `t5_model.py` | `generate()` | Vision JSON + Form Data | 3 Prompts | Local HF T5 | `max_length=512`, `num_beams=4` | Hardcoded regex strings |
| 4. Gen Prep | `image_gen.py` | `_clean_prompt` | T5 Prompts | Background-only prompts | Regex/rules | Strips product names | N/A |
| 5. Image Gen | `image_gen.py` | `generate()` | Cleaned Prompts | Background Image Bytes | HF API (FLUX/SDXL) | `width=1024, height=1024` | Model fallback chain |
| 6. BG Removal | `background_removal.py`| `remove_background()` | Original Product Image | Transparent PNG | rembg (assumed) | None | Skips if fails |
| 7. Compositing | `compositor.py` | `composite_product()` | Background + Transparent PNG| Blended JPEG Bytes | Pillow | Rules by category | Try/except |
| 8. Watermark | `watermark.py` | `apply_creative_overlay()`| Blended JPEG | Final Watermarked JPEG | Pillow | Brand colors/logo | Try/except |
| 9. Storage | `storage.py` | `upload()` | Final JPEG | Cloudinary URL | Cloudinary SDK | Overwrite=True | Local filesystem fallback |
| 10. Database | `main.py` | `/generate` | URLs | Saved in Supabase | Supabase client | Session ID | Ignored on fail |

---

## 18. Component Inventory

| Component | File | Technology | Input | Output | Purpose | Status |
| --------- | ---- | ---------- | ----- | ------ | ------- | ------ |
| Vision Analysis | `image_analysis.py`| Groq/Gemini API | Image bytes | JSON Description | Extract visual context | Active |
| Prompt Engine | `t5_model.py` | T5 (Transformers) | Text + Vision JSON | 3 Prompts | Generate structured text | Active |
| Image Generator | `image_gen.py` | HF/Gemini/OpenAI | Cleaned Prompt | Background Image | Generate scene | Active |
| Compositor | `compositor.py` | Pillow (PIL) | BG + Transparent PNG| Blended Image | Paste product onto BG | Active |
| Brand Extractor | `brand.py` | Google Places API | Query/Place ID | Profile + Colors | Get brand data | Active |
| Storage | `storage.py` | Cloudinary/Local | Image bytes | URL | Store assets | Active |

---

## 19. Phase 0 Baseline Assessment

### Question 1: What does the current GoVisual AI actually do from user input to final creative?
It extracts visual context from the uploaded product image using Groq, formulates a T5 prompt describing a generic background, generates the background scene with HF/Gemini, removes the background from the original product, and physically pastes it onto the generated scene using Pillow image processing.

### Question 2: What parts of the current system are genuinely AI/ML-driven?
Vision analysis (Groq), prompt engineering (T5), image generation (HF/Gemini), and likely background removal.

### Question 3: What parts are deterministic software/image processing?
Compositing (scaling, lighting match, shadows, reflections) and watermark overlay.

### Question 4: Does the current image generator receive the actual product image as a generation condition?
**NO.** The image generator is forced into generating a background. The product is not passed as an IP-Adapter or ControlNet condition.

### Question 5: If not, how is product identity currently preserved?
By bypassing the generator entirely and compositing the original product pixels over the background using Python's Pillow library.

### Question 6: How is brand information currently incorporated into generation?
Brand name and colors are injected as text strings into the prompt. Brand logos and stylistic typography are composited afterwards in `watermark.py`.

### Question 7: Does the system currently evaluate generated images automatically?
**NO.**

### Question 8: Does the system currently perform automatic self-correction?
**NO.**

### Question 9: What is the biggest likely bottleneck affecting image quality?
The reliance on post-generation algorithmic compositing. The model cannot naturally cast realistic 3D shadows, integrate lighting physically, or adapt perspective correctly since it does not see the product during the generation step.

### Question 10: What information is missing from the current system that we need to measure in Phase 0?
Inference latency, API failure rates, visual quality/compositing realism scores, and prompt adherence metrics.

---

## 20. Final Audit Summary

### A. What the current GoVisual AI actually does
It acts as a sophisticated text-to-background generator paired with an algorithmic product composite sticker application. It leverages vision APIs to improve the background prompt, but stops short of true unified AI generation.

### B. What the current system does well
- High resilience and speed through smart fallback mechanisms (APIs, strings, Mock data).
- Flawless product preservation since the original pixels are never altered by a diffusion model.

### C. What the current system does poorly
- True photorealism is constrained by algorithmic limitations (shadows look pasted).
- Brand integration is superficial and text-based.
- Missing any self-evaluation or critique loop.

### D. Most important image-quality bottlenecks
1. **Verified bottlenecks:** Total lack of Image Conditioning (e.g., ControlNet) in the diffusion process.
2. **Verified bottlenecks:** Pillow-based algorithmic shadow and reflection rendering.
3. **Verified bottlenecks:** Prompt stripping forces models to guess empty space dimensions.
4. **Hypotheses requiring measurement:** T5 text coherence and adherence.
5. **Hypotheses requiring measurement:** Impact of lighting tint heuristics on varied generated lighting conditions.

### E. What we should measure in Phase 0
- End-to-end processing time vs. individual API latency.
- Failure rates of the primary models to gauge fallback frequency.
- Baseline subjective/objective quality score of the composited outputs compared to a true conditioned output.

# GO VISUAL AI 2.0 — PHASE 0 — MODULE 0.2 RUNTIME TRACE

## 1. Test Generation

- **Date:** 2026-08-15
- **Product:** Green Energy Drink
- **Category:** Food & Drinks
- **Marketing Requirement:** Launch campaign, Buy 1 Get 1 Free, Energetic and refreshing mood
- **Brand Information:** VitaBoost, Colors: #00FF00 & #FFFFFF
- **Requested Format:** 1:1 Instagram Post
- **Product Image:** Dummy green square image uploaded as `test_product.jpg`

## 2. Frontend Request

```text
Frontend Input (Mocked via TestClient)
↓
Actual HTTP Request (POST /generate)
↓
Backend Endpoint (main.py -> generate)
```

**Request Body:**
- `product`: "Green Energy Drink"
- `price`: "2.99"
- `format`: "1:1"
- `image_type`: "Instagram post"
- `purpose`: "Launch campaign"
- `mood`: "Energetic and refreshing"
- `background`: "Gym environment"
- `lighting`: "Bright studio lights"
- `offer`: "Buy 1 Get 1 Free"
- `brand_name`: "VitaBoost"
- `brand_colors`: "#00FF00 & #FFFFFF"
- `category`: "Food & Drinks"
- `image_intent`: "Product only"

**Files:**
- `product_image`: image/jpeg (test bytes)

## 3. Backend Execution

- **Endpoint:** `POST /generate`
- **Execution Flow:** The request is processed synchronously in `main.py`, invoking Vision (`image_analysis.py`), then Prompt Engine (`t5_model.py`), then Image Generation (`image_gen.py`), and finally Compositor (`compositor.py`).

## 4. Brand Data Flow

- **Stored Data:** Brand profile usually exists in Supabase.
- **Data Passed downstream:** 
  - `brand_name`: "VitaBoost"
  - `brand_colors`: "#00FF00 & #FFFFFF"
- **Usage:** These text strings are directly injected into the T5 prompt. The exact hex color `#00FF00` is also passed to the watermark service.

## 5. Product Data Flow

- **Input:** `test_product.jpg` (Green square)
- **Vision:** Image bytes sent to Groq.
- **T5:** Receives the text string "Green Energy Drink".
- **Image Generation:** The image generator only receives a text prompt. The product string is explicitly scrubbed from the prompt.
- **Compositor:** The original transparent product bytes are pasted onto the generated background.

## 6. Vision Analysis

```text
Product Image
↓
Groq Vision (qwen3.6-27b)
↓
Actual Vision Prompt: "Analyze this product image carefully. Return JSON strictly following this schema..."
↓
Actual Vision Output: FAILED
↓
Information passed downstream: None (Fallback)
```
*Note: During runtime tracing, Groq Vision returned an HTTP 400 error: "max completion tokens reached before generating a valid document" because the 512 token limit is too strict for the required JSON schema.*

## 7. T5 Execution

```text
T5 INPUT (Constructed by prompt_svc)
↓
T5 OUTPUT
↓
POST-PROCESSING
↓
FINAL IMAGE-GENERATION PROMPT
```

**T5 Input Context:**
```text
CAMPAIGN BRIEF:
product: Green Energy Drink | category: Food & Drinks | purpose: Launch campaign | offer: Buy 1 Get 1 Free
BRAND PROFILE:
brand: VitaBoost | colors: #00FF00 & #FFFFFF
CREATIVE STYLE:
mood: Energetic and refreshing | style: Gym environment | format: 1:1 | lighting: Bright studio lights

REFERENCE INTENT:
Product only
PRESERVE:
Product identity, appearance, colors, shape
ALLOW TO CHANGE:
Background, lighting, composition, camera angle
```

**T5 Output (Actual Inference):**
```text
PROMPT 1: Commercial product photograph of Green Energy Drink for VitaBoost. Format: 1:1. Product only PRESERVE: Product identity, appearance, colors, shape ALLOW TOCHANGE: Background, lighting, composition, camera angle. Style: Gym environment. Lighting: Bright studio lights REFERENCE INTENT: Product only PRSERVE : product only PREPARENCE : Product name, appearance, composition, and angle. Use the uploaded image to match the exact product model, color, and depth. Use the uploaded reference image to match the exact product model, color, and physical form. Do not substitute a generic product.
```
*(Prompts 2 and 3 fall back to regex strings because the model only returned 1 valid prompt structure).*

## 8. Exact Final Prompt

This is the exact string passed to the diffusion model after `_clean_prompt()` scrubs the product identity to force a background generation.

```text
Prompt Before Cleaning:
Commercial product photograph of Green Energy Drink for VitaBoost. Format: 1:1. Product only PRESERVE: Product identity...

Cleaning Function (image_gen._clean_prompt):
Removes "Green Energy Drink", removes "product", "item". Adds background instructions.

Prompt Actually Sent to Model:
Commercial. Format: 1:1., appearance, colors, shape ALLOW TOCHANGE: Background, lighting, composition, camera angle. Style: Gym environment. Lighting: Bright studio lights REFERENCE INTENT:, appearance, composition, and angle. Use the uploaded image to match the exact, color, and depth. Use the uploaded reference image to match the exact, color, and physical form. Do not substitute a generic. Maintain empty compositional space in the center for product placement. Premium commercial studio setup, professional lighting, realistic studio reflections, depth of field. Clean image, no text, textless.
```

## 9. Image Generation Model

- **Provider:** Pollinations (Keyless AI) (Fell back from HuggingFace due to missing token/setup)
- **Model Name:** `Pollinations.ai`
- **API/SDK:** `httpx` (GET Request to `image.pollinations.ai/prompt/...`)

## 10. Runtime Parameters

- **width:** 1024
- **height:** 1024
- **num_inference_steps:** N/A (Server-side)
- **guidance_scale:** N/A (Server-side)
- **negative_prompt:** "nologo=true"

## 11. Reference Image Handling

**Classification: E. Post-generation compositing (and A. Text-to-image only for the generator)**

The actual product image is **NOT** sent to the HF image generation model. 
The image generator only generates a background scene using Text-to-Image. Product identity is preserved entirely by copy-pasting the original product image onto the generated scene afterwards.

## 12. Raw Image

- **Dimensions:** 1024x1024
- **Format:** JPEG (encoded in bytes)
- **Number of images:** 3 generated sequentially.
- **Content:** An empty gym background with a blank space in the middle.

## 13. Compositing

```text
RAW GENERATED IMAGE (Empty Gym Background)
+
PRODUCT IMAGE (Transparent PNG)
↓
COMPOSITOR (Pillow)
↓
COMPOSITED IMAGE
```

The product is **pasted/composited into a generated background** (Classification B).
- **Scaling:** Uses `CATEGORY_CONFIGS["Food & Drinks"]` (Scale: 0.65).
- **Lighting modifications:** The compositor crops the background where the product will sit, calculates mean brightness, and applies `ImageEnhance.Brightness` and `ImageEnhance.Contrast` to the product PNG. It also blends an 8% color tint of the background over the product.
- **Shadows:** Artificial shadows are cast beneath the product (Ambient occlusion + directional spread shadow using Pillow GaussianBlur).
- **Reflections:** No reflections for Food & Drinks.

## 14. Watermarking

```text
Composited Image
↓
Watermark (apply_creative_overlay)
↓
Logo + Product Card Overlay
↓
Final Creative
```

- A dark glassmorphism card is drawn at the bottom with "GREEN ENERGY DRINK", "VitaBoost", and the "₹2.99" price text.
- Brand colors are used for accent text.
- "GoVisual AI" is faintly stamped diagonally in the center (opacity 25).

## 15. Storage

```text
Final Image
↓
Local Filesystem (Fallback)
↓
URL
↓
Database
```

- **Storage Provider:** Saved locally to `./generated_images/` as Cloudinary was not active.
- **Resulting URL:** `http://localhost:8000/static/generated/[brand]_[tier]_[uuid].jpg`

## 16. Database Persistence

- **Table:** `generation_sessions` (Status: "completed")
- **Table:** `generated_assets` (Inserts the local static URL, format "1:1", status "completed")
- **Table:** `generation_prompts` (Saves the 3 original T5 prompts)

## 17. Latency Breakdown

| Stage              | Time |
| ------------------ | ---: |
| Frontend → Backend |  < 1s|
| Vision analysis    |   ~4s (failed, timeout/max tokens)|
| T5 loading/infer   | > 40s (bottleneck, T5 loaded weights locally)|
| Prompt processing  | < 1s |
| Image generation   | ~5s (Pollinations fallback) |
| Compositing        | < 1s |
| Watermarking       | < 1s |
| Storage upload     | < 1s |
| Database write     | < 1s |
| Total generation   | ~50s+|

## 18. Failure/Fallback Behavior

```text
Primary Path
↓
Vision Fails (HTTP 400 Max Tokens)
↓
T5 Successfully Generates 1 Prompt
↓
T5 Falls back to Regex for Prompts 2 and 3
↓
Image Gen Falls back to Pollinations (No HF Token)
↓
Final Result
```

## 19. Complete Runtime Trace

```text
USER INPUT
↓
[TestClient mocked data]
↓
[POST /generate]
↓
[main.py: _run_generation()]
↓
[VitaBoost, #00FF00 & #FFFFFF]
↓
[test_product.jpg, Food & Drinks]
↓
[GroqVisionProvider -> FAILED (HTTP 400)]
↓
[t5_model.build_input_string()]
↓
[t5_model._model.generate()]
↓
[Commercial. Format: 1:1., appearance, colors, shape ALLOW TOCHANGE: Background, lighting, composition, camera angle. Style: Gym environment...]
↓
[Pollinations AI API]
↓
[width=1024, height=1024]
↓
[1024x1024 Empty Gym Scene JPEG]
↓
[compositor.composite_product(scale=0.65, tint, shadows)]
↓
[watermark.apply_creative_overlay()]
↓
[storage._save_local()]
↓
[supabase.table("generated_assets").insert()]
↓
FINAL IMAGE
```

## 20. Critical Findings

### 1. What exact model generated the raw background?
Pollinations AI (`image.pollinations.ai`). The system fell back from HuggingFace because `HF_TOKEN` was not available or working.

### 2. What exact prompt was sent to that model?
`Commercial. Format: 1:1., appearance, colors, shape ALLOW TOCHANGE: Background, lighting, composition, camera angle. Style: Gym environment. Lighting: Bright studio lights REFERENCE INTENT:, appearance, composition, and angle. Use the uploaded image to match the exact, color, and depth. Use the uploaded reference image to match the exact, color, and physical form. Do not substitute a generic. Maintain empty compositional space in the center for product placement. Premium commercial studio setup, professional lighting, realistic studio reflections, depth of field. Clean image, no text, textless.`

### 3. Did the model receive the actual product image?
**NO.**

### 4. If not, how was product identity preserved?
The prompt was explicitly stripped of the product name using regex so the model would only generate an empty background scene. The actual product pixels were then composited via Pillow over the generated background. Notice that the cleaned prompt is extremely mangled due to regex replacements.

### 5. What portion of product fidelity comes from AI generation versus deterministic compositing?
100% of the product fidelity comes from deterministic compositing. The AI generated 0% of the product itself.

### 6. What exact information from the brand reaches the image generator?
None in the actual cleaned output, since the regex randomly mangled the prompt and removed "VitaBoost".

### 7. What exact information from the product reaches the image generator?
**Nothing.** The prompt cleaning function actively removes references to the product to ensure the generator creates an empty background. In fact, it aggressively stripped the prompt leaving broken sentences (e.g. `Do not substitute a generic.`).

### 8. What exact information reaches only the compositor?
The actual visual product pixels (transparent PNG), category heuristics (scale/shadow settings), and the generated background.

### 9. What is the total generation latency?
Observed ~50-60+ seconds locally due to local T5 model loading overhead on CPU.

### 10. What is the largest computational bottleneck?
**Observed:** Loading the local T5 model on CPU (`t5_model.py`) takes roughly 40-50 seconds alone for loading the weights.

### 11. What is the largest likely image-quality bottleneck?
**Observed:** The prompt cleaning function (`_clean_prompt`) severely mangles the T5 output. By removing product references, it destroys the grammatical structure of the prompt. Furthermore, because the AI does not see the product, the lighting, shadows, and perspective are physically inaccurate and look "pasted on" via compositing. Groq Vision is also completely non-functional due to token limits.

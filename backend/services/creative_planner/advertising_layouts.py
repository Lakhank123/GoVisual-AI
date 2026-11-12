"""
GoVisual AI — Category-Aware Advertising Layouts
Defines intentional advertising compositions tailored to brand category, product facts, and campaign objectives.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from .brand_context import BrandContext
from .product_context import ProductContext


class AdvertisingLayout(BaseModel):
    """Defines an intentional advertising composition and visual hierarchy."""
    layout_id: str
    layout_name: str
    creative_direction: str
    composition: str
    environment: str
    lighting: str
    camera_direction: str
    mood: str
    feature_callout_style: str
    text_placement_guide: str
    logo_placement_guide: str
    differentiation_rationale: str


def select_advertising_layouts(
    brand_ctx: BrandContext,
    product_ctx: ProductContext,
    user_preferences: Optional[Dict[str, Any]] = None,
    candidate_count: int = 3,
) -> List[AdvertisingLayout]:
    """
    Selects 3 distinct, category-aware advertising layouts adapting to brand DNA,
    verified product features, and user questionnaire answers.
    """
    prefs = user_preferences or {}
    user_bg = prefs.get("background")
    user_lighting = prefs.get("lighting")
    user_mood = prefs.get("mood")
    user_purpose = (prefs.get("purpose") or prefs.get("goal") or "").lower()
    logo_pos = prefs.get("logo_position", "top-right")

    category_lower = (product_ctx.category or brand_ctx.category or "").lower()
    has_features = len(product_ctx.select_promotional_features(4)) > 0
    has_ingredients = len(product_ctx.ingredients) > 0
    has_offer = bool(product_ctx.offer)
    is_festive = "festiv" in user_purpose or "diwali" in user_purpose or "festiv" in (user_bg or "").lower()

    # Pool of specialized layouts
    available_layouts: List[AdvertisingLayout] = []

    # 1. Festive Celebration Layout (if requested or relevant)
    if is_festive:
        festive_env = user_bg if user_bg and "festiv" in user_bg.lower() else "luxurious warm festive celebration setting, golden ambient diya glow, soft warm celebratory bokeh"
        festive_light = user_lighting or "warm celebratory glow with soft golden highlights"
        available_layouts.append(AdvertisingLayout(
            layout_id="festive_celebration",
            layout_name="Festive Celebration Campaign",
            creative_direction=f"Festive cultural celebration advertising showcasing {product_ctx.name} with warm auspicious warmth.",
            composition="Hero product positioned in lower-center third, framed by soft ambient celebratory elements with generous upper headroom for headline.",
            environment=festive_env,
            lighting=festive_light,
            camera_direction="Eye-level, straight-on commercial portrait angle",
            mood=user_mood or "Warm, celebratory, festive & luxurious",
            feature_callout_style="Festive gold badge callout and celebratory headline",
            text_placement_guide="Upper third centered or upper left, avoiding top-right logo",
            logo_placement_guide=f"Clear safe-zone in {logo_pos}",
            differentiation_rationale="Celebratory cultural resonance tailored for festival shopping periods."
        ))

    # 2. Ingredient / Craft Material Showcase Layout (if verified ingredients/materials exist)
    if has_ingredients:
        supported_props = product_ctx.get_supported_props()
        props_str = ", ".join(supported_props) if supported_props else "clean botanical elements"
        available_layouts.append(AdvertisingLayout(
            layout_id="ingredient_showcase",
            layout_name="Ingredient & Craft Showcase",
            creative_direction=f"Editorial advertising spotlighting authentic ingredients ({', '.join(product_ctx.ingredients)}) with hero {product_ctx.name}.",
            composition="Hero product prominent in center-right, accompanied naturally by tasteful authentic props in lower third.",
            environment=user_bg or f"Warm botanical studio aesthetic with subtle organic textures and {props_str}",
            lighting=user_lighting or "Soft diffused morning daylight, clean gentle wrap-around illumination",
            camera_direction="Three-quarter perspective, shallow depth of field",
            mood=user_mood or "Pure, authentic, fresh and trustworthy",
            feature_callout_style="Subtle ingredient badge and organic benefit label",
            text_placement_guide="Left margin vertical hierarchy, clear of props and logo",
            logo_placement_guide=f"Pristine negative space in {logo_pos}",
            differentiation_rationale="Authentic ingredient story proving tangible product quality visually."
        ))

    # 3. Hero Product with Benefit / Spec Panel Layout
    if has_features:
        feat_env = user_bg or "clean contemporary architectural studio with smooth tonal gradation"
        available_layouts.append(AdvertisingLayout(
            layout_id="hero_benefit_panel",
            layout_name="Hero Showcase & Feature Callout",
            creative_direction=f"Commercial advertising creative balancing hero product prominence with structured feature highlights for {product_ctx.name}.",
            composition="Hero product center-framed with intentional negative space on left or bottom for 2-3 verified feature badges.",
            environment=feat_env,
            lighting=user_lighting or "Precision commercial studio rim lighting, crisp controlled shadows",
            camera_direction="Straight-on level commercial perspective",
            mood=user_mood or "Professional, confident, high-clarity",
            feature_callout_style="Clean vertical feature strip with concise benefit badges",
            text_placement_guide="Strong bold headline in upper left with feature callouts in left column",
            logo_placement_guide=f"Exact reserved space in {logo_pos}",
            differentiation_rationale="Information-rich layout that communicates verified functionality and specifications."
        ))

    # 4. Bold Promotional / Offer-Driven Layout (especially if offer is active)
    if has_offer or "sale" in user_purpose or "offer" in user_purpose or "promot" in user_purpose:
        promo_env = user_bg or "dynamic high-contrast commercial backdrop with bold graphic lighting"
        available_layouts.append(AdvertisingLayout(
            layout_id="bold_promotional",
            layout_name="High-Impact Promotional Creative",
            creative_direction=f"High-conversion promotional advertisement emphasizing special offer ({product_ctx.offer or 'Special Value'}) with {product_ctx.name}.",
            composition="Dynamic diagonal or off-center hero product framing, anchored by a prominent promotional badge.",
            environment=promo_env,
            lighting=user_lighting or "High-contrast dynamic commercial spotlight with vivid presence",
            camera_direction="Slight low angle for elevated product authority",
            mood=user_mood or "Bold, energetic, urgent and compelling",
            feature_callout_style="High-visibility offer tag and pricing badge",
            text_placement_guide="Prominent headline and discount badge in upper quadrant",
            logo_placement_guide=f"Corner safe-zone in {logo_pos}",
            differentiation_rationale="Conversion-focused visual hierarchy designed for immediate purchase action."
        ))

    # 5. Clean Editorial / Minimalist Luxury Layout
    edit_env = user_bg if (user_bg and "white" not in user_bg.lower()) else "refined minimalist negative space, smooth neutral studio tones"
    available_layouts.append(AdvertisingLayout(
        layout_id="clean_editorial",
        layout_name="Clean Editorial Advertisement",
        creative_direction=f"High-end luxury editorial advertising emphasizing craftsmanship, pure form, and brand elegance for {product_ctx.name}.",
        composition="Sculptural product placement with generous negative breathing room, asymmetrical balance.",
        environment=edit_env,
        lighting=user_lighting or "Sculptural directional soft light with delicate ambient gradient",
        camera_direction="Eye-level macro perspective, pin-sharp product focus",
        mood=user_mood or "Refined, understated, minimalist luxury",
        feature_callout_style="Minimal typographic tagline and restrained hallmark badge",
        text_placement_guide="Understated typographic sign-off in lower left margin",
        logo_placement_guide=f"Premium quiet zone in {logo_pos}",
        differentiation_rationale="Sophisticated premium aesthetic prioritizing prestige and brand value."
    ))

    # 6. Lifestyle / Contextual in-use Layout
    life_env = user_bg if (user_bg and "lifestyle" in user_bg.lower()) else "authentic contextual lifestyle environment naturally suited to product usage"
    available_layouts.append(AdvertisingLayout(
        layout_id="lifestyle_context",
        layout_name="Authentic Lifestyle in-Use",
        creative_direction=f"Relatable real-world lifestyle advertisement placing {product_ctx.name} in its natural everyday setting.",
        composition="Rule of thirds composition integrating the product organically into authentic environment.",
        environment=life_env,
        lighting=user_lighting or "Natural warm wrap-around window daylight",
        camera_direction="Natural candid eye-level perspective",
        mood=user_mood or "Warm, approachable, authentic and relatable",
        feature_callout_style="Subtle lifestyle badge and contextual benefit callout",
        text_placement_guide="Lower third overlay with clean contrast backing",
        logo_placement_guide=f"Clean corner in {logo_pos}",
        differentiation_rationale="Emotional connection through believable, aspirational daily usage."
    ))

    # Baseline Commercial Studio Showcase Layout (universal hero composition)
    studio_env = user_bg or "clean commercial infinite cyclorama studio with pristine diffused floor reflections"
    available_layouts.append(AdvertisingLayout(
        layout_id="commercial_showcase",
        layout_name="Commercial Studio Hero Showcase",
        creative_direction=f"Authoritative commercial studio advertising framing {product_ctx.name} in balanced hero lighting.",
        composition="Center-weighted hero product framing with clean vertical breathing space and balanced symmetry.",
        environment=studio_env,
        lighting=user_lighting or "High-key diffused studio wrap-around illumination with subtle floor reflections",
        camera_direction="Straight-on eye-level commercial perspective",
        mood=user_mood or "Clean, confident, and professional",
        feature_callout_style="Subtle brand sign-off badge and clean title space",
        text_placement_guide="Upper quadrant headline, avoiding top-right logo",
        logo_placement_guide=f"Exact negative space in {logo_pos}",
        differentiation_rationale="Universal commercial studio layout ensuring balanced hero product presentation."
    ))

    # 7. Modern Tech / Spec Focus Layout (for electronics/appliances)
    if "tech" in category_lower or "electron" in category_lower or "mobile" in category_lower:
        available_layouts.insert(0, AdvertisingLayout(
            layout_id="tech_spec_modern",
            layout_name="Modern Tech & Specification Focus",
            creative_direction=f"Precision engineering advertisement spotlighting modern tech specs and build quality of {product_ctx.name}.",
            composition="Hero product floating on clean architectural pedestal, crisp technical depth.",
            environment=user_bg or "modern dark tech studio, sleek matte surfaces with subtle neon accents",
            lighting=user_lighting or "dramatic precision rim lighting, crisp controlled contrast",
            camera_direction="Three-quarter elevation, sharp technical macro focus",
            mood=user_mood or "Cutting-edge, precise, innovative",
            feature_callout_style="Technical specification pill badges and performance highlights",
            text_placement_guide="Upper horizontal header with spec list on left margin",
            logo_placement_guide=f"Safe zone in {logo_pos}",
            differentiation_rationale="Spec-forward commercial layout optimized for feature-conscious tech buyers."
        ))

    # Select unique layouts up to candidate_count
    selected: List[AdvertisingLayout] = []
    seen_ids = set()
    for layout in available_layouts:
        if layout.layout_id not in seen_ids:
            selected.append(layout)
            seen_ids.add(layout.layout_id)
        if len(selected) >= candidate_count:
            break

    # If user provided explicit background and lighting, inject them cleanly
    if user_bg or user_lighting:
        for idx, item in enumerate(selected):
            if user_bg:
                # Retain layout variation while incorporating user preference
                if idx == 0:
                    item.environment = f"{user_bg} tailored to {item.layout_name}"
                elif idx == 1:
                    item.environment = f"{user_bg} with contextual environmental depth"
                else:
                    item.environment = f"{user_bg} with clean minimalist framing"
            if user_lighting:
                if idx == 0:
                    item.lighting = f"{user_lighting} with balanced commercial fill"
                elif idx == 1:
                    item.lighting = f"{user_lighting} with artistic directional rim light"
                else:
                    item.lighting = f"{user_lighting} with soft ambient wrap"

    return selected[:candidate_count]

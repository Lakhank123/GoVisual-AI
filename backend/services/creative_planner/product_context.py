"""
GoVisual AI — Product Intelligence Context
Builds a rich, truthful product context from the product catalog, user inputs, and vision understanding.
Strictly avoids fabricating unverified ingredients, claims, or guarantees.
"""
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ProductContext(BaseModel):
    """Normalized, verified product context used for creative direction."""
    name: str = "Product"
    category: Optional[str] = None
    description: Optional[str] = None
    ingredients: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    specifications: List[str] = Field(default_factory=list)
    price: Optional[str] = None
    offer: Optional[str] = None
    urgency: Optional[str] = None
    explicit_main_text: Optional[str] = None
    usage: Optional[str] = None
    
    # Visual descriptors from vision understanding (if available)
    dominant_colors: List[str] = Field(default_factory=list)
    shape_or_silhouette: Optional[str] = None
    material_appearance: Optional[str] = None
    surface_finish: Optional[str] = None
    visible_branding: Optional[str] = None
    
    # Metadata
    reference_image_provided: bool = False
    has_verified_details: bool = False

    def select_promotional_features(self, max_features: int = 3) -> List[str]:
        """
        Selects 2 to 4 verified features/benefits for visual callouts.
        Strict rule: Returns ONLY verified details from catalog or explicit user input.
        Never fabricates claims. If no verified features exist, returns an empty list.
        """
        candidates: List[str] = []
        # Priority 1: Explicit features from catalog
        for f in self.features:
            clean = f.strip()
            if clean and clean not in candidates:
                candidates.append(clean)
        # Priority 2: Verified benefits
        for b in self.benefits:
            clean = b.strip()
            if clean and clean not in candidates:
                candidates.append(clean)
        # Priority 3: Explicit specifications
        for s in self.specifications:
            clean = s.strip()
            if clean and clean not in candidates:
                candidates.append(clean)
        # Priority 4: Verified ingredients if under limit
        for ing in self.ingredients:
            clean = f"With {ing.strip()}"
            if ing.strip() and clean not in candidates:
                candidates.append(clean)

        return candidates[:max_features]

    def get_supported_props(self) -> List[str]:
        """
        Derives tasteful, truthful props matching ONLY verified ingredients or product category.
        Never hallucinate botanicals/ingredients unless verified in product data.
        """
        props: List[str] = []
        
        # 1. Ingredient-driven props (strictly verified)
        for ing in self.ingredients:
            ing_lower = ing.lower()
            if "turmeric" in ing_lower or "haldi" in ing_lower:
                props.append("fresh organic turmeric roots and fine golden powder")
            elif "saffron" in ing_lower or "kesar" in ing_lower:
                props.append("delicate saffron strands")
            elif "aloe" in ing_lower:
                props.append("freshly sliced aloe vera leaves")
            elif "neem" in ing_lower:
                props.append("fresh green neem leaves")
            elif "rose" in ing_lower:
                props.append("fresh dewy rose petals")
            elif "coffee" in ing_lower:
                props.append("roasted artisan coffee beans")
            elif "honey" in ing_lower:
                props.append("golden honey drizzle on natural wood")
            elif "tea" in ing_lower:
                props.append("aromatic loose tea leaves")
            elif "leather" in ing_lower:
                props.append("raw textured leather swatches")
            elif "silk" in ing_lower:
                props.append("draped pure silk fabric")

        # 2. Category-appropriate neutral setting props if no specific ingredients
        cat_lower = (self.category or "").lower()
        if not props:
            if "electronics" in cat_lower or "tech" in cat_lower or "mobile" in cat_lower:
                props.append("sleek matte aluminum surface and minimalist geometric riser")
            elif "jewellery" in cat_lower or "jewelry" in cat_lower:
                props.append("luxurious velvet display bust and subtle polished marble")
            elif "clothing" in cat_lower or "fashion" in cat_lower:
                props.append("clean textured fabric backdrop and architectural wooden pedestal")
            elif "food" in cat_lower or "drink" in cat_lower or "beverage" in cat_lower:
                props.append("natural slate serving board and subtle culinary garnishes")

        return props


def _extract_items(val: Any) -> List[str]:
    """Helper to split string or extract list items."""
    if not val:
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if str(x).strip() and str(x).lower() != "unknown"]
    if isinstance(val, str):
        # Handle comma or newline separated
        items = re.split(r"[,;\n•|]+", val)
        return [i.strip() for i in items if i.strip() and i.lower() not in ("none", "unknown", "n/a")]
    return []


def build_product_context(
    product_name: str,
    catalog_product: Optional[Dict[str, Any]] = None,
    form_answers: Optional[Dict[str, Any]] = None,
    vision_analysis: Optional[Any] = None,
    has_image: bool = False,
) -> ProductContext:
    """
    Constructs a verified ProductContext combining catalog data, user questionnaire answers,
    and visual analysis. Preserves factual fidelity and rejects fabricated claims.
    """
    answers = form_answers or {}
    cat_data = catalog_product or {}

    # 1. Product Name resolution
    p_name = product_name or answers.get("product") or cat_data.get("name") or "Product"
    p_name = p_name.strip()

    # 2. Category resolution
    category = (
        answers.get("category")
        or answers.get("product_category")
        or cat_data.get("category")
    )
    if isinstance(category, str):
        category = category.strip()

    # 3. Description resolution
    description = (
        answers.get("description")
        or answers.get("product_description")
        or cat_data.get("description")
    )
    if isinstance(description, str) and description.strip().lower() in ("none", "unknown", "n/a"):
        description = None

    # 4. Price & Offer resolution
    raw_price = answers.get("price") or answers.get("product_price") or cat_data.get("price_positioning") or cat_data.get("price")
    formatted_price = None
    if raw_price:
        p_str = str(raw_price).strip()
        if p_str and p_str.lower() not in ("none", "see store", "unknown"):
            # Clean number or add currency if numeric
            clean_digits = re.sub(r"[^\d.]", "", p_str)
            if clean_digits:
                formatted_price = f"₹{clean_digits}"
            else:
                formatted_price = p_str

    raw_offer = answers.get("offer") or answers.get("cta") or cat_data.get("offer")
    formatted_offer = None
    if raw_offer:
        o_str = str(raw_offer).strip()
        if o_str and o_str.lower() not in ("no offer", "none", "no urgency", "unknown"):
            formatted_offer = o_str

    urgency = answers.get("urgency")
    if urgency and str(urgency).strip().lower() in ("no urgency", "none", "unknown"):
        urgency = None

    # 5. Extract ingredients & features from description and catalog
    ingredients: List[str] = []
    features: List[str] = []
    benefits: List[str] = []
    specifications: List[str] = []

    if cat_data.get("ingredients"):
        ingredients.extend(_extract_items(cat_data["ingredients"]))
    if answers.get("ingredients"):
        ingredients.extend(_extract_items(answers["ingredients"]))

    if cat_data.get("features"):
        features.extend(_extract_items(cat_data["features"]))
    if answers.get("features"):
        features.extend(_extract_items(answers["features"]))

    if cat_data.get("benefits"):
        benefits.extend(_extract_items(cat_data["benefits"]))
    if answers.get("benefits"):
        benefits.extend(_extract_items(answers["benefits"]))

    if cat_data.get("specifications"):
        specifications.extend(_extract_items(cat_data["specifications"]))

    # Scan description for explicit bulleted or mentioned ingredients / specs if present
    if description and not features and not ingredients:
        # Check for explicit 'Ingredients:' or 'Key Features:' sections in description
        ing_match = re.search(r"(?:ingredients|made with|contains)[:\s]+([^.\n]+)", description, re.IGNORECASE)
        if ing_match:
            ingredients.extend(_extract_items(ing_match.group(1)))

        feat_match = re.search(r"(?:features|specs|highlights)[:\s]+([^.\n]+)", description, re.IGNORECASE)
        if feat_match:
            features.extend(_extract_items(feat_match.group(1)))

    # 6. Visual attributes from Vision Analysis (Groq ProductUnderstanding)
    dominant_colors = []
    shape = None
    material = None
    finish = None
    branding = None

    if vision_analysis:
        try:
            if hasattr(vision_analysis, "visual_attributes") and vision_analysis.visual_attributes:
                dominant_colors = vision_analysis.visual_attributes.dominant_colors or []
            if hasattr(vision_analysis, "physical_attributes") and vision_analysis.physical_attributes:
                shape = vision_analysis.physical_attributes.shape
                material = vision_analysis.physical_attributes.material_appearance
                finish = vision_analysis.physical_attributes.surface_finish
            if hasattr(vision_analysis, "branding") and vision_analysis.branding:
                branding = vision_analysis.branding.visible_brand_name
        except Exception:
            pass

    main_text = answers.get("main_text") or answers.get("mainText")
    if main_text and str(main_text).strip().lower() in ("none", "unknown"):
        main_text = None

    has_verified = bool(description or features or ingredients or formatted_price or formatted_offer)

    return ProductContext(
        name=p_name,
        category=category,
        description=description,
        ingredients=ingredients,
        features=features,
        benefits=benefits,
        specifications=specifications,
        price=formatted_price,
        offer=formatted_offer,
        urgency=urgency,
        explicit_main_text=main_text,
        usage=answers.get("usage"),
        dominant_colors=dominant_colors,
        shape_or_silhouette=shape,
        material_appearance=material,
        surface_finish=finish,
        visible_branding=branding,
        reference_image_provided=has_image,
        has_verified_details=has_verified,
    )

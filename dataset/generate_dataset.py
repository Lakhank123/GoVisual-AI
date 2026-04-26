"""
GoVisual AI — Dataset Generator
================================
Run this script to generate your complete T5 training dataset.
Output: govisual_dataset.csv (300+ rows, ready for Colab training)

Usage:
    python generate_dataset.py
"""

import csv
import itertools
import random

# ─── ALL VARIATION AXES ───────────────────────────────────────────────────────

CATEGORIES = {
    "electronics": {
        "products": ["iPhone 16", "Samsung S24 Ultra", "OnePlus 12", "iQOO Neo 9", "Realme 12 Pro",
                     "Redmi Note 13", "Boat Earbuds", "JBL Speaker", "Laptop Bag", "Smart Watch"],
        "bg_default": "dark tech gradient",
        "light_default": "neon cinematic",
        "style": "futuristic premium dark",
    },
    "clothing": {
        "products": ["Men's Kurta", "Women's Saree", "Kids Dress", "Denim Jacket", "Ethnic Lehenga",
                     "Sports T-Shirt", "Formal Suit", "Woolen Shawl", "Casual Hoodie", "Traditional Dhoti"],
        "bg_default": "clean studio white",
        "light_default": "soft daylight",
        "style": "editorial fashion",
    },
    "food": {
        "products": ["Special Biryani", "Fresh Cake", "Mithai Box", "Burger Combo", "Masala Chai",
                     "Dry Fruits Pack", "Homemade Pickle", "Chocolate Box", "Juice Bottle", "Namkeen Pack"],
        "bg_default": "warm rustic wood",
        "light_default": "warm appetizing",
        "style": "food photography warm",
    },
    "jewellery": {
        "products": ["Gold Necklace", "Diamond Ring", "Silver Anklet", "Kundan Earrings", "Pearl Bracelet",
                     "Temple Jewellery Set", "Oxidised Bangles", "Mangalsutra", "Nose Pin", "Gemstone Pendant"],
        "bg_default": "velvet black surface",
        "light_default": "golden side light",
        "style": "luxury macro jewellery",
    },
    "pharmacy": {
        "products": ["Vitamin C Tablets", "Protein Powder", "Ayurvedic Oil", "Hand Sanitizer", "Face Cream",
                     "Immunity Booster", "Calcium Supplement", "Pain Relief Spray", "Eye Drops", "Herbal Tea"],
        "bg_default": "clean clinical white",
        "light_default": "soft bright studio",
        "style": "clean health minimal",
    },
    "home_decor": {
        "products": ["Decorative Lamp", "Wall Clock", "Photo Frame", "Flower Vase", "Table Runner",
                     "Cushion Cover", "Artificial Plant", "Scented Candle", "Ceramic Mug", "Wooden Shelf"],
        "bg_default": "cozy lifestyle interior",
        "light_default": "warm ambient",
        "style": "lifestyle home warm",
    },
    "salon": {
        "products": ["Hair Treatment", "Bridal Makeup", "Facial Package", "Mehndi Design", "Nail Art",
                     "Hair Colour", "Keratin Treatment", "Party Makeup", "Eyebrow Threading", "Waxing Package"],
        "bg_default": "soft pink gradient",
        "light_default": "beauty studio bright",
        "style": "beauty glamour soft",
    },
    "furniture": {
        "products": ["Wooden Sofa", "Study Table", "King Bed", "Wardrobe", "Dining Table Set",
                     "Office Chair", "Bookshelf", "TV Unit", "Shoe Rack", "Dressing Table"],
        "bg_default": "warm interior room",
        "light_default": "golden hour ambient",
        "style": "lifestyle furniture warm",
    },
}

FORMATS = {
    "1:1":   "Instagram post",
    "9:16":  "Instagram story",
    "16:9":  "Banner",
    "4:5":   "Facebook post",
    "A4":    "Flyer",
}

PURPOSES = [
    "new arrival", "sale offer", "festival special",
    "product showcase", "brand announcement", "limited stock",
]

MOODS = [
    "premium and luxurious", "bold and energetic",
    "clean and minimal", "warm and friendly", "festive and colorful",
]

LIGHTINGS = [
    "dramatic spotlight", "soft natural light",
    "neon glow", "bright daylight", "cinematic dark",
]

BACKGROUNDS = [
    "modern tech dark", "clean studio white", "lifestyle context",
    "abstract gradient", "festive themed", "outdoor natural",
]

OFFERS = [
    "no offer", "10% discount", "20% off", "buy 1 get 1 free",
    "flat ₹500 off", "free gift with purchase",
]

PRICES = {
    "electronics": [15999, 29999, 49999, 79999, 109999],
    "clothing":    [499, 999, 1499, 2999, 5999],
    "food":        [99, 249, 499, 799, 1499],
    "jewellery":   [2999, 7999, 15999, 29999, 75000],
    "pharmacy":    [149, 299, 599, 999, 1999],
    "home_decor":  [299, 599, 1299, 2499, 4999],
    "salon":       [199, 499, 999, 1999, 3999],
    "furniture":   [3999, 8999, 19999, 35999, 79999],
}

BRAND_COLORS = {
    "electronics": [["black", "neon blue"], ["black", "purple"], ["silver", "black"], ["black", "cyan"]],
    "clothing":    [["white", "gold"], ["maroon", "gold"], ["pink", "white"], ["navy", "white"]],
    "food":        [["orange", "brown"], ["red", "yellow"], ["green", "white"], ["cream", "brown"]],
    "jewellery":   [["black", "gold"], ["white", "gold"], ["maroon", "gold"], ["navy", "gold"]],
    "pharmacy":    [["white", "green"], ["blue", "white"], ["white", "orange"], ["green", "white"]],
    "home_decor":  [["beige", "brown"], ["white", "copper"], ["grey", "gold"], ["teal", "white"]],
    "salon":       [["pink", "gold"], ["black", "rose gold"], ["white", "pink"], ["purple", "white"]],
    "furniture":   [["brown", "gold"], ["white", "wood"], ["black", "copper"], ["grey", "white"]],
}

# ─── PROMPT TEMPLATES ─────────────────────────────────────────────────────────

def build_prompt_1(row):
    """Basic Commercial — clean, clear, universally usable."""
    offer_text = f"Show '{row['offer']}' as a clean badge." if row["offer"] != "no offer" else "No promotional badges."
    return (
        f"Commercial product photograph of {row['product']} for {row['brand_name']}. "
        f"Format: {row['format']} ({row['image_type']}). "
        f"Product in {row['pose']} position, shot from front angle. "
        f"Background: {row['background']} in {row['brand_colors']} color palette. "
        f"Lighting: {row['lighting']} — even, balanced, product fully visible. "
        f"Brand name '{row['brand_name']}' in clean modern typography, bottom area. "
        f"Price ₹{row['price']} clearly displayed. "
        f"{offer_text} "
        f"Mood: {row['mood']}. Deep focus, all product details sharp. "
        f"Purpose: {row['purpose']}. "
        f"Use the uploaded reference image to match the exact product model, color, and physical form. "
        f"Do not substitute a generic product. Photorealistic, ultra-high resolution."
    )

def build_prompt_2(row):
    """Professional Brand — cinematic, brand-driven, premium."""
    offer_text = f"Include '{row['offer']}' offer badge in brand colors." if row["offer"] != "no offer" else ""
    return (
        f"Premium brand photography of {row['product']} for {row['brand_name']}. "
        f"Format: {row['format']}. "
        f"Product at dynamic 3/4 angle, {row['pose']}, with dramatic {row['lighting']} from the side. "
        f"Background: {row['background']} with {row['brand_colors']} color palette actively woven into ambient gradients. "
        f"Shallow depth of field — background dissolves into bokeh of {row['brand_colors']} tones. "
        f"Brand name '{row['brand_name']}' in bold contemporary sans-serif at golden ratio point. "
        f"Price ₹{row['price']} as a premium floating badge. "
        f"{offer_text} "
        f"Mood: {row['mood']} — confident, aspirational. "
        f"Purpose: {row['purpose']}. "
        f"Use the uploaded reference image to match the exact product model, color, and physical form. "
        f"Hyper-realistic CGI compositing, cinematic color grading, studio quality."
    )

def build_prompt_3(row):
    """Creative Masterpiece — full artistic direction, campaign-grade."""
    offer_text = f"'{row['offer']}' integrated typographically as part of the scene." if row["offer"] != "no offer" else ""
    return (
        f"Cinematic advertising campaign image of {row['product']} for {row['brand_name']}. "
        f"Format: {row['format']}. Creative concept: product emerges from pure energy. "
        f"Unconventional angle — top-down or macro detail shot capturing product at its most dramatic. "
        f"Background: {row['background']} transformed into atmospheric visual environment — "
        f"volumetric light rays in {row['brand_colors']}, particles drifting in three depth planes. "
        f"Lighting: {row['lighting']} from above creates hero spotlight, "
        f"{row['brand_colors']}-tinted rim lights sculpt every edge. "
        f"Brand name '{row['brand_name']}' typographically integrated into the scene as light itself. "
        f"Price ₹{row['price']} in frosted glass morphism badge. "
        f"{offer_text} "
        f"Mood: {row['mood']} — cinematic, emotional, campaign-worthy. "
        f"Purpose: {row['purpose']}. "
        f"Use the uploaded reference image to match the exact product model, color, and physical form. "
        f"Award-winning advertising CGI quality, 8K render, anamorphic lens flare."
    )

def build_negative_prompt(category):
    base = "blurry product, distorted logo, warped text, duplicate product, low quality, pixelated, muddy shadows, overexposed"
    extras = {
        "electronics": ", plastic-looking reflections, cheap gradient background, generic phone design",
        "food": ", unappetizing colors, artificial-looking food, bad lighting, unnatural texture",
        "jewellery": ", cartoon style, cheap surface texture, dull metal, flat lighting",
        "clothing": ", stiff mannequin pose, bad skin tones, wrinkled fabric, poor draping",
        "pharmacy": ", cluttered background, unprofessional look, messy composition",
        "home_decor": ", empty room, bad perspective, flat lighting, cheap materials",
        "salon": ", unflattering angles, bad makeup, artificial skin, overexposed face",
        "furniture": ", floating furniture, bad room context, incorrect perspective",
    }
    return base + extras.get(category, "")

# ─── BUILD INPUT TEXT STRING (T5 input) ───────────────────────────────────────

def build_input_text(row):
    return (
        f"product: {row['product']} | "
        f"category: {row['category']} | "
        f"price: {row['price']} | "
        f"format: {row['format']} | "
        f"image_type: {row['image_type']} | "
        f"purpose: {row['purpose']} | "
        f"mood: {row['mood']} | "
        f"background: {row['background']} | "
        f"lighting: {row['lighting']} | "
        f"offer: {row['offer']} | "
        f"brand: {row['brand_name']} | "
        f"colors: {row['brand_colors']} | "
        f"pose: {row['pose']} | "
        f"reference: provided"
    )

def build_target_text(row):
    p1 = build_prompt_1(row)
    p2 = build_prompt_2(row)
    p3 = build_prompt_3(row)
    return f"PROMPT1: {p1} [SEP] PROMPT2: {p2} [SEP] PROMPT3: {p3}"

# ─── GENERATE ROWS ────────────────────────────────────────────────────────────

POSES = ["floating", "standing upright", "flat lay", "handheld", "angled dynamic", "close-up macro"]
BRAND_SUFFIXES = ["Store", "Shop", "Enterprises", "Collection", "World", "Hub", "Zone", "Gallery", "Centre", "Point"]
BRAND_PREFIXES = ["Shree", "New", "Royal", "Classic", "Modern", "Prime", "Lucky", "Star", "Super", "Elite"]

def fake_brand(category):
    prefix = random.choice(BRAND_PREFIXES)
    suffix = random.choice(BRAND_SUFFIXES)
    cat_word = {
        "electronics": "Mobile", "clothing": "Fashion", "food": "Foods",
        "jewellery": "Jewels", "pharmacy": "Medicals", "home_decor": "Decor",
        "salon": "Beauty", "furniture": "Furniture",
    }.get(category, "Shop")
    return f"{prefix} {cat_word} {suffix}"

def generate_all_rows():
    rows = []
    row_id = 1

    for category, cat_data in CATEGORIES.items():
        products = cat_data["products"]
        color_options = BRAND_COLORS[category]
        price_options = PRICES[category]

        combos = list(itertools.product(
            products,
            FORMATS.items(),
            PURPOSES,
        ))
        random.shuffle(combos)

        for product, (fmt, img_type), purpose in combos:
            mood       = random.choice(MOODS)
            lighting   = random.choice(LIGHTINGS)
            background = random.choice(BACKGROUNDS)
            offer      = random.choice(OFFERS)
            pose       = random.choice(POSES)
            price      = random.choice(price_options)
            colors     = random.choice(color_options)
            brand      = fake_brand(category)
            img_path   = f"dataset/images/{category}/{product.lower().replace(' ', '_')}.jpg"

            row = {
                "id":                   row_id,
                "category":             category,
                "product":              product,
                "price":                price,
                "format":               fmt,
                "image_type":           img_type,
                "purpose":              purpose,
                "mood":                 mood,
                "lighting":             lighting,
                "background":           background,
                "offer":                offer,
                "pose":                 pose,
                "brand_name":           brand,
                "brand_colors":         " & ".join(colors),
                "reference_image_path": img_path,
            }

            row["input_text"]  = build_input_text(row)
            row["target_text"] = build_target_text(row)
            row["negative_prompt"] = build_negative_prompt(category)

            rows.append(row)
            row_id += 1

            if len(rows) >= 400:
                return rows

    return rows

# ─── WRITE CSV ────────────────────────────────────────────────────────────────

def main():
    print("Generating dataset...")
    rows = generate_all_rows()
    random.shuffle(rows)

    fieldnames = [
        "id", "category", "product", "price", "format", "image_type",
        "purpose", "mood", "lighting", "background", "offer", "pose",
        "brand_name", "brand_colors", "reference_image_path",
        "input_text", "target_text", "negative_prompt",
    ]

    with open("govisual_dataset.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Done. {len(rows)} rows written to govisual_dataset.csv")
    print(f"Categories: {len(CATEGORIES)}")
    print(f"Unique products: {sum(len(v['products']) for v in CATEGORIES.values())}")

if __name__ == "__main__":
    main()

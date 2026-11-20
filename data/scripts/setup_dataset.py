import os
import json
import csv
from datetime import datetime

base_dir = "research/phase0/dataset"
products_dir = os.path.join(base_dir, "products")

# Categories and targets
categories = {
    "food_beverage": 5,
    "fashion": 5,
    "electronics": 5,
    "beauty_personal_care": 5,
    "automotive": 4,
    "home_lifestyle": 4,
    "jewellery": 3,
    "other": 4
}

# Create directories
os.makedirs(products_dir, exist_ok=True)

# Dataset manifest
manifest = {
    "dataset_name": "GoVisual Controlled Evaluation Dataset",
    "version": "0.1",
    "purpose": "Research evaluation of marketing creative generation",
    "product_count": sum(categories.values()),
    "scenario_count": sum(categories.values()) * 3,
    "dataset_type": "evaluation",
    "created": datetime.now().strftime("%Y-%m-%d")
}

with open(os.path.join(base_dir, "dataset_manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)

# README
readme_content = """# GoVisual AI Controlled Evaluation Dataset

## Purpose
This dataset is intended for controlled evaluation and experimentation. It is not currently intended for training a new image-generation model.

## Dataset Type
Evaluation / Benchmark Dataset for comparing GoVisual AI versions.

## Product Categories
- Food & Beverage
- Fashion
- Electronics
- Beauty / Personal Care
- Automotive
- Home / Lifestyle
- Jewellery
- Other Consumer Products

## Metadata Structure
`metadata.json` describes the physical attributes and source of the product image.
`brand.json` describes the brand identity, styling, and target audience.
`prompts.json` contains marketing scenarios for generation.

## Prompt Structure
Each scenario contains:
- Marketing Objective
- Scene
- Style
- Lighting
- Composition
- Required Elements

## Source/Licensing
All images must be appropriately sourced public images, openly licensed, or project-owned.
Currently, images are pending human review/collection to ensure compliance with academic project rules.

## Failure Categories
For future evaluation, the following failure categories are defined:
- PRODUCT: Product not recognizable or distorted.
- BRAND: Brand colors, style, or identity ignored.
- PROMPT: Instructions for scene, style, or lighting not followed.
- COMPOSITION: Bad framing or layout.
- LIGHTING: Poor lighting or shadows.
- PHYSICAL_REALISM: Unnatural rendering, artifacts, or physics violations.
- TEXT: Hallucinated or malformed text (if applicable).
- NONE: Generation was successful.

## Validation Process
Run `validate_dataset.py` to verify image presence, JSON formatting, and completeness.

## Versioning
Version 0.1 (Initial Structure). Do not change the dataset between model experiments without bumping the version.
"""
with open(os.path.join(base_dir, "README.md"), "w") as f:
    f.write(readme_content)

# Setup products and CSV
products_csv_path = os.path.join(base_dir, "products.csv")
csv_headers = ["product_id", "product_name", "category", "subcategory", "brand", "image_path", "image_width", "image_height", "image_format", "source_type", "source_reference"]

csv_rows = []

product_counter = 1
for cat, count in categories.items():
    for i in range(count):
        pid = f"P{product_counter:03d}"
        pdir = os.path.join(products_dir, pid)
        os.makedirs(pdir, exist_ok=True)
        
        # metadata.json
        meta = {
            "product_id": pid,
            "product_name": f"Example {cat} Product {i+1}",
            "category": cat,
            "subcategory": "general",
            "brand": f"Brand{pid}",
            "description": "Pending collection",
            "attributes": ["unknown"],
            "dominant_colors": ["#000000"],
            "source": {
                "type": "pending",
                "reference": "pending collection due to source limitations"
            },
            "image": {
                "filename": "product.jpg",
                "width": 0,
                "height": 0,
                "format": "jpg"
            }
        }
        with open(os.path.join(pdir, "metadata.json"), "w") as f:
            json.dump(meta, f, indent=2)
            
        # brand.json
        brand = {
            "brand_name": f"Brand{pid}",
            "brand_description": "Pending collection",
            "brand_colors": ["#000000", "#FFFFFF"],
            "visual_style": ["premium", "modern"],
            "target_audience": "unknown",
            "tone": ["premium"]
        }
        with open(os.path.join(pdir, "brand.json"), "w") as f:
            json.dump(brand, f, indent=2)
            
        # prompts.json
        prompts = [
            {
                "prompt_id": f"{pid}_C01",
                "objective": "premium_product_ad",
                "scene": "premium studio environment",
                "style": "luxury commercial photography",
                "lighting": "soft studio lighting",
                "composition": "hero product composition",
                "marketing_requirement": "Create a premium advertisement that makes the product the visual focus."
            },
            {
                "prompt_id": f"{pid}_C02",
                "objective": "lifestyle_ad",
                "scene": "modern urban lifestyle setting",
                "style": "commercial lifestyle photography",
                "lighting": "natural warm lighting",
                "composition": "product integrated naturally into the scene",
                "marketing_requirement": "Create a lifestyle advertisement showing the product in a realistic commercial context."
            },
            {
                "prompt_id": f"{pid}_C03",
                "objective": "social_media_ad",
                "scene": "visually striking contemporary setting",
                "style": "modern social media advertising",
                "lighting": "dramatic commercial lighting",
                "composition": "strong central product focus",
                "marketing_requirement": "Create an attention-grabbing social media advertisement."
            }
        ]
        with open(os.path.join(pdir, "prompts.json"), "w") as f:
            json.dump(prompts, f, indent=2)
            
        csv_rows.append({
            "product_id": pid,
            "product_name": meta["product_name"],
            "category": cat,
            "subcategory": "general",
            "brand": brand["brand_name"],
            "image_path": f"products/{pid}/product.jpg",
            "image_width": 0,
            "image_height": 0,
            "image_format": "jpg",
            "source_type": "pending",
            "source_reference": "pending"
        })
        product_counter += 1

with open(products_csv_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=csv_headers)
    writer.writeheader()
    writer.writerows(csv_rows)

print("Dataset structure created successfully.")

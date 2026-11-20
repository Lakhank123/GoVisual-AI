import os
import shutil
import json
import csv
from datetime import datetime

base_dir = r"c:\Users\HP\OneDrive\Desktop\WebDevProject\GoVisualAI\research\phase0\dataset"
products_dir = os.path.join(base_dir, "products")
excluded_dir = os.path.join(base_dir, "excluded")
os.makedirs(products_dir, exist_ok=True)
os.makedirs(excluded_dir, exist_ok=True)

# List of files in dataset directory
files = [f for f in os.listdir(base_dir) if os.path.isfile(os.path.join(base_dir, f)) and f.lower().endswith(('.jpg', '.jpeg', '.jfif', '.png', '.webp'))]

categories_map = {
    "AUTOMOTORS": "automotive",
    "BEAUTY": "beauty",
    "ELECTRONICS": "electronics",
    "F AND B": "food_beverage",
    "FASHION": "fashion",
    "HOME AND LIFESTYLE": "home_lifestyle",
    "JEWELLERY": "jewellery"
}

excluded = []
products = []
product_counter = 1

for file in files:
    file_path = os.path.join(base_dir, file)
    size = os.path.getsize(file_path)
    
    # Simple logic to determine category based on filename
    category = "other_consumer_products"
    for k, v in categories_map.items():
        if file.upper().startswith(k):
            category = v
            break
            
    # Exclude logic based on file size as proxy for "unclear/unsuitable"
    if size < 12000:
        reason = "File size too small; likely a thumbnail or poor resolution. Unsuitable as a primary product reference."
        excluded.append({"filename": file, "reason": reason})
        shutil.move(file_path, os.path.join(excluded_dir, file))
        continue
        
    pid = f"P{product_counter:03d}"
    pdir = os.path.join(products_dir, pid)
    os.makedirs(pdir, exist_ok=True)
    
    ext = file.split('.')[-1]
    new_filename = f"product.{ext}"
    new_file_path = os.path.join(pdir, new_filename)
    
    shutil.move(file_path, new_file_path)
    
    # Metadata
    meta = {
        "product_id": pid,
        "product_name": f"Conservative {category.replace('_', ' ').title()} Product",
        "category": category,
        "subcategory": "general",
        "brand": "unknown",
        "description": f"A standard {category.replace('_', ' ')} product.",
        "attributes": ["unknown"],
        "dominant_colors": [],
        "source": {
            "type": "manual_collection",
            "reference": "source not recorded"
        },
        "image": {
            "filename": new_filename,
            "width": 0,
            "height": 0,
            "format": ext
        }
    }
    with open(os.path.join(pdir, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)
        
    # Brand
    brand = {
        "brand_name": "unknown",
        "brand_description": "unknown",
        "brand_colors": [],
        "visual_style": [],
        "target_audience": "unknown",
        "tone": []
    }
    with open(os.path.join(pdir, "brand.json"), "w") as f:
        json.dump(brand, f, indent=2)
        
    # Prompts
    prompts = [
        {
            "prompt_id": f"{pid}_C01",
            "objective": "premium_product_ad",
            "scene": "premium studio environment",
            "style": "luxury commercial photography",
            "lighting": "soft studio lighting",
            "composition": "hero product composition"
        },
        {
            "prompt_id": f"{pid}_C02",
            "objective": "lifestyle_ad",
            "scene": "modern lifestyle environment",
            "style": "commercial lifestyle photography",
            "lighting": "natural or warm commercial lighting",
            "composition": "product integrated naturally into the scene"
        },
        {
            "prompt_id": f"{pid}_C03",
            "objective": "social_media_ad",
            "scene": "visually striking contemporary environment",
            "style": "modern social media advertising",
            "lighting": "dramatic commercial lighting",
            "composition": "strong product focus"
        }
    ]
    with open(os.path.join(pdir, "prompts.json"), "w") as f:
        json.dump(prompts, f, indent=2)
        
    products.append({
        "product_id": pid,
        "product_name": meta["product_name"],
        "category": category,
        "subcategory": "general",
        "brand": "unknown",
        "image_path": f"products/{pid}/{new_filename}",
        "image_width": 0,
        "image_height": 0,
        "image_format": ext,
        "source_type": "manual_collection",
        "source_reference": "source not recorded",
        "original_file": file
    })
    
    product_counter += 1

# Write excluded.json
if excluded:
    with open(os.path.join(excluded_dir, "excluded_images.json"), "w") as f:
        json.dump(excluded, f, indent=2)

# Cleanup any empty legacy directories in products
for item in os.listdir(products_dir):
    p = os.path.join(products_dir, item)
    if os.path.isdir(p) and not any(f.startswith("product.") for f in os.listdir(p)):
        shutil.rmtree(p)

# Update CSV
csv_path = os.path.join(base_dir, "products.csv")
csv_headers = ["product_id", "product_name", "category", "subcategory", "brand", "image_path", "image_width", "image_height", "image_format", "source_type", "source_reference"]

with open(csv_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=csv_headers)
    writer.writeheader()
    for p in products:
        row = {k: p[k] for k in csv_headers}
        writer.writerow(row)
        
# Manifest update or creation
manifest_path = os.path.join(base_dir, "dataset_manifest.json")
try:
    with open(manifest_path, "r") as f:
        manifest = json.load(f)
except FileNotFoundError:
    manifest = {
        "dataset_name": "GoVisual Controlled Evaluation Dataset",
        "version": "0.1",
        "purpose": "Research evaluation of marketing creative generation",
        "dataset_type": "evaluation"
    }

# Calculate category counts
cat_counts = {}
for p in products:
    cat_counts[p["category"]] = cat_counts.get(p["category"], 0) + 1

manifest["product_count"] = len(products)
manifest["scenario_count"] = len(products) * 3
manifest["category_counts"] = cat_counts
manifest["updated"] = datetime.now().strftime("%Y-%m-%d")

with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2)

print("Organization complete.")
print(f"Total valid products: {len(products)}")
print(f"Total excluded: {len(excluded)}")

# GoVisual AI — Evaluation Dataset Documentation

## 1. Dataset Overview
- **Primary Source File:** `govisual_dataset_v2.csv` (Located at repository root)
- **Record Count:** Exactly 650 curated product marketing prompt rows
- **Data Domains / Categories (7 Total):**
  - `food`: 100 rows (15.38%)
  - `pharmacy`: 100 rows (15.38%)
  - `clothing`: 100 rows (15.38%)
  - `electronics`: 100 rows (15.38%)
  - `salon`: 50 rows (7.69%)
  - `home_decor`: 100 rows (15.38%)
  - `jewellery`: 100 rows (15.38%)

## 2. Experimental Data Splits
Following the historical training protocol established in Google Colab (`colab/govisual_t5_training.py`), the dataset is partitioned using an 80/10/10 split with seed `42`:
- **Training Set:** 520 rows (80.0%)
- **Validation Set:** 65 rows (10.0%)
- **Held-Out Test Set:** 65 rows (10.0%)

### Split Derivation
The splits are generated deterministically via NumPy/Pandas permutation:
```python
import numpy as np
# Seed 42 permutation across 650 indices
perm = np.random.RandomState(42).permutation(650)
train_indices = perm[:520]
val_indices   = perm[520:585]
test_indices  = perm[585:650]
```

## 3. Data Leakage & Split Independence Audit
- **Exact Input Leakage:** **0.00%** (0 duplicate `input_text` strings across train, validation, and test).
- **Product-Level Overlap:** 44 of the 65 products in the held-out test set share product names with products present in the training set (e.g., "Redmi Note 13 Pro", "Classic Mangalsutra", "Knee Pain Relief Spray").
- **Independence Classification:** The held-out test set represents an **in-domain / novel-scenario test set**. It evaluates generalization across unseen combinations of backgrounds, lighting, promotional offers, and formats for commercial product categories, rather than zero-shot unseen product categories.

## 4. Column Schema
| Column | Description | Example |
|---|---|---|
| `id` | Unique row identifier | `227` |
| `category` | Product domain | `food`, `electronics`, `clothing` |
| `product` | Primary product name | `Dry Fruits Gift Pack` |
| `price` | Listing price in INR | `1299` |
| `format` | Target creative aspect ratio | `16:9`, `1:1`, `9:16` |
| `image_type` | Marketing format | `Banner`, `Post`, `Story` |
| `purpose` | Campaign intention | `new menu item`, `festive sale` |
| `background` | Environmental backdrop | `natural bamboo mat` |
| `lighting` | Studio lighting specification | `golden studio` |
| `offer` | Commercial call-to-action / discount | `flat Rs.500 off` |
| `brand_name` | Commercial sponsor | `Star Foods Hub` |
| `brand_colors` | Target color palette | `cream & brown` |
| `input_text` | Structured input fed to T5 model | `product: ... \| category: ...` |
| `target_text` | Ground truth reference prompts | `PROMPT1: ... [SEP] PROMPT2: ...` |
| `negative_prompt` | Negative prompt tokens | `blurry product, distorted logo...` |

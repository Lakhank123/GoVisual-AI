"""
GoVisual AI — Automated Test Suite for Evaluation Engine
Validates metric implementations (ROUGE, Distinct-N, Laplacian Sharpness, RMS Contrast,
GoVisual Quality Score) and checks dataset audit integrity.
100% offline, zero paid API calls.
"""

import os
import sys
import pytest
import numpy as np
from PIL import Image

# Add evaluation scripts and backend to path
EVAL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(EVAL_DIR, "scripts")
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from evaluate_t5 import (
    tokenize_words,
    compute_ngram_f1,
    compute_lcs_length,
    compute_rouge_l,
    compute_distinct_n,
    compute_constraint_coverage,
    generate_deterministic_template
)
from evaluate_images import (
    compute_sharpness_laplacian,
    compute_rms_contrast,
    compute_color_entropy,
    compute_composition_metrics
)
from validate_dataset import validate_dataset

# -------------------------------------------------------------
# Text Metric Tests
# -------------------------------------------------------------

def test_rouge_identical_strings():
    """Identical strings should achieve 100% precision, recall, and F1."""
    text = "commercial product photography of dry fruits gift pack"
    tokens = tokenize_words(text)
    p, r, f1 = compute_ngram_f1(tokens, tokens, n=1)
    assert p == 1.0 and r == 1.0 and f1 == 1.0
    
    p2, r2, f2 = compute_ngram_f1(tokens, tokens, n=2)
    assert p2 == 1.0 and r2 == 1.0 and f2 == 1.0
    
    pl, rl, fl = compute_rouge_l(tokens, tokens)
    assert pl == 1.0 and rl == 1.0 and fl == 1.0

def test_rouge_disjoint_strings():
    """Completely disjoint strings should yield 0.0 overlap."""
    t1 = tokenize_words("red leather jacket")
    t2 = tokenize_words("smartphone battery charger")
    _, _, f1 = compute_ngram_f1(t1, t2, n=1)
    _, _, fl = compute_rouge_l(t1, t2)
    assert f1 == 0.0
    assert fl == 0.0

def test_lcs_length():
    """Tests Longest Common Subsequence calculation against known sequence."""
    x = ["a", "b", "c", "d", "e"]
    y = ["a", "c", "e"]
    assert compute_lcs_length(x, y) == 3

def test_distinct_n():
    """Tests lexical diversity metric."""
    repetitive = [["word", "word", "word", "word"]]
    diverse = [["commercial", "product", "studio", "lighting"]]
    assert compute_distinct_n(repetitive, n=1) == 0.25 # 1 unique out of 4
    assert compute_distinct_n(diverse, n=1) == 1.0

def test_constraint_coverage():
    """Tests preservation check of product, brand, background, lighting."""
    row = {
        "product": "Leather Wallet",
        "brand_name": "LuxCo",
        "background": "Dark Slate Backdrop",
        "lighting": "Golden Rim Lighting"
    }
    good_prompt = "Hero shot of Leather Wallet for LuxCo against dark slate backdrop with golden rim lighting."
    bad_prompt = "Generic handbag in a green park on a sunny day."
    
    assert compute_constraint_coverage(good_prompt, row) == 1.0
    assert compute_constraint_coverage(bad_prompt, row) == 0.0

# -------------------------------------------------------------
# Computer Vision Metric Tests
# -------------------------------------------------------------

def test_sharpness_laplacian_uniform_vs_textured():
    """Flat image has 0 sharpness variance; textured image has high variance."""
    flat = np.full((100, 100), 128, dtype=np.uint8)
    assert compute_sharpness_laplacian(flat) == 0.0
    
    np.random.seed(42)
    textured = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    assert compute_sharpness_laplacian(textured) > 500.0

def test_rms_contrast():
    """Uniform image has 0 RMS contrast; black/white split has 0.5."""
    flat = np.full((100, 100), 128, dtype=np.uint8)
    assert compute_rms_contrast(flat) == 0.0
    
    split = np.zeros((100, 100), dtype=np.uint8)
    split[:, 50:] = 255
    contrast = compute_rms_contrast(split)
    assert 0.49 < contrast < 0.51

def test_composition_rule_of_thirds():
    """Mass centered in middle or on third should produce high composition score."""
    img = np.full((100, 100), 255, dtype=np.uint8) # White background
    img[40:60, 40:60] = 0 # Dark product in center
    metrics = compute_composition_metrics(img)
    assert 0.45 <= metrics["center_x"] <= 0.55
    assert 0.45 <= metrics["center_y"] <= 0.55
    assert metrics["rule_of_thirds_score"] > 0.8

# -------------------------------------------------------------
# Dataset Validation Audit Tests
# -------------------------------------------------------------

def test_dataset_audit_no_leakage():
    """Validates that govisual_dataset_v2.csv exists and has 0 exact leakage."""
    dataset_csv = os.path.join(os.path.dirname(EVAL_DIR), "data", "govisual_dataset_v2.csv")
    if not os.path.exists(dataset_csv):
        dataset_csv = os.path.join(os.path.dirname(EVAL_DIR), "govisual_dataset_v2.csv")
    if os.path.exists(dataset_csv):
        audit = validate_dataset(dataset_csv, seed=42)
        assert audit["total_records"] == 650
        assert audit["exact_leakage"]["test_in_train"] == 0
        assert audit["exact_leakage"]["val_in_train"] == 0
        assert audit["split_counts"]["test"] == 65

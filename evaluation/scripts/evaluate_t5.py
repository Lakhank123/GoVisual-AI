"""
GoVisual AI — T5 Model & Prompt Evaluation Pipeline
Evaluates the fine-tuned T5-Small model against baselines on the 65-sample held-out test set.
Computes ROUGE-1, ROUGE-2, ROUGE-L, Distinct-n, Constraint Coverage, and Latency.
Zero live paid API calls. Runs fully offline on local weights.
"""

import os
import sys
import csv
import json
import time
import re
from collections import Counter
import numpy as np

# Set standard UTF-8 console output
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# -------------------------------------------------------------
# Metric Implementations (ROUGE, Distinct-N, Constraints)
# -------------------------------------------------------------

def tokenize_words(text: str):
    """Tokenize text into lowercase alphanumeric word tokens."""
    return re.findall(r"\b\w+\b", text.lower())

def compute_ngram_f1(cand_tokens, ref_tokens, n=1):
    """Calculates n-gram precision, recall, and F1 score."""
    if len(cand_tokens) < n or len(ref_tokens) < n:
        return 0.0, 0.0, 0.0
    cand_ngrams = Counter(tuple(cand_tokens[i:i+n]) for i in range(len(cand_tokens) - n + 1))
    ref_ngrams  = Counter(tuple(ref_tokens[i:i+n]) for i in range(len(ref_tokens) - n + 1))
    
    overlap = sum(min(count, ref_ngrams[ng]) for ng, count in cand_ngrams.items())
    precision = overlap / sum(cand_ngrams.values()) if cand_ngrams else 0.0
    recall    = overlap / sum(ref_ngrams.values()) if ref_ngrams else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return precision, recall, f1

def compute_lcs_length(x, y):
    """Calculates length of Longest Common Subsequence between token sequences."""
    m, n = len(x), len(y)
    prev = [0] * (n + 1)
    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if x[i - 1] == y[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr
    return prev[n]

def compute_rouge_l(cand_tokens, ref_tokens):
    """Calculates ROUGE-L precision, recall, and F1 score based on LCS."""
    if not cand_tokens or not ref_tokens:
        return 0.0, 0.0, 0.0
    lcs = compute_lcs_length(cand_tokens, ref_tokens)
    precision = lcs / len(cand_tokens)
    recall    = lcs / len(ref_tokens)
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return precision, recall, f1

def compute_distinct_n(token_lists, n=1):
    """Computes Distinct-n lexical diversity across all evaluated texts."""
    all_ngrams = []
    for tokens in token_lists:
        if len(tokens) >= n:
            all_ngrams.extend(tuple(tokens[i:i+n]) for i in range(len(tokens) - n + 1))
    if not all_ngrams:
        return 0.0
    return len(set(all_ngrams)) / len(all_ngrams)

def compute_constraint_coverage(prompt: str, row: dict) -> float:
    """Measures ratio of required brief constraints preserved in the prompt."""
    prompt_lower = prompt.lower()
    constraints = []
    
    # Check product name
    prod = row.get("product", "").strip().lower()
    if prod:
        constraints.append(prod in prompt_lower)
        
    # Check brand name
    brand = row.get("brand_name", "").strip().lower()
    if brand:
        constraints.append(brand in prompt_lower)
        
    # Check background setting
    bg = row.get("background", "").strip().lower()
    if bg:
        # Check either full string or key terms
        bg_words = [w for w in re.findall(r"\b\w+\b", bg) if len(w) > 3]
        if bg in prompt_lower or any(w in prompt_lower for w in bg_words):
            constraints.append(True)
        else:
            constraints.append(False)
            
    # Check lighting setting
    lighting = row.get("lighting", "").strip().lower()
    if lighting:
        light_words = [w for w in re.findall(r"\b\w+\b", lighting) if len(w) > 3]
        if lighting in prompt_lower or any(w in prompt_lower for w in light_words):
            constraints.append(True)
        else:
            constraints.append(False)
            
    if not constraints:
        return 1.0
    return sum(constraints) / len(constraints)

# -------------------------------------------------------------
# Baseline Generation Logic
# -------------------------------------------------------------

def generate_deterministic_template(row: dict) -> str:
    """Deterministic prompt constructor baseline."""
    product = row.get("product", "product")
    brand = row.get("brand_name", "the brand")
    bg = row.get("background", "clean studio backdrop")
    lighting = row.get("lighting", "studio lighting")
    fmt = row.get("format", "1:1")
    offer = row.get("offer", "").strip()
    offer_str = f" Promotional callout: '{offer}'." if offer else ""
    
    return (
        f"Clean commercial product photograph of {product} for {brand}. "
        f"Format: {fmt}. Setting: {bg} with {lighting} lighting.{offer_str} "
        f"Use the uploaded reference image to match the exact product model, "
        f"color, and physical form. Do not substitute a generic product."
    )

def generate_fallback_prompt(row: dict) -> str:
    """Existing fallback template logic from services/t5_model.py."""
    product = row.get("product", "product")
    brand = row.get("brand_name", "the brand")
    bg = row.get("background", "studio")
    lighting = row.get("lighting", "cinematic")
    mood = row.get("mood", "premium")
    colors = row.get("brand_colors", "brand colors")
    
    return (
        f"SUBJECT: Commercial product photograph of {product} for {brand}. "
        f"SCENE: {bg} with {lighting} lighting. "
        f"LIGHTING: professional studio lighting, rim lighting, glowing {colors} accents. "
        f"COMPOSITION: Centered hero placement. MOOD: {mood}."
    )

# -------------------------------------------------------------
# Main Evaluation Routine
# -------------------------------------------------------------

def evaluate_t5_pipeline(dataset_path: str = "data/govisual_dataset_v2.csv", batch_size: int = 5):
    if not os.path.exists(dataset_path) and os.path.exists("govisual_dataset_v2.csv"):
        dataset_path = "govisual_dataset_v2.csv"
    print("=" * 75)
    print("GOVISUAL AI -- T5 MODEL & PROMPT ENHANCEMENT BENCHMARK")
    print("=" * 75)
    
    # 1. Load dataset & isolate 65-sample held-out test split
    with open(dataset_path, "r", encoding="utf-8") as f:
        all_rows = list(csv.DictReader(f))
        
    perm = np.random.RandomState(42).permutation(len(all_rows))
    test_rows = [all_rows[i] for i in perm[585:650]]
    print(f"[OK] Isolated genuine held-out test set: {len(test_rows)} samples (Split indices: perm[585:650])")
    
    # 2. Load fine-tuned T5 model and tokenizer
    import torch
    from transformers import T5Tokenizer, T5ForConditionalGeneration
    from services.t5_model import MODEL_PATH
    
    print(f"[INFO] Loading fine-tuned T5 weights from: {MODEL_PATH}")
    tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
    model = T5ForConditionalGeneration.from_pretrained(MODEL_PATH, local_files_only=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()
    print(f"[OK] Model loaded successfully on {device}. Architecture: T5-Small (60.5M params)")
    
    # 3. Generate candidate prompts across 4 conditions
    conditions = ["unenhanced", "template", "t5_fallback", "t5_model"]
    generations = {cond: [] for cond in conditions}
    latencies = {cond: [] for cond in conditions}
    
    print("\n[INFO] Executing prompt generation across 4 conditions...")
    
    # Baseline 1: Unenhanced prompt
    for row in test_rows:
        t0 = time.time()
        generations["unenhanced"].append(row["input_text"])
        latencies["unenhanced"].append((time.time() - t0) * 1000)
        
    # Baseline 2: Deterministic template
    for row in test_rows:
        t0 = time.time()
        generations["template"].append(generate_deterministic_template(row))
        latencies["template"].append((time.time() - t0) * 1000)
        
    # Baseline 3: Built-in rule-based fallback
    for row in test_rows:
        t0 = time.time()
        generations["t5_fallback"].append(generate_fallback_prompt(row))
        latencies["t5_fallback"].append((time.time() - t0) * 1000)
        
    # Baseline 4: Custom Fine-Tuned T5 Model (batched)
    print(f"[INFO] Running T5 model inference on {len(test_rows)} test samples (Batch size: {batch_size})...")
    
    for i in range(0, len(test_rows), batch_size):
        batch_slice = test_rows[i:i + batch_size]
        prefixed_inputs = ["generate prompts: " + r["input_text"] for r in batch_slice]
        
        t0 = time.time()
        inputs = tokenizer(prefixed_inputs, return_tensors="pt", padding=True, truncation=True, max_length=256).to(device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=256,
                num_beams=1, # Greedy decoding for fast, deterministic evaluation
                no_repeat_ngram_size=3
            )
        batch_duration_ms = (time.time() - t0) * 1000
        per_sample_latency = batch_duration_ms / len(batch_slice)
        
        for out in outputs:
            decoded = tokenizer.decode(out, skip_special_tokens=True).strip()
            # Extract first prompt from multi-prompt format
            if "[SEP]" in decoded:
                decoded = decoded.split("[SEP]")[0]
            for pfx in ["PROMPT1:", "PROMPT2:", "PROMPT3:"]:
                decoded = decoded.replace(pfx, "")
            decoded = decoded.strip()
            generations["t5_model"].append(decoded)
            latencies["t5_model"].append(per_sample_latency)
            
        print(f"  Processed [{min(i + batch_size, len(test_rows))}/{len(test_rows)}] test samples...")
        
    print("[OK] Prompt generation complete across all conditions.")
    
    # 4. Compute Metrics for each condition against target_text
    results_summary = {}
    tokens_by_condition = {}
    
    ref_texts = [r["target_text"] for r in test_rows]
    ref_token_lists = [tokenize_words(ref) for ref in ref_texts]
    
    for cond in conditions:
        cand_texts = generations[cond]
        cand_token_lists = [tokenize_words(c) for c in cand_texts]
        tokens_by_condition[cond] = cand_token_lists
        
        r1_scores = [compute_ngram_f1(c, r, 1) for c, r in zip(cand_token_lists, ref_token_lists)]
        r2_scores = [compute_ngram_f1(c, r, 2) for c, r in zip(cand_token_lists, ref_token_lists)]
        rl_scores = [compute_rouge_l(c, r) for c, r in zip(cand_token_lists, ref_token_lists)]
        
        validity = [1.0 if (len(c) > 20 and not c.startswith("Error")) else 0.0 for c in cand_texts]
        coverage = [compute_constraint_coverage(c, row) for c, row in zip(cand_texts, test_rows)]
        
        word_lens = [len(c.split()) for c in cand_texts]
        char_lens = [len(c) for c in cand_texts]
        
        results_summary[cond] = {
            "rouge1_p": round(float(np.mean([s[0] for s in r1_scores])) * 100, 2),
            "rouge1_r": round(float(np.mean([s[1] for s in r1_scores])) * 100, 2),
            "rouge1_f1": round(float(np.mean([s[2] for s in r1_scores])) * 100, 2),
            "rouge2_p": round(float(np.mean([s[0] for s in r2_scores])) * 100, 2),
            "rouge2_r": round(float(np.mean([s[1] for s in r2_scores])) * 100, 2),
            "rouge2_f1": round(float(np.mean([s[2] for s in r2_scores])) * 100, 2),
            "rougeL_p": round(float(np.mean([s[0] for s in rl_scores])) * 100, 2),
            "rougeL_r": round(float(np.mean([s[1] for s in rl_scores])) * 100, 2),
            "rougeL_f1": round(float(np.mean([s[2] for s in rl_scores])) * 100, 2),
            "distinct_1": round(float(compute_distinct_n(cand_token_lists, 1)) * 100, 2),
            "distinct_2": round(float(compute_distinct_n(cand_token_lists, 2)) * 100, 2),
            "prompt_validity_rate": round(float(np.mean(validity)) * 100, 2),
            "constraint_coverage": round(float(np.mean(coverage)) * 100, 2),
            "mean_word_count": round(float(np.mean(word_lens)), 1),
            "mean_char_count": round(float(np.mean(char_lens)), 1),
            "latency_mean_ms": round(float(np.mean(latencies[cond])), 2),
            "latency_median_ms": round(float(np.median(latencies[cond])), 2),
            "latency_p95_ms": round(float(np.percentile(latencies[cond], 95)), 2),
        }
        
    # 5. Print Comparison Table
    print("\n" + "=" * 88)
    print("HELD-OUT TEST SET (N=65) BENCHMARK RESULTS")
    print("=" * 88)
    headers = ["Condition", "ROUGE-1 F1", "ROUGE-2 F1", "ROUGE-L F1", "Distinct-1", "Distinct-2", "Coverage", "Latency (Med)"]
    print(f"{headers[0]:<22} | {headers[1]:<10} | {headers[2]:<10} | {headers[3]:<10} | {headers[4]:<10} | {headers[5]:<10} | {headers[6]:<9} | {headers[7]:<12}")
    print("-" * 88)
    
    cond_names = {
        "unenhanced": "1. Unenhanced Input",
        "template": "2. Template Baseline",
        "t5_fallback": "3. Rule-Based Fallback",
        "t5_model": "4. Custom T5 (GoVisual)"
    }
    
    for cond in conditions:
        r = results_summary[cond]
        lat = f"{r['latency_median_ms']:.1f}ms" if r['latency_median_ms'] < 1000 else f"{r['latency_median_ms']/1000:.2f}s"
        print(f"{cond_names[cond]:<22} | {r['rouge1_f1']:>9.2f}% | {r['rouge2_f1']:>9.2f}% | {r['rougeL_f1']:>9.2f}% | {r['distinct_1']:>9.2f}% | {r['distinct_2']:>9.2f}% | {r['constraint_coverage']:>8.1f}% | {lat:>12}")
    print("=" * 88)
    
    # 6. Save Machine-Readable Outputs
    results_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")
    os.makedirs(results_dir, exist_ok=True)
    
    # Save JSON summary
    metrics_json_path = os.path.join(results_dir, "t5_evaluation_metrics.json")
    with open(metrics_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "test_sample_size": len(test_rows),
            "model_path": MODEL_PATH,
            "architecture": "t5-small (60.5M parameters)",
            "metrics": results_summary,
            "semantic_similarity_bertscore": "PENDING (Local PyTorch offline environment lacks sentence-transformers package)",
            "historical_colab_claims": {
                "reported_rouge1": 48.72,
                "reported_rouge2": 31.45,
                "reported_rougeL": 41.38,
                "reported_score_around_98": "UNVERIFIED (Audit confirmed no 98 score exists in repository code or evaluation logs)"
            }
        }, f, indent=2)
    print(f"\n[OK] Metrics saved to: {metrics_json_path}")
    
    # Save Benchmark CSV
    benchmark_csv_path = os.path.join(results_dir, "t5_benchmark_comparison.csv")
    with open(benchmark_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["condition", "display_name", "rouge1_f1", "rouge2_f1", "rougeL_f1", "distinct_1", "distinct_2", "constraint_coverage", "validity_rate", "latency_median_ms", "latency_p95_ms"])
        for cond in conditions:
            r = results_summary[cond]
            writer.writerow([
                cond,
                cond_names[cond],
                r["rouge1_f1"],
                r["rouge2_f1"],
                r["rougeL_f1"],
                r["distinct_1"],
                r["distinct_2"],
                r["constraint_coverage"],
                r["prompt_validity_rate"],
                r["latency_median_ms"],
                r["latency_p95_ms"]
            ])
    print(f"[OK] Benchmark table saved to: {benchmark_csv_path}")
    
    # Save Sample Generations CSV
    sample_csv_path = os.path.join(results_dir, "t5_sample_generations.csv")
    with open(sample_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["sample_id", "category", "product", "unenhanced_prompt", "template_prompt", "t5_model_prompt", "ground_truth_target"])
        for idx, row in enumerate(test_rows):
            writer.writerow([
                row.get("id", str(idx + 1)),
                row.get("category", ""),
                row.get("product", ""),
                generations["unenhanced"][idx],
                generations["template"][idx],
                generations["t5_model"][idx],
                row.get("target_text", "")
            ])
    print(f"[OK] Sample generations saved to: {sample_csv_path}")
    print("=" * 75)
    return results_summary

if __name__ == "__main__":
    evaluate_t5_pipeline()

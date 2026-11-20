"""
GoVisual AI — Multi-Workflow & Competing Model Comparative Analysis
Statistically benchmarks GoVisual AI generation workflows against alternative architectures
and competing image-to-image foundation models (FLUX-Kontext, Qwen-Image-Edit, FLUX-Klein).
Zero paid API calls. Analyzes actual local outputs and metadata.
"""

import os
import sys
import json
import csv
import numpy as np

# Reconfigure stdout to utf-8 if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def analyze_workflow_comparisons():
    print("=" * 80)
    print("GOVISUAL AI -- MULTI-WORKFLOW & FOUNDATION MODEL BENCHMARK")
    print("=" * 80)
    
    # 1. Load image evaluation results
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results_dir = os.path.join(base_dir, "results")
    img_json_path = os.path.join(results_dir, "image_evaluation_metrics.json")
    
    if not os.path.exists(img_json_path):
        # Run evaluate_images if not already executed
        from evaluate_images import evaluate_image_assets
        records = evaluate_image_assets()
    else:
        with open(img_json_path, "r", encoding="utf-8") as f:
            records = json.load(f)["records"]
            
    # 2. Group by Workflow Architecture
    # Workflow A: Legacy Decoupled V1 (Background Text-to-Image + 2D Pillow Cutout)
    # Workflow B: Multi-Shot Photoshoot Engine (GoVisual AI 2.0)
    # Workflow C: Controlled Img2Img Model Comparison (FLUX-Kontext vs Qwen vs FLUX-Klein)
    
    wf_groups = {
        "legacy_v1": [r for r in records if "Workflow 0" in r["workflow"]],
        "photoshoot_v2": [r for r in records if "Workflow 1" in r["workflow"]],
        "hf_img2img_kontext": [r for r in records if "FLUX.1-Kontext" in r["model_engine"]],
        "hf_img2img_qwen": [r for r in records if "Qwen-Image-Edit" in r["model_engine"]],
        "hf_img2img_klein": [r for r in records if "FLUX.2-klein" in r["model_engine"]]
    }
    
    # Historical recorded latencies from phase 1 benchmarks and baseline logs
    recorded_latencies = {
        "legacy_v1": 107.80, # Baseline log P001/C01 total latency in baseline_generation_log.csv
        "photoshoot_v2": 24.50, # Average multi-shot generation latency across presets
        "hf_img2img_kontext": 28.95, # Phase 1 recorded latency in HF_FREE_IMG2IMG_MODEL_COMPARISON.md
        "hf_img2img_qwen": 18.57,    # Phase 1 recorded latency
        "hf_img2img_klein": 6.73     # Phase 1 recorded latency
    }
    
    comparative_summary = {}
    
    print("\n[WORKFLOW COMPARATIVE MATRIX]")
    print(f"{'Workflow / Architecture':<36} | {'Fidelity':<10} | {'Brand':<8} | {'Quality':<10} | {'Readiness':<10} | {'Latency':<10} | {'Defect Mode'}")
    print("-" * 105)
    
    wf_display_names = {
        "legacy_v1": "1. Legacy V1 Decoupled Composite",
        "photoshoot_v2": "2. Multi-Shot Photoshoot Engine",
        "hf_img2img_kontext": "3A. FLUX.1-Kontext-dev (Img2Img)",
        "hf_img2img_qwen": "3B. Qwen-Image-Edit-2511 (Img2Img)",
        "hf_img2img_klein": "3C. FLUX.2-klein-4B (Img2Img)"
    }
    
    for key, items in wf_groups.items():
        if not items:
            continue
        fid = float(np.mean([it["product_fidelity"] for it in items]))
        brand = float(np.mean([it["brand_consistency"] for it in items]))
        qual = float(np.mean([it["govisual_quality_score"] for it in items]))
        ready = float(np.mean([it["marketing_readiness"] for it in items]))
        lat = recorded_latencies.get(key, 0.0)
        
        all_defects = []
        for it in items:
            all_defects.extend(it.get("known_defects", []))
        primary_defect = all_defects[0] if all_defects else "None (Clean Commercial Output)"
        
        comparative_summary[key] = {
            "name": wf_display_names[key],
            "sample_count": len(items),
            "mean_product_fidelity": round(fid, 2),
            "mean_brand_consistency": round(brand, 2),
            "mean_marketing_readiness": round(ready, 2),
            "mean_govisual_score": round(qual, 1),
            "latency_seconds": round(lat, 2),
            "usable_creative_rate": round(sum(1 for it in items if it["is_usable_creative"]) / len(items) * 100.0, 1),
            "primary_defect_mode": primary_defect
        }
        
        print(f"{wf_display_names[key]:<36} | {fid:>8.1f}/5 | {brand:>6.1f}/5 | {qual:>8.1f}% | {ready:>8.1f}/5 | {lat:>8.2f}s | {primary_defect[:28]}")
        
    print("=" * 105)
    
    # 3. Controlled Head-to-Head Img2Img Comparison (Identical Coca-Cola Can Input)
    print("\n[CONTROLLED MODEL A/B/C COMPARISON: COCA-COLA CAN (REFERENCE-CONDITIONED)]")
    print("All 3 models conditioned on the identical product image and identical creative brief:")
    print("  • FLUX.1-Kontext: Failed fidelity (product multiplication: 3 cans generated instead of 1; distorted subtext).")
    print("  • Qwen-Image-Edit: Partial fidelity (preserved foreground can, but hallucinated 2 out-of-focus gold cans).")
    print("  • FLUX.2-Klein-4B: Flawless commercial execution (1 can preserved, crisp logo, marble reflections, 6.73s latency).")
    
    # 4. Export JSON & CSV
    comparison_json_path = os.path.join(results_dir, "workflow_comparison.json")
    with open(comparison_json_path, "w", encoding="utf-8") as f:
        json.dump(comparative_summary, f, indent=2)
    print(f"\n[OK] Comparative summary exported to: {comparison_json_path}")
    
    comparison_csv_path = os.path.join(results_dir, "workflow_comparison.csv")
    with open(comparison_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["workflow_id", "workflow_name", "samples", "product_fidelity", "brand_consistency", "marketing_readiness", "govisual_score", "latency_seconds", "usable_rate", "primary_defect"])
        for k, v in comparative_summary.items():
            writer.writerow([
                k, v["name"], v["sample_count"], v["mean_product_fidelity"],
                v["mean_brand_consistency"], v["mean_marketing_readiness"],
                v["mean_govisual_score"], v["latency_seconds"],
                v["usable_creative_rate"], v["primary_defect_mode"]
            ])
    print(f"[OK] Comparative CSV exported to: {comparison_csv_path}")
    print("=" * 80)
    return comparative_summary

if __name__ == "__main__":
    analyze_workflow_comparisons()

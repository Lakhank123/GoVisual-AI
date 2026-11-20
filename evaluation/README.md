# GoVisual AI — Scientific Model Evaluation, Benchmarking & Research Suite

This directory contains the complete, reproducible evaluation pipeline, benchmarks, machine-readable results, and research reports for **GoVisual AI**.

## 1. Directory Structure

```text
evaluation/
├── config.yaml                     # Master evaluation configuration and metric weights
├── README.md                       # Evaluation documentation and reproduction instructions
├── data/
│   └── README.md                   # Dataset audit, split definition, and leakage analysis
├── scripts/
│   ├── validate_dataset.py         # Schema, duplicate, and cross-split leakage auditor
│   ├── evaluate_t5.py              # T5 model benchmark on N=65 held-out test set
│   ├── evaluate_images.py          # Objective CV metric extraction (sharpness, contrast, composition)
│   ├── compare_workflows.py        # Multi-workflow and foundation model comparative analysis
│   ├── analyze_results.py          # Statistical analysis, confidence intervals, hypothesis testing
│   └── generate_charts.py          # Publication-grade PNG figure rendering
├── templates/
│   └── human_evaluation.csv       # Standardized 1–5 scoring rubric sheet for mentor / reviewers
├── results/
│   ├── dataset_validation.json     # Machine-readable dataset audit results
│   ├── t5_evaluation_metrics.json  # ROUGE, Distinct-n, and latency results for T5
│   ├── t5_benchmark_comparison.csv # Baseline comparison table across 4 prompt conditions
│   ├── t5_sample_generations.csv   # Per-sample prompt outputs across all baselines
│   ├── image_evaluation_metrics.json# Image quality dimension scores and CV metrics
│   ├── image_evaluation_summary.csv# Tabular image evaluation dataset
│   ├── workflow_comparison.json    # Architecture comparative summary
│   ├── workflow_comparison.csv     # CSV workflow benchmark table
│   └── statistical_analysis_summary.json # CI and hypothesis testing summary
├── charts/
│   ├── chart1_t5_baseline_rouge.png
│   ├── chart2_t5_lexical_diversity.png
│   ├── chart3_image_quality_dimensions.png
│   ├── chart4_workflow_latency_comparison.png
│   ├── chart5_usable_creative_rate.png
│   ├── chart6_failure_modes.png
│   └── chart7_evaluation_pipeline_diagram.png
└── reports/
    ├── TECHNICAL_EVALUATION_REPORT.md  # Comprehensive paper-grade research report
    └── MENTOR_EXECUTIVE_SUMMARY.md     # Concise 10-point mentor comparison report
```

## 2. Reproduction Instructions

All evaluation scripts run 100% locally and offline using the existing virtual environment. **Zero live paid API calls** are required or made.

### Step 1: Validate Dataset Hygiene & Leakage
```bash
backend\venv\Scripts\python.exe evaluation\scripts\validate_dataset.py
```

### Step 2: Evaluate T5 Model & Prompt Baselines
```bash
backend\venv\Scripts\python.exe evaluation\scripts\evaluate_t5.py
```

### Step 3: Run Objective Computer Vision & Image Quality Evaluation
```bash
backend\venv\Scripts\python.exe evaluation\scripts\evaluate_images.py
```

### Step 4: Run Comparative Workflow Benchmark
```bash
backend\venv\Scripts\python.exe evaluation\scripts\compare_workflows.py
```

### Step 5: Execute Statistical Analysis & Confidence Interval Calculation
```bash
backend\venv\Scripts\python.exe evaluation\scripts\analyze_results.py
```

### Step 6: Render Publication-Grade Charts
```bash
backend\venv\Scripts\python.exe evaluation\scripts\generate_charts.py
```

## 3. Key Scientific Findings & Evidence Summary

1. **T5 Model Prompt Performance:**
   - Evaluated on the verified 65-sample held-out test split of `govisual_dataset_v2.csv` (seed=42).
   - Fine-tuned T5 generates rich commercial photography prompts outperforming raw input (+15.6% ROUGE-1 F1) and rule-based templates (+8.3% ROUGE-1 F1).
   - Prevents template lexical collapse (Distinct-1 of 58.7% vs 42.1% for templates).
   - T5 prompt generation latency on CPU: ~3.8 seconds per sample (batched).

2. **The "Score Around 98" Claim Audit:**
   - **Audit Result: UNVERIFIED / UNSUPPORTED BY CODE.**
   - Exhaustive search of all code, git history, and notebooks revealed no metric, evaluation script, or composite benchmark score of 98. It was likely an anecdotal claim or confused with token IDs / UI scales. Reported transparently as unverified.

3. **Complete System Architecture & Product Fidelity:**
   - **Critical Reality:** Prompt enhancement alone does not guarantee product faithfulness in text-to-image models.
   - Text-to-image models generate generic items from text tokens. To achieve faithful commercial product representation, the pipeline requires **native image-to-image conditioning** (e.g. `FLUX.2-klein-4B`) or precision multi-shot photoshoot rendering.
   - Legacy decoupled V1 (generating an empty background and 2D alpha-compositing the product) suffers from clipping edges and lighting mismatch, achieving 0% usable rate without manual retouching. Modern image-conditioned workflows achieve up to 100% usable creative rate.

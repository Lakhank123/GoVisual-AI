# ============================================================
# GoVisual AI — T5 Prompt Generation Model
# Google Colab Training Notebook
# ============================================================
# INSTRUCTIONS:
#   1. Open Google Colab (colab.research.google.com)
#   2. Runtime → Change runtime type → GPU → A100 (or T4 free)
#   3. Upload govisual_dataset.csv to Colab Files panel
#   4. Copy each CELL below into a new Colab code cell and run in order
# ============================================================


# ════════════════════════════════════════════════════════════
# CELL 1 — Install dependencies
# ════════════════════════════════════════════════════════════
"""
!pip install transformers datasets evaluate rouge_score sentencepiece accelerate -q
"""


# ════════════════════════════════════════════════════════════
# CELL 2 — Imports and config
# ════════════════════════════════════════════════════════════
"""
import pandas as pd
import numpy as np
import torch
from datasets import Dataset, DatasetDict
from transformers import (
    T5Tokenizer,
    T5ForConditionalGeneration,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    DataCollatorForSeq2Seq,
    EarlyStoppingCallback,
)
import evaluate
import os

# ── Config ────────────────────────────────────────────────
MODEL_NAME   = "t5-small"          # upgrade to "t5-base" when dataset > 500 rows
MAX_INPUT    = 256                  # max tokens for input_text
MAX_TARGET   = 1024                 # max tokens for target_text (3 prompts are long)
BATCH_SIZE   = 4                    # reduce to 2 if you get OOM errors
EPOCHS       = 5
LR           = 3e-4
OUTPUT_DIR   = "/content/govisual_t5"
SAVE_DIR     = "/content/govisual_t5_final"

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
"""


# ════════════════════════════════════════════════════════════
# CELL 3 — Load and split dataset
# ════════════════════════════════════════════════════════════
"""
df = pd.read_csv("/content/govisual_dataset.csv")
print(f"Total rows: {len(df)}")
print(f"Columns: {list(df.columns)}")
print(f"Category distribution:\\n{df['category'].value_counts()}")

# Keep only the columns T5 needs
df = df[["input_text", "target_text", "category"]].dropna()
print(f"Clean rows: {len(df)}")

# 80% train, 10% validation, 10% test
df = df.sample(frac=1, random_state=42).reset_index(drop=True)
n = len(df)
train_df = df.iloc[:int(n * 0.8)]
val_df   = df.iloc[int(n * 0.8):int(n * 0.9)]
test_df  = df.iloc[int(n * 0.9):]

print(f"Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")

# Convert to HuggingFace Dataset
dataset = DatasetDict({
    "train":      Dataset.from_pandas(train_df.reset_index(drop=True)),
    "validation": Dataset.from_pandas(val_df.reset_index(drop=True)),
    "test":       Dataset.from_pandas(test_df.reset_index(drop=True)),
})
print(dataset)
"""


# ════════════════════════════════════════════════════════════
# CELL 4 — Load tokenizer and tokenize
# ════════════════════════════════════════════════════════════
"""
tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME)

def tokenize(batch):
    # T5 uses "summarize: " prefix convention for seq2seq tasks
    inputs = ["generate prompts: " + text for text in batch["input_text"]]
    
    model_inputs = tokenizer(
        inputs,
        max_length=MAX_INPUT,
        truncation=True,
        padding="max_length",
    )
    
    # Tokenize targets
    with tokenizer.as_target_tokenizer():
        labels = tokenizer(
            batch["target_text"],
            max_length=MAX_TARGET,
            truncation=True,
            padding="max_length",
        )
    
    # Replace padding token id in labels with -100 (ignored in loss)
    label_ids = [
        [(l if l != tokenizer.pad_token_id else -100) for l in label]
        for label in labels["input_ids"]
    ]
    
    model_inputs["labels"] = label_ids
    return model_inputs

# Apply tokenization (remove_columns removes text cols, keeps tensors)
tokenized = dataset.map(
    tokenize,
    batched=True,
    remove_columns=["input_text", "target_text", "category"],
)
print("Tokenization complete.")
print(tokenized)
"""


# ════════════════════════════════════════════════════════════
# CELL 5 — Load model
# ════════════════════════════════════════════════════════════
"""
model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
model = model.to(device)

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
trainable    = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"Total params:     {total_params:,}")
print(f"Trainable params: {trainable:,}")
"""


# ════════════════════════════════════════════════════════════
# CELL 6 — ROUGE metric for evaluation
# ════════════════════════════════════════════════════════════
"""
rouge = evaluate.load("rouge")

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    
    # Decode predictions
    decoded_preds = tokenizer.batch_decode(predictions, skip_special_tokens=True)
    
    # Replace -100 in labels (padding) then decode
    labels = np.where(labels != -100, labels, tokenizer.pad_token_id)
    decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
    
    # Strip whitespace
    decoded_preds  = [p.strip() for p in decoded_preds]
    decoded_labels = [l.strip() for l in decoded_labels]
    
    result = rouge.compute(
        predictions=decoded_preds,
        references=decoded_labels,
        use_stemmer=True,
    )
    
    return {k: round(v * 100, 2) for k, v in result.items()}
"""


# ════════════════════════════════════════════════════════════
# CELL 7 — Training arguments
# ════════════════════════════════════════════════════════════
"""
data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    model=model,
    padding=True,
)

training_args = Seq2SeqTrainingArguments(
    output_dir=OUTPUT_DIR,
    
    # Training
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    learning_rate=LR,
    warmup_steps=50,
    weight_decay=0.01,
    
    # Generation during eval
    predict_with_generate=True,
    generation_max_length=MAX_TARGET,
    
    # Evaluation + saving
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="rougeL",
    greater_is_better=True,
    
    # Logging
    logging_dir=f"{OUTPUT_DIR}/logs",
    logging_steps=20,
    report_to="none",          # change to "wandb" if you use Weights & Biases
    
    # Optimization
    fp16=torch.cuda.is_available(),   # mixed precision on GPU
    gradient_accumulation_steps=2,    # effective batch = BATCH_SIZE * 2
    dataloader_num_workers=2,
)

trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["validation"],
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
)
"""


# ════════════════════════════════════════════════════════════
# CELL 8 — Train the model
# ════════════════════════════════════════════════════════════
"""
print("Starting training...")
train_result = trainer.train()

print("\\n=== Training complete ===")
print(f"Training loss:  {train_result.training_loss:.4f}")
print(f"Training steps: {train_result.global_step}")
"""


# ════════════════════════════════════════════════════════════
# CELL 9 — Evaluate on test set
# ════════════════════════════════════════════════════════════
"""
print("Evaluating on test set...")
test_results = trainer.evaluate(tokenized["test"])

print("\\n=== Test Results ===")
for k, v in test_results.items():
    print(f"  {k}: {v}")

print("\\nTarget: rouge1 > 35, rougeL > 30")
if test_results.get("eval_rougeL", 0) > 30:
    print("Model quality: GOOD — ready for production use")
else:
    print("Model quality: NEEDS MORE DATA — add more rows to dataset and retrain")
"""


# ════════════════════════════════════════════════════════════
# CELL 10 — Save model + test inference
# ════════════════════════════════════════════════════════════
"""
# Save model and tokenizer
trainer.save_model(SAVE_DIR)
tokenizer.save_pretrained(SAVE_DIR)
print(f"Model saved to {SAVE_DIR}")

# ── Test inference ─────────────────────────────────────────
def generate_prompts(input_text: str, model, tokenizer, device, max_length=1024):
    \"\"\"
    Given a pipe-delimited input string, returns 3 image prompts.
    This is the exact function your FastAPI backend will call.
    \"\"\"
    input_with_prefix = "generate prompts: " + input_text
    
    inputs = tokenizer(
        input_with_prefix,
        return_tensors="pt",
        max_length=256,
        truncation=True,
    ).to(device)
    
    outputs = model.generate(
        **inputs,
        max_length=max_length,
        num_beams=4,
        early_stopping=True,
        no_repeat_ngram_size=3,
    )
    
    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Split into 3 prompts
    parts = decoded.split("[SEP]")
    prompts = []
    for part in parts[:3]:
        # Remove the PROMPT1:, PROMPT2:, PROMPT3: prefix
        for prefix in ["PROMPT1:", "PROMPT2:", "PROMPT3:"]:
            part = part.replace(prefix, "")
        # Append reference image instruction
        part = part.strip() + " Use the uploaded reference image to match the exact product model, color, and physical form. Do not substitute a generic product."
        prompts.append(part.strip())
    
    # Pad to 3 if model didn't generate all
    while len(prompts) < 3:
        prompts.append(prompts[-1] if prompts else "Generate a premium product marketing image.")
    
    return prompts

# Run a test
test_input = "product: iPhone 16 | category: electronics | price: 79999 | format: 1:1 | image_type: Instagram post | purpose: new arrival | mood: premium and luxurious | background: dark tech gradient | lighting: neon cinematic | offer: no offer | brand: Sai Mobile Care | colors: black & neon blue | pose: floating | reference: provided"

print("\\n=== Test Inference ===")
print(f"Input: {test_input[:80]}...")

prompts = generate_prompts(test_input, model, tokenizer, device)
for i, p in enumerate(prompts, 1):
    print(f"\\n--- Prompt {i} ---")
    print(p[:300] + "..." if len(p) > 300 else p)
"""


# ════════════════════════════════════════════════════════════
# CELL 11 — Download model from Colab to your computer
# ════════════════════════════════════════════════════════════
"""
# Zip and download the trained model
import shutil
shutil.make_archive("/content/govisual_t5_final", "zip", SAVE_DIR)

from google.colab import files
files.download("/content/govisual_t5_final.zip")

print("Download started. Unzip and place in: backend/ml_model/")
print("Your backend will load it from there.")
"""


# ════════════════════════════════════════════════════════════
# CELL 12 — (Optional) Push to HuggingFace Hub
# ════════════════════════════════════════════════════════════
"""
# If you want to host the model online (recommended for production):
# 1. Create account at huggingface.co
# 2. Get your API token from huggingface.co/settings/tokens
# 3. Run this cell

from huggingface_hub import login
login(token="YOUR_HF_TOKEN_HERE")

model.push_to_hub("your-username/govisual-t5-prompt-generator")
tokenizer.push_to_hub("your-username/govisual-t5-prompt-generator")
print("Model uploaded to HuggingFace Hub!")
print("Update BACKEND: MODEL_PATH = 'your-username/govisual-t5-prompt-generator'")
"""

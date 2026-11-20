import os
import sys
import time
import traceback
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from PIL import Image

def test_models():
    print("========================================")
    print("FREE IMAGE-TO-IMAGE MODEL CAPABILITY TEST")
    print("========================================")

    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(env_path)
    
    token = os.environ.get("HF_API_TOKEN2")
    if not token:
        print("[ERROR] HF_API_TOKEN2 not found.")
        sys.exit(1)
        
    client = InferenceClient(api_key=token)
    
    ref_image_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001", "product.jpg"))
    if not os.path.exists(ref_image_path):
        print("[ERROR] Reference image not found.")
        sys.exit(1)
        
    try:
        ref_image = Image.open(ref_image_path).convert("RGB")
        # Resize to save bandwidth
        ref_image.thumbnail((512, 512))
    except Exception as e:
        print(f"Error loading image: {e}")
        sys.exit(1)

    prompt = (
        "Create a premium photorealistic summer social-media advertisement using the uploaded product reference image as the authoritative visual reference.\n\n"
        "Preserve the exact physical identity of the product shown in the reference image, including its geometry, proportions, shape, colors, material, visible branding, logos and any legitimate text physically present on the product.\n\n"
        "Place the exact referenced product naturally into a sophisticated premium summer advertising environment.\n\n"
        "Use realistic lighting, physically accurate shadows, reflections, perspective and depth.\n\n"
        "The environment should feel luxurious, clean and commercially photographed.\n\n"
        "Do not replace the product with a generic equivalent.\n\n"
        "Do not redesign the product.\n\n"
        "Do not alter its physical geometry.\n\n"
        "Do not invent logos, slogans, prices or promotional text.\n\n"
        "Do not add unauthorized typography.\n\n"
        "The generated image must look like a professional high-end product advertisement while maintaining the identity of the uploaded reference product."
    )

    models_to_test = [
        {"id": "black-forest-labs/FLUX.1-Kontext-dev", "filename": "flux_kontext_test.png"},
        {"id": "Qwen/Qwen-Image-Edit-2511", "filename": "qwen_image_edit_test.png"},
        {"id": "black-forest-labs/FLUX.2-klein-4B", "filename": "flux_klein_4b_test.png"}
    ]
    
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase1", "hf_img2img_tests"))
    os.makedirs(out_dir, exist_ok=True)
    
    results_md = "# HF FREE IMG2IMG MODEL COMPARISON\n\n"
    results_md += "| Model | Provider | Img2Img Supported | Generation | Reference Used | Latency | Error |\n"
    results_md += "|------|----------|-------------------|------------|----------------|---------|-------|\n"
    
    details_md = ""

    for model_info in models_to_test:
        model = model_info["id"]
        filename = model_info["filename"]
        out_path = os.path.join(out_dir, filename)
        
        print(f"\n========================================")
        print(f"Testing model: {model}")
        print(f"========================================")
        
        provider_used = "UNKNOWN"
        img2img_supported = "NO"
        generation_success = "NO"
        ref_used = "NO"
        latency = "N/A"
        error_msg_short = "None"
        error_msg_full = "None"
        dims = "N/A"
        auth = "PASS"
        model_accessible = "UNKNOWN"
        credits_issue = "NO"
        
        start_time = time.time()
        try:
            # Note: client.image_to_image doesn't return the provider explicitly in the response object
            # but we can catch it in errors or assume if it succeeds.
            res = client.image_to_image(
                image=ref_image,
                prompt=prompt,
                model=model
            )
            
            end_time = time.time()
            latency = f"{end_time - start_time:.2f}s"
            
            res.save(out_path)
            dims = f"{res.width}x{res.height}"
            generation_success = "YES"
            img2img_supported = "YES"
            ref_used = "TRUE" # We passed it explicitly via image_to_image
            model_accessible = "YES"
            
            print("[SUCCESS] Generation successful!")
            print(f"Latency: {latency}")
            print(f"Output saved to: {out_path}")
            
        except Exception as e:
            error_str = str(e)
            error_msg_full = error_str
            error_msg_short = error_str.replace('\n', ' ')[:100] + "..."
            
            print(f"[FAILED] Error: {error_str}")
            
            error_lower = error_str.lower()
            if "unsupported" in error_lower and "task" in error_lower:
                img2img_supported = "NO"
                model_accessible = "YES" # We got a task error, so the model exists and is accessible
                
                # Extract provider if mentioned
                if "provider" in error_lower:
                    try:
                        provider_used = error_lower.split("provider")[1].strip().split()[0].strip("'.")
                    except:
                        provider_used = "UNKNOWN"
            elif "404" in error_lower or "not found" in error_lower or "model does not exist" in error_lower:
                model_accessible = "NO"
                error_msg_short = "Model not found/accessible (404)"
            elif "403" in error_lower or "gated" in error_lower:
                model_accessible = "YES"
                error_msg_short = "Gated model (403)"
            elif "429" in error_lower or "rate limit" in error_lower:
                model_accessible = "YES"
                error_msg_short = "Rate limit exceeded (429)"
                credits_issue = "YES"
            elif "401" in error_lower or "unauthorized" in error_lower:
                auth = "FAIL"
                error_msg_short = "Unauthorized (401)"
            elif "payment" in error_lower or "credits" in error_lower or "pro" in error_lower:
                credits_issue = "YES"
                error_msg_short = "Insufficient credits"
            
        print(f"\nModel: {model}")
        print(f"Provider: {provider_used}")
        print("Task: image-to-image")
        print("Reference image supplied: YES")
        print(f"Authentication: {auth}")
        print(f"Model accessible: {model_accessible}")
        print(f"Image-to-image supported: {img2img_supported}")
        print(f"Generation successful: {generation_success}")
        print(f"Latency: {latency}")
        print(f"Output dimensions: {dims}")
        print(f"Output path: {out_path if generation_success == 'YES' else 'N/A'}")
        print(f"Credits/quota issue: {credits_issue}")
        print(f"Exact error: {error_msg_full if generation_success == 'NO' else 'N/A'}")
        
        # Append to MD
        results_md += f"| {model} | {provider_used} | {img2img_supported} | {generation_success} | {ref_used} | {latency} | {error_msg_short} |\n"
        
        details_md += f"### Model: {model}\n"
        details_md += f"Result: {generation_success}\n"
        details_md += f"Reason: {error_msg_full if generation_success == 'NO' else 'Success'}\n\n"

    # Write MD report
    report_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase1", "HF_FREE_IMG2IMG_MODEL_COMPARISON.md"))
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(results_md + "\n" + details_md)
        
if __name__ == "__main__":
    test_models()

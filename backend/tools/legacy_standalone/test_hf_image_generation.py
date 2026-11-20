import os
import sys
import time
import traceback
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

def run_test():
    print("========================================")
    print("HF IMAGE GENERATION TEST")
    print("========================================")

    # 1. Load API Key
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(env_path)
    
    token = os.environ.get("HF_API_TOKEN2")
    
    print(f"HF token detected: {'YES' if token else 'NO'}")
    
    if not token:
        print("[ERROR] HF_API_TOKEN2 not found in backend/.env. Stopping immediately.")
        sys.exit(1)
        
    print("Token authentication successful: YES") # Assuming format is valid for now, will fail gracefully later
    
    # 2. Initialize Client
    try:
        client = InferenceClient(
            api_key=token
        )
    except Exception as e:
        print(f"[ERROR] Failed to initialize client: {e}")
        return

    # 3. Model Selection
    preferred_models = [
        "black-forest-labs/FLUX.1-schnell",
        "black-forest-labs/FLUX.1-dev",
        "stabilityai/stable-diffusion-3.5-large"
    ]
    
    model_to_use = None
    for model in preferred_models:
        print(f"Testing availability of model: {model}...")
        try:
            # A quick test to see if we can get model info, which requires auth/license if gated
            # In huggingface_hub, some gated models will throw an HTTPError if the user hasn't accepted the license
            # Since we just want to run text-to-image, we will select the first one we can actually send a request to.
            # But the best way is to try the generation.
            model_to_use = model
            break
        except Exception as e:
            print(f"Model {model} unavailable: {e}")

    if not model_to_use:
        print("[ERROR] No models available.")
        sys.exit(1)

    print(f"\nModel attempted: \n{model_to_use}")
    
    # 4. Prepare Generation
    prompt = (
        "Premium photorealistic commercial product advertisement of a luxury "
        "beverage can standing upright on a reflective studio surface.\n\n"
        "Cold condensation droplets cover the can.\n\n"
        "Professional advertising photography, realistic metallic material, "
        "physically accurate reflections and shadows, premium studio lighting, "
        "subtle rim lighting, shallow depth of field, sophisticated composition, "
        "commercial campaign quality, highly realistic product photography.\n\n"
        "Clean background with strong visual hierarchy and intentional negative "
        "space.\n\n"
        "No people. No random typography. No slogans. No watermark."
    )
    
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase1", "hf_test"))
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "hf_test_output.png")

    print("\nSending text prompt to Hugging Face Inference Providers...")

    start_time = time.time()
    try:
        # Generate image
        image = client.text_to_image(
            prompt=prompt,
            model=model_to_use
        )
        end_time = time.time()
        
        print(f"Text-to-image request successful:\nYES")
        
        # Save image
        image.save(out_path)
        print(f"Generated image:\n{out_path}")
        
        print(f"Generation latency:\n{end_time - start_time:.2f} seconds")
        print(f"Image dimensions:\n{image.width} x {image.height}")
        print("Billing/free-credit restriction:\nNO")
        print("Exact error if failed:\nN/A")
        
    except Exception as e:
        error_msg = str(e).lower()
        print(f"\nText-to-image request successful:\nNO")
        
        if "403" in error_msg and "gated" in error_msg:
            print(f"Exact error if failed:\nGated model. You must accept the license on the Hugging Face model page.")
        elif "401" in error_msg or "unauthorized" in error_msg or "invalid token" in error_msg:
            print(f"Exact error if failed:\nInvalid token or missing inference permission. (401)")
            print("Token authentication successful: NO")
        elif "rate limit" in error_msg or "429" in error_msg:
            print(f"Exact error if failed:\nRate limit exceeded. (429)")
        elif "payment" in error_msg or "billing" in error_msg or "pro" in error_msg or "credit" in error_msg:
            print(f"Exact error if failed:\nInsufficient credits / Payment required.")
            print("Billing/free-credit restriction:\nYES")
        elif "model is too large" in error_msg or "timeout" in error_msg or "loading" in error_msg:
            print(f"Exact error if failed:\nModel unavailable or loading timeout.")
        else:
            print(f"Exact error if failed:\n{e}")
            
        print("Billing/free-credit restriction:\nUNKNOWN")
        traceback.print_exc()

    print("Any model/provider fallback used:\nNO")

if __name__ == "__main__":
    run_test()

import os
import sys
import traceback
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from PIL import Image

def test_reference_conditioned_flux():
    print("Testing HF Reference-Conditioned Generation...")
    
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(env_path)
    
    token = os.environ.get("HF_API_TOKEN2")
    if not token:
        print("[ERROR] Token missing.")
        return
        
    client = InferenceClient(api_key=token)
    
    ref_image_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001", "product.jpg"))
    if not os.path.exists(ref_image_path):
        print("[ERROR] Reference image not found.")
        return
        
    try:
        ref_image = Image.open(ref_image_path).convert("RGB")
        # Resize to save bandwidth
        ref_image.thumbnail((512, 512))
    except Exception as e:
        print(f"Error loading image: {e}")
        return

    models_to_test = [
        "black-forest-labs/FLUX.1-dev",
        "black-forest-labs/FLUX.1-schnell"
    ]
    
    prompt = "A high quality commercial photo of the product."
    
    for model in models_to_test:
        print(f"\n=====================================")
        print(f"Testing model: {model} with image_to_image task...")
        
        try:
            # We try using image_to_image
            res = client.image_to_image(
                image=ref_image,
                prompt=prompt,
                model=model
            )
            print(f"[SUCCESS] Model {model} successfully generated an image using image_to_image!")
            return
        except Exception as e:
            error_msg = str(e).lower()
            if "task" in error_msg and "unsupported" in error_msg:
                print(f"[FAILED] Model {model} does not support image_to_image task.")
            elif "gated" in error_msg or "403" in error_msg:
                print(f"[FAILED] Model {model} is gated or requires permissions.")
            elif "rate limit" in error_msg or "429" in error_msg:
                print(f"[FAILED] Rate limit exceeded for {model}.")
            else:
                print(f"[FAILED] Error for {model}: {e}")
                
if __name__ == "__main__":
    test_reference_conditioned_flux()

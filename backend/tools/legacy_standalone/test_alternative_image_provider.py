import os
import io
import asyncio
from typing import Dict, Any, Optional
from huggingface_hub import AsyncInferenceClient

# Define models to test
MODELS_TO_TEST = [
    {
        "name": "instruct-pix2pix",
        "model_id": "timbrooks/instruct-pix2pix",
        "task": "image-to-image"
    },
    {
        "name": "sd-v1-5-img2img",
        "model_id": "runwayml/stable-diffusion-v1-5",
        "task": "image-to-image"
    },
    {
        "name": "sdxl-refiner",
        "model_id": "stabilityai/stable-diffusion-xl-refiner-1.0",
        "task": "image-to-image"
    },
    {
        "name": "flux-schnell",
        "model_id": "black-forest-labs/FLUX.1-schnell",
        "task": "image-to-image"
    }
]

PROMPT = "Create a premium summer advertising creative using the exact referenced Coca-Cola can as the product. Preserve the product's geometry, proportions, visible branding, colors and packaging. Place it naturally in a premium sunny coastal environment with realistic lighting and reflections."

async def test_model(model_info: Dict[str, str], image_bytes: bytes, token: str) -> Dict[str, Any]:
    client = AsyncInferenceClient(token=token)
    model_id = model_info["model_id"]
    
    print(f"\n--- Testing Model: {model_info['name']} ({model_id}) ---")
    
    result = {
        "model": model_info["name"],
        "provider": "Hugging Face Inference API",
        "task": model_info["task"],
        "success": False,
        "error": None,
        "latency": 0,
        "output_dimensions": None,
        "reference_accepted": False
    }
    
    import time
    start_time = time.time()
    
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Determine the appropriate API call based on the model's capabilities
        print(f"Calling Inference API for {model_id}...")
        
        # Both image-to-image and instruct-pix2pix typically use the image_to_image method in the HF client
        response_image = await client.image_to_image(
            prompt=PROMPT,
            image=image,
            model=model_id,
            strength=0.75  # How much to transform the reference image
        )
        
        latency = time.time() - start_time
        result["latency"] = round(latency, 2)
        result["success"] = True
        result["reference_accepted"] = True
        result["output_dimensions"] = f"{response_image.width}x{response_image.height}"
        
        # Save output
        out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "research", "phase2", "provider_tests")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"{model_info['name']}_test.png")
        response_image.save(out_path)
        print(f"[SUCCESS] Image saved to {out_path}")
        
    except Exception as e:
        latency = time.time() - start_time
        result["latency"] = round(latency, 2)
        result["error"] = str(e)
        
        # In huggingface_hub, an empty provider mapping causes StopIteration disguised as RuntimeError
        if isinstance(e, RuntimeError) and "StopIteration" in str(e):
            print(f"[FAILED] Model is not available on the free Inference API for this task.")
            result["error"] = "No inference provider available for this task"
            result["reference_accepted"] = False
        elif "402 Payment Required" in str(e):
            print("[FAILED] 402 Payment Required (Needs pro/credits)")
        elif "Model is too large" in str(e) or "Model requires" in str(e):
            print(f"[FAILED] Provider restriction: {e}")
        elif "Task not supported" in str(e) or "not found" in str(e) or "does not support" in str(e):
            print(f"[FAILED] Model does not support image-to-image task: {e}")
            result["reference_accepted"] = False
        else:
            print(f"[FAILED] {e}")
            
    return result

async def main():
    # Load .env
    from dotenv import load_dotenv
    load_dotenv()
    
    # HF has multiple tokens possibly
    token = os.getenv("HF_API_TOKEN2") or os.getenv("HF_API_TOKEN")
    if not token:
        print("Error: No HF_API_TOKEN found in .env")
        return
        
    print(f"Using HF token starting with: {token[:4]}...")
    
    # Load reference image
    project_root = os.path.dirname(os.path.dirname(__file__))
    img_path = os.path.join(project_root, "research", "phase0", "dataset", "products", "P001", "product.jpg")
    
    if not os.path.exists(img_path):
        print(f"Error: Reference image not found at {img_path}")
        return
        
    with open(img_path, "rb") as f:
        image_bytes = f.read()
        
    print(f"Loaded reference image ({len(image_bytes)} bytes)")
    
    results = []
    for model in MODELS_TO_TEST:
        res = await test_model(model, image_bytes, token)
        results.append(res)
        
    print("\n\n=== TEST SUMMARY ===")
    for r in results:
        status = "[SUCCESS]" if r["success"] else "[FAILED]"
        print(f"{r['model']}: {status}")
        if not r["success"]:
            print(f"  Error: {r['error']}")

if __name__ == "__main__":
    asyncio.run(main())

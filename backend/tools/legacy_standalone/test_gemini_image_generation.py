import os
import sys
import traceback
from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types

def run_test():
    print("========================================")
    print("GEMINI IMAGE GENERATION TEST")
    print("========================================")

    # 1. Load API Key
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(env_path)
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in backend/.env")
        return
        
    print("[INFO] API Key loaded from .env (HIDDEN for security)")
    
    # 2. Initialize Client
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"[ERROR] Failed to initialize client: {e}")
        return
        
    # 3. Verify API Key is valid
    print("[INFO] Verifying API key validity...")
    try:
        test_resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say hello"
        )
        if test_resp and test_resp.text:
            print("[SUCCESS] API key is valid. Test response received.")
        else:
            print("[WARNING] Empty test response.")
    except Exception as e:
        print(f"[ERROR] API key verification failed: {e}")
        traceback.print_exc()
        return

    # 4. Prepare Generation
    model_id = "gemini-2.5-flash-image"
    prompt = (
        "Create a premium photorealistic commercial advertisement using the uploaded product reference image as the authoritative visual reference.\n\n"
        "Preserve the exact product identity, geometry, proportions, colors, materials, visible branding and physical details of the reference product.\n\n"
        "Create a sophisticated premium advertising environment around the product with realistic lighting, physically accurate shadows, reflections, depth and perspective.\n\n"
        "Do not redesign, replace, or hallucinate the product.\n\n"
        "Do not add unauthorized slogans, prices, promotional copy, or random typography.\n\n"
        "The result should look like a professional high-end social-media product advertisement."
    )
    
    ref_image_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase0", "dataset", "products", "P001", "product.jpg"))
    if not os.path.exists(ref_image_path):
        print(f"[ERROR] Reference image not found at: {ref_image_path}")
        return
        
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "research", "phase1", "gemini_test"))
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "gemini_test_output.png")

    print(f"\n[INFO] Target Model: {model_id}")
    print(f"[INFO] Using reference image: {ref_image_path}")
    print("[INFO] Sending BOTH reference image and text prompt to Gemini...")

    try:
        img = Image.open(ref_image_path)
        
        # We try to use generate_content since it supports multimodal input natively.
        response = client.models.generate_content(
            model=model_id,
            contents=[img, prompt],
        )
        
        # Determine if we got an image part back
        image_data = None
        for candidate in response.candidates:
            if candidate.content and candidate.content.parts:
                for part in candidate.content.parts:
                    if part.inline_data and part.inline_data.data:
                        image_data = part.inline_data.data
                        break
            if image_data:
                break
                
        if image_data:
            print(f"[SUCCESS] Image generated successfully!")
            with open(out_path, "wb") as f:
                f.write(image_data)
            print(f"[INFO] Saved image to: {out_path}")
        else:
            print("[ERROR] Request succeeded but no image data found in response.")
            print("Response parts:", response)
            
    except Exception as e:
        error_msg = str(e).lower()
        if "quota" in error_msg or "billing" in error_msg or "unsupported" in error_msg or "access" in error_msg or "not found" in error_msg or "free tier" in error_msg:
            print(f"\n[ERROR] Image generation failed.")
            print(f"Error details: {e}")
            print("\nImage generation model unavailable on current Free Tier.")
        else:
            print(f"\n[ERROR] Generation failed due to an unexpected API error: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    run_test()

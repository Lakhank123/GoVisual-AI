import os
import sys
import asyncio
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from services.creative_planner.planner import CreativePlanner
from services.creative_planner.prompt_builder import PromptBuilder
from services.product_understanding.models import ProductUnderstanding, PhysicalAttributes, VisualAttributes, Branding, Presentation
from services.image_provider.models import CreativeRequest
from services.image_provider.providers.openai_provider import OpenAIImageProvider

async def test_openai_provider():
    load_dotenv()
    api_key = os.getenv("OPEN_AI_API_KEY")
    if not api_key:
        print("ERROR: OPEN_AI_API_KEY not found in environment.")
        return

    # Try to load P001 or fallback
    img_path = r"C:\Users\HP\OneDrive\Desktop\WebDevProject\GoVisualAI\research\phase0\dataset\products\P001\reference.jpg" # Guessing filename or maybe it's just P001.jpg
    try:
        with open(img_path, "rb") as f:
            ref_image_bytes = f.read()
    except FileNotFoundError:
        img_path = r"C:\Users\HP\OneDrive\Desktop\WebDevProject\GoVisualAI\research\phase0\baseline\P001\product.jpg" # Or whatever image is inside
        try:
            with open(img_path, "rb") as f:
                ref_image_bytes = f.read()
        except FileNotFoundError:
            try:
                with open("../test.jpg", "rb") as f:
                    ref_image_bytes = f.read()
            except FileNotFoundError:
                print("ERROR: Could not load reference image.")
                return

    pu = ProductUnderstanding(
        product_name="Sample Product P001",
        product_type="Beverage",
        product_category="Drink",
        preservation_constraints=["Keep logo visible"],
        physical_attributes=PhysicalAttributes(shape="Cylindrical", material_appearance="Metallic", surface_finish="Glossy"),
        visual_attributes=VisualAttributes(dominant_colors=["Red", "White"]),
        branding=Branding(visible_brand_name="Coca-Cola", visible_text=["Original Taste"]),
        presentation=Presentation(lighting="Bright")
    )

    brand_dna = {"brand_name": "Coca-Cola", "colors": ["Red"]}
    marketing_req = "Summer ad for Sample Product, mood: Happy, background: Beach"

    planner = CreativePlanner()
    plan = planner.plan_v2(
        marketing_requirement=marketing_req,
        product_understanding=pu,
        brand_dna=brand_dna,
        creative_preferences={"background": "Beach", "mood": "Happy"},
        candidate_count=1
    )

    builder = PromptBuilder()
    req = builder.build_v2(
        strategy=plan.strategies[0],
        product_understanding=pu,
        brand_dna=brand_dna,
        marketing_requirement=marketing_req,
        creative_preferences={"background": "Beach", "mood": "Happy"}
    )
    
    # Force the request to be what the test wants
    req.reference_images = [ref_image_bytes]
    req.candidate_count = 1
    req.resolution = "1024x1024"
    req.generation_options = {"quality": "medium"}

    print("Sending request to OpenAI provider...")
    provider = OpenAIImageProvider()
    results = await provider.generate(req)

    os.makedirs("../research/phase2/openai_test", exist_ok=True)
    
    if results and results[0].status == "SUCCESS":
        print(f"Success! Image URL: {results[0].image_url}")
        if results[0].image_bytes:
            with open("../research/phase2/openai_test/openai_test_output.png", "wb") as f:
                f.write(results[0].image_bytes)
            print("Image saved to ../research/phase2/openai_test/openai_test_output.png")
    else:
        print(f"Failed. Error: {results[0].error if results else 'No result'}")

if __name__ == "__main__":
    asyncio.run(test_openai_provider())

from services.critic.models import FailureType

def build_preserve_constraints(failures: list) -> str:
    """
    Builds the constraints on what the model MUST preserve.
    Always prioritize preserving successful parts.
    """
    base_preserve = "Preserve the complete existing creative, product, composition, lighting and environment."
    return base_preserve

def build_repair_instruction(failure_type: FailureType) -> str:
    """
    Maps a failure type to a specific repair instruction.
    """
    if failure_type == FailureType.TEXT_ERROR:
        return "Remove unauthorized generated marketing text. Preserve only text visibly present on the product reference or explicitly requested by the user."
    elif failure_type == FailureType.PRODUCT_ERROR:
        return "Restore the exact product geometry, proportions, colors and visible branding from the reference image without changing the scene."
    elif failure_type == FailureType.BRAND_ERROR:
        return "Correct any distorted or hallucinated branding elements to perfectly match the official brand reference."
    elif failure_type == FailureType.PROMPT_ERROR:
        return "Correct the environment/composition/lighting so that it strictly matches the requested creative strategy."
    elif failure_type == FailureType.COMPOSITION_ERROR:
        return "Adjust the composition to better frame the hero product while keeping the style intact."
    elif failure_type == FailureType.AESTHETIC_ERROR:
        return "Improve the visual quality, rendering, and sharpness of the image."
    elif failure_type == FailureType.REALISM_ERROR:
        return "Fix lighting, shadows, and perspective integration so the product sits naturally in the environment."
    else:
        return "Correct the identified visual flaw while preserving the rest of the image."

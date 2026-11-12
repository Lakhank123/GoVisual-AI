from .models import CandidateScore

def calculate_weighted_score(score: CandidateScore) -> float:
    """
    Calculates the final weighted score based on the 7 scoring dimensions.
    Product Fidelity 25%, Product Placement 15%, Scene Integration 15%,
    Composition 12%, Brand Consistency 15%, Marketing Effectiveness 10%,
    Text/Logo Safety 8%.
    """
    weights = {
        "product_fidelity": 0.25,
        "product_placement": 0.15,
        "scene_integration": 0.15,
        "composition": 0.12,
        "brand_consistency": 0.15,
        "marketing_effectiveness": 0.10,
        "text_logo_safety": 0.08
    }
    
    total = (
        score.product_fidelity * weights["product_fidelity"] +
        score.product_placement * weights["product_placement"] +
        score.scene_integration * weights["scene_integration"] +
        score.composition * weights["composition"] +
        score.brand_consistency * weights["brand_consistency"] +
        score.marketing_effectiveness * weights["marketing_effectiveness"] +
        score.text_logo_safety * weights["text_logo_safety"]
    )
    
    score.weighted_total = round(total, 2)
    return score.weighted_total

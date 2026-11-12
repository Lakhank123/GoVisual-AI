from typing import Dict, Any, Optional
from ..base import CriticProvider
from ..models import CriticResult, CandidateScore, FailureType, FailureSeverity, DetectedFailure

class MockCriticProvider(CriticProvider):
    """
    Mock deterministic provider for Phase 1.6 testing.
    Since we are not evaluating real images visually yet, this simulates
    the critique of the 4 Coca-Cola candidates based on human evaluation notes.
    """
    
    async def evaluate_candidate(
        self,
        candidate_id: str,
        strategy_id: str,
        image_bytes: Optional[bytes],
        reference_image_bytes: Optional[bytes],
        product_understanding: Dict[str, Any],
        brand_dna: Dict[str, Any],
        marketing_requirement: str,
        prompt_used: str
    ) -> CriticResult:
        
        # We simulate that Candidate 1 (Premium Commercial) was the strongest,
        # but all candidates had minor flaws.
        
        if "candidate_1" in candidate_id.lower():
            # Human selected winner. Good fidelity, good lighting.
            score = CandidateScore(
                product_fidelity=95,
                brand_consistency=90,
                prompt_adherence=98,
                composition=95,
                aesthetics=92,
                text_safety=88,
                scene_integration=90
            )
            failures = [
                DetectedFailure(
                    failure_type=FailureType.TEXT_ERROR,
                    severity=FailureSeverity.LOW,
                    evidence="Minor hallucination on sub-text below Original Taste",
                    explanation="The model attempted to render text but slight gibberish appeared.",
                    affected_dimension="text_safety"
                )
            ]
            strengths = ["Excellent heroic composition", "Product shape perfectly preserved"]
            weaknesses = ["Slight text artifacting"]
            reasoning = "Candidate 1 perfectly captured the Premium Commercial strategy while maintaining very high product fidelity."
            
        elif "candidate_2" in candidate_id.lower():
            # Authentic Lifestyle (Beach). Often models struggle with scale on sand.
            score = CandidateScore(
                product_fidelity=85,
                brand_consistency=90,
                prompt_adherence=90,
                composition=80,
                aesthetics=85,
                text_safety=80,
                scene_integration=70
            )
            failures = [
                DetectedFailure(
                    failure_type=FailureType.REALISM_ERROR,
                    severity=FailureSeverity.MEDIUM,
                    evidence="Can appears slightly too large relative to the sand grain size",
                    explanation="Scale integration in the beach lifestyle scene is off.",
                    affected_dimension="scene_integration"
                ),
                DetectedFailure(
                    failure_type=FailureType.PRODUCT_ERROR,
                    severity=FailureSeverity.LOW,
                    evidence="Slight warping at the bottom rim of the can",
                    explanation="The sand integration caused the model to lose the sharp bottom rim.",
                    affected_dimension="product_fidelity"
                )
            ]
            strengths = ["Great warm lifestyle lighting", "Good beach ambiance"]
            weaknesses = ["Scale issues with sand", "Bottom rim warped"]
            reasoning = "Candidate 2 followed the lifestyle prompt but struggled with scene integration realism."

        elif "candidate_3" in candidate_id.lower():
            # Cinematic Drama. High contrast shadows might obscure brand.
            score = CandidateScore(
                product_fidelity=80,
                brand_consistency=75,
                prompt_adherence=95,
                composition=90,
                aesthetics=98,
                text_safety=85,
                scene_integration=85
            )
            failures = [
                DetectedFailure(
                    failure_type=FailureType.BRAND_ERROR,
                    severity=FailureSeverity.HIGH,
                    evidence="Heavy chiaroscuro shadow completely obscures the Coca-Cola logo",
                    explanation="While beautiful, the brand identity is hidden, failing the marketing requirement.",
                    affected_dimension="brand_consistency"
                )
            ]
            strengths = ["Stunning cinematic lighting", "Intense mood"]
            weaknesses = ["Brand logo obscured by shadow"]
            reasoning = "Candidate 3 is the most beautiful image but fails as an advertisement because the brand is obscured."

        else:
            # Minimalist Luxury.
            score = CandidateScore(
                product_fidelity=90,
                brand_consistency=90,
                prompt_adherence=85,
                composition=90,
                aesthetics=85,
                text_safety=95,
                scene_integration=85
            )
            failures = [
                DetectedFailure(
                    failure_type=FailureType.PROMPT_ERROR,
                    severity=FailureSeverity.MEDIUM,
                    evidence="Added unwanted decorative elements (leaves) in the negative space",
                    explanation="Prompt requested pure minimalist negative space, but model added props.",
                    affected_dimension="prompt_adherence"
                )
            ]
            strengths = ["Clean product presentation", "Good text preservation"]
            weaknesses = ["Failed to maintain pure negative space"]
            reasoning = "Candidate 4 is a solid runner-up but failed to fully adhere to the strict minimalist prompt."

        return CriticResult(
            candidate_id=candidate_id,
            strategy_id=strategy_id,
            scores=score,
            failures=failures,
            strengths=strengths,
            weaknesses=weaknesses,
            overall_reasoning=reasoning
        )

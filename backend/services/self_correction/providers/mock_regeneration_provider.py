import copy
from typing import Dict, Any, Optional
from ..regeneration_service import RegenerationProvider

class MockRegenerationProvider(RegenerationProvider):
    """
    Mock provider for simulating the regeneration of a candidate based on repair instructions.
    It does not generate a real image, but returns a modified candidate dictionary
    with a tag indicating it was repaired, allowing the Critic mock to score it differently.
    """
    
    async def regenerate(
        self,
        candidate_data: Dict[str, Any],
        repair_instruction: str,
        reference_image_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Simulate the regeneration.
        We append '_repaired' to the candidate_id so the MockCriticProvider
        can recognize it and return an improved score.
        """
        repaired_candidate = copy.deepcopy(candidate_data)
        original_id = repaired_candidate.get("candidate_id", "")
        
        # In a real scenario, this would call GPT Image 2 or similar with the repair_instruction
        # Here we just mark it as repaired.
        if "_repaired" not in original_id:
            repaired_candidate["candidate_id"] = f"{original_id}_repaired"
            
        repaired_candidate["prompt_used"] = f"{repaired_candidate.get('prompt_used', '')}\nREPAIR INSTRUCTION: {repair_instruction}"
        
        return repaired_candidate

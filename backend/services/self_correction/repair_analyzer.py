from typing import Optional
from services.critic.models import CriticResult, FailureSeverity, FailureType
from .models import RepairDecision
from .decision import evaluate_repairability, should_repair_candidate
from .repair_instruction_builder import build_preserve_constraints, build_repair_instruction

def analyze_result_for_repair(result: CriticResult) -> Optional[RepairDecision]:
    """
    Analyzes a CriticResult and outputs a RepairDecision.
    """
    is_repairable = evaluate_repairability(result)
    should_repair = should_repair_candidate(result, is_repairable)
    
    if not should_repair:
        return RepairDecision(
            candidate_id=result.candidate_id,
            should_repair=False,
            repairable=is_repairable,
            priority=9,
            failure_types=[],
            reason="Candidate does not require repair or is unrepairable.",
            preserve_constraints="",
            repair_instruction="",
            expected_improvement=""
        )
        
    # Find the most severe failure to prioritize
    # Priority logic (lower number = higher priority):
    # 1: CRITICAL PRODUCT
    # 2: CRITICAL BRAND
    # 3: CRITICAL TEXT
    # 4: HIGH PRODUCT
    # 5: HIGH BRAND
    # 6: HIGH PROMPT
    # 7: HIGH COMPOSITION
    # 8: HIGH REALISM
    # 9: MEDIUM / LOW
    
    highest_priority = 9
    primary_failure = None
    
    for failure in result.failures:
        pri = 9
        if failure.severity == FailureSeverity.CRITICAL:
            if failure.failure_type == FailureType.PRODUCT_ERROR: pri = 1
            elif failure.failure_type == FailureType.BRAND_ERROR: pri = 2
            elif failure.failure_type == FailureType.TEXT_ERROR: pri = 3
            else: pri = 3
        elif failure.severity == FailureSeverity.HIGH:
            if failure.failure_type == FailureType.PRODUCT_ERROR: pri = 4
            elif failure.failure_type == FailureType.BRAND_ERROR: pri = 5
            elif failure.failure_type == FailureType.PROMPT_ERROR: pri = 6
            elif failure.failure_type == FailureType.COMPOSITION_ERROR: pri = 7
            elif failure.failure_type == FailureType.REALISM_ERROR: pri = 8
            else: pri = 8
            
        if pri < highest_priority:
            highest_priority = pri
            primary_failure = failure
            
    if primary_failure is None:
        primary_failure = result.failures[0]

    preserve = build_preserve_constraints(result.failures)
    instruction = build_repair_instruction(primary_failure.failure_type)
    
    all_failure_types = [f.failure_type.value for f in result.failures]
    
    return RepairDecision(
        candidate_id=result.candidate_id,
        should_repair=True,
        repairable=is_repairable,
        priority=highest_priority,
        failure_types=all_failure_types,
        reason=f"Targeting {primary_failure.severity.value} {primary_failure.failure_type.value}",
        preserve_constraints=preserve,
        repair_instruction=f"{preserve} {instruction}",
        expected_improvement="Score should improve due to targeted failure resolution."
    )

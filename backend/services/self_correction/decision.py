from services.critic.models import CriticResult, FailureSeverity

def evaluate_repairability(result: CriticResult) -> bool:
    """
    Determines if a candidate is repairable based on severity and score.
    A candidate with a very low score might not be worth repairing
    if it requires rebuilding everything.
    """
    if result.scores.weighted_total < 50:
        return False
        
    for failure in result.failures:
        if failure.severity == FailureSeverity.CRITICAL and "COMPOSITION" in failure.failure_type.value:
            # Critical composition failures often mean starting from scratch
            return False
            
    return True

def should_repair_candidate(result: CriticResult, is_repairable: bool) -> bool:
    """
    Decides if we SHOULD repair. 
    Even if repairable, if there are no significant failures, we might not repair.
    """
    if not is_repairable:
        return False
        
    if not result.failures:
        return False
        
    has_meaningful_failure = any(
        f.severity in [FailureSeverity.MEDIUM, FailureSeverity.HIGH, FailureSeverity.CRITICAL] 
        for f in result.failures
    )
    
    return has_meaningful_failure

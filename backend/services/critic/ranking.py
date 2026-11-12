from typing import List, Dict, Any
from .models import CriticResult

def rank_candidates(results: List[CriticResult]) -> Dict[str, Any]:
    """
    Ranks the CriticResults based on weighted_total in descending order.
    Returns the winner and the full ranking.
    """
    if not results:
        return {}

    sorted_results = sorted(
        results,
        key=lambda x: (x.pass_, x.scores.weighted_total),
        reverse=True,
    )
    winner = next((result for result in sorted_results if result.pass_), sorted_results[0])
    
    return {
        "winner_candidate_id": winner.candidate_id,
        "winner_strategy": winner.strategy_id,
        "winner_score": winner.scores.weighted_total,
        "ranking": [
            {
                "candidate_id": r.candidate_id,
                "strategy_id": r.strategy_id,
                "score": r.scores.weighted_total,
                "rank": i + 1
            }
            for i, r in enumerate(sorted_results)
        ],
        "sorted_results": sorted_results
    }

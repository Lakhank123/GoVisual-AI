from typing import List, Dict, Any
from services.critic.critic import GoVisualCritic
from .regeneration_service import RegenerationProvider
from .repair_analyzer import analyze_result_for_repair

class CorrectionEngine:
    """
    Orchestrates the self-correction loop.
    Evaluates CriticResults, generates repair decisions, regenerates (mocks),
    and re-evaluates via the Critic.
    Maintains the best version of each candidate across rounds.
    Max rounds = 2.
    """
    
    MAX_CORRECTION_ROUNDS = 1
    
    def __init__(self, critic: GoVisualCritic, regeneration_provider: RegenerationProvider):
        self.critic = critic
        self.regeneration_provider = regeneration_provider
        
    async def run_correction_loop(
        self,
        initial_candidates: List[Dict[str, Any]],
        reference_image_bytes: bytes,
        product_understanding: Dict[str, Any],
        brand_dna: Dict[str, Any],
        marketing_requirement: str
    ) -> Dict[str, Any]:
        """
        Runs the self-correction loop.
        """
        # 1. Initial Evaluation
        print(">> Running Initial Critic Evaluation...")
        current_ranking_data = await self.critic.evaluate_batch(
            candidates=initial_candidates,
            reference_image_bytes=reference_image_bytes,
            product_understanding=product_understanding,
            brand_dna=brand_dna,
            marketing_requirement=marketing_requirement
        )
        
        # Track best candidates by base candidate_id
        # We assume initial candidate IDs don't have '_repaired' suffix.
        best_candidates = { cand["candidate_id"]: cand for cand in initial_candidates }
        best_results = { res.candidate_id: res for res in current_ranking_data["sorted_results"] }
        
        rounds = 0
        while rounds < self.MAX_CORRECTION_ROUNDS:
            rounds += 1
            print(f">> Starting Correction Round {rounds}/{self.MAX_CORRECTION_ROUNDS}")
            
            candidates_to_repair = []
            repair_instructions_map = {}
            
            for result in current_ranking_data["sorted_results"]:
                decision = analyze_result_for_repair(result)
                if decision and decision.should_repair:
                    # Get base id
                    base_id = result.candidate_id.replace("_repaired", "")
                    
                    # Ensure we don't repair a candidate more than once in the same round
                    # (In this architecture, we iterate over current results, so it's one per candidate)
                    candidate_data = best_candidates[base_id]
                    candidates_to_repair.append(candidate_data)
                    repair_instructions_map[base_id] = decision.repair_instruction
                    
            candidates_to_repair = candidates_to_repair[:1]
            if not candidates_to_repair:
                print(">> No candidates require repair. Exiting correction loop.")
                break
                
            # 2. Regenerate Candidates
            regenerated_candidates = []
            for cand in candidates_to_repair:
                base_id = cand["candidate_id"].replace("_repaired", "")
                instruction = repair_instructions_map[base_id]
                print(f"   -> Regenerating {base_id} with instruction: {instruction[:50]}...")
                new_cand = await self.regeneration_provider.regenerate(cand, instruction, reference_image_bytes)
                regenerated_candidates.append(new_cand)
                
            # 3. Re-Evaluate Regenerated Candidates
            print(">> Re-evaluating repaired candidates...")
            new_ranking_data = await self.critic.evaluate_batch(
                candidates=regenerated_candidates,
                reference_image_bytes=reference_image_bytes,
                product_understanding=product_understanding,
                brand_dna=brand_dna,
                marketing_requirement=marketing_requirement
            )
            
            # 4. Compare and Update Best Candidates
            for new_result in new_ranking_data["sorted_results"]:
                base_id = new_result.candidate_id.replace("_repaired", "")
                old_result = best_results[base_id]
                
                # Replacement logic: Must be strictly better
                if new_result.scores.weighted_total > old_result.scores.weighted_total:
                    print(f"   -> ACCEPTED REPAIR for {base_id}: Score improved ({old_result.scores.weighted_total} -> {new_result.scores.weighted_total})")
                    # Find the new candidate data
                    new_cand_data = next((c for c in regenerated_candidates if c["candidate_id"] == new_result.candidate_id), None)
                    if new_cand_data:
                        best_candidates[base_id] = new_cand_data
                        best_results[base_id] = new_result
                else:
                    print(f"   -> REJECTED REPAIR for {base_id}: Score did not improve ({old_result.scores.weighted_total} -> {new_result.scores.weighted_total})")
                    
            # For the next round, we only need to evaluate the updated best_candidates?
            # Actually, we don't need to re-evaluate them all, we already have their results.
            # We reconstruct the ranking data for the next loop.
            current_ranking_data["sorted_results"] = list(best_results.values())
            
        print(">> Correction loop finished.")
        
        # Rank the final best results
        final_results = list(best_results.values())
        from services.critic.ranking import rank_candidates
        final_ranking = rank_candidates(final_results)
        final_ranking["candidates"] = list(best_candidates.values())
        
        return final_ranking

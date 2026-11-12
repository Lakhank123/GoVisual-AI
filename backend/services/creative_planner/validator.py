from typing import List
from .creative_plan import CreativePlan

class Validator:
    """
    Validates that the generated CreativeStrategies inside a CreativePlan 
    are meaningfully different.
    """
    
    def validate(self, plan: CreativePlan) -> bool:
        if len(plan.strategies) <= 1:
            return True
            
        environments = set()
        lightings = set()
        
        for strategy in plan.strategies:
            env = strategy.environment or ""
            light = strategy.lighting or ""
            
            # If we see exact duplicates across multiple candidates, they aren't distinct.
            # In a robust system, this might use embeddings. For now, strict string comparison.
            if env in environments and env != "":
                return False
            if light in lightings and light != "":
                return False
                
            environments.add(env)
            lightings.add(light)
            
        return True

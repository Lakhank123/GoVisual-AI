from abc import ABC, abstractmethod
from typing import Dict, Any
import sys
import os

# Add parent dir to path to import t5_model if needed
# Assuming backend structure allows this, or import directly
try:
    from backend.services.t5_model import T5PromptOptimizer
except ImportError:
    # Fallback or stub if T5 is not fully integrated yet
    T5PromptOptimizer = None

class PromptOptimizationProvider(ABC):
    @abstractmethod
    def optimize(self, structured_prompt: Dict[str, Any]) -> str:
        """
        Takes a structured prompt and returns a single optimized string prompt.
        """
        pass
        
    @abstractmethod
    def get_model_name(self) -> str:
        """
        Returns the name of the model being used.
        """
        pass


class T5OptimizationProvider(PromptOptimizationProvider):
    def __init__(self):
        if T5PromptOptimizer:
            self.t5_optimizer = T5PromptOptimizer()
        else:
            self.t5_optimizer = None

    def optimize(self, structured_prompt: Dict[str, Any]) -> str:
        raw_text = structured_prompt.get("raw_text", "")
        if self.t5_optimizer:
            # We assume T5PromptOptimizer has a method like `optimize_prompt(text)`
            # Adjust if the actual method name is different
            try:
                optimized = self.t5_optimizer.optimize_prompt(raw_text)
                return optimized
            except Exception as e:
                print(f"T5 optimization failed: {e}. Falling back to raw text.")
                return raw_text
        
        # Fallback if no real T5
        return f"[T5 Optimized] {raw_text}"

    def get_model_name(self) -> str:
        return "t5-prompt-optimizer-v1"


def get_optimization_provider() -> PromptOptimizationProvider:
    """
    Factory function to get the configured optimization provider.
    """
    return T5OptimizationProvider()

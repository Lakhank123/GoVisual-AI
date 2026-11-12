from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class RegenerationProvider(ABC):
    """
    Abstract interface for regenerating an image based on repair instructions.
    """
    
    @abstractmethod
    async def regenerate(
        self,
        candidate_data: Dict[str, Any],
        repair_instruction: str,
        reference_image_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Takes the original candidate data and a repair instruction.
        Returns the regenerated candidate data (with new image_bytes, etc).
        """
        pass

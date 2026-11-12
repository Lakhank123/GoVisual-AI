from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

class RepairDecision(BaseModel):
    candidate_id: str
    should_repair: bool
    repairable: bool
    priority: int  # 1 (Highest) to 9 (Lowest)
    failure_types: List[str]
    reason: str
    preserve_constraints: str
    repair_instruction: str
    expected_improvement: str

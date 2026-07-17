import uuid
from typing import Dict, Any, Optional

_mock_db = {}
_mock_prompts_db = {}

class GenerationSessionService:
    def __init__(self):
        pass

    def create_session(self, user_id: str, business_id: str, creative_request: Dict[str, Any], brand_brain_snapshot: Dict[str, Any], model_name: str) -> str:
        session_id = str(uuid.uuid4())
        _mock_db[session_id] = {
            "session_id": session_id,
            "user_id": user_id,
            "business_id": business_id,
            "creative_request": creative_request,
            "brand_brain_snapshot": brand_brain_snapshot,
            "model_name": model_name,
            "status": "pending",
            "prompts": []
        }
        return session_id

    def save_prompt_version(self, session_id: str, structured_prompt: Dict[str, Any], optimized_prompt: str, version: int = 1) -> str:
        prompt_id = str(uuid.uuid4())
        prompt_data = {
            "prompt_id": prompt_id,
            "session_id": session_id,
            "structured_prompt": structured_prompt,
            "optimized_prompt": optimized_prompt,
            "version": version
        }
        _mock_prompts_db[prompt_id] = prompt_data
        
        if session_id in _mock_db:
            _mock_db[session_id]["prompts"].append(prompt_data)
            
        return prompt_id

    def get_session(self, session_id: str) -> Dict[str, Any]:
        if session_id in _mock_db:
            return _mock_db[session_id]
        return {
            "session_id": session_id,
            "status": "not_found",
            "prompts": []
        }

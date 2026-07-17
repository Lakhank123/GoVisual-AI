from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional

from services.prompt_engine.prompt_validation_service import PromptValidationService
from services.prompt_engine.prompt_assembly_engine import PromptAssemblyEngine
from services.prompt_engine.optimization_provider import get_optimization_provider
from services.prompt_engine.generation_session_service import GenerationSessionService

router = APIRouter(prefix="/generation", tags=["generation"])

class ProcessRequest(BaseModel):
    user_id: str
    business_id: str
    creative_request: Dict[str, Any]
    brand_brain_snapshot: Dict[str, Any]

@router.post("/process")
async def process_generation(req: ProcessRequest):
    validation_service = PromptValidationService()
    assembly_engine = PromptAssemblyEngine()
    optimization_provider = get_optimization_provider()
    session_service = GenerationSessionService()

    # 1. Validate
    errors = validation_service.validate(req.brand_brain_snapshot, req.creative_request)
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})

    # 2. Assemble
    structured_prompt = assembly_engine.assemble(req.brand_brain_snapshot, req.creative_request)

    # 3. Optimize
    optimized_prompt = optimization_provider.optimize(structured_prompt)
    model_name = optimization_provider.get_model_name()

    # 4. Save Session
    session_id = session_service.create_session(
        user_id=req.user_id,
        business_id=req.business_id,
        creative_request=req.creative_request,
        brand_brain_snapshot=req.brand_brain_snapshot,
        model_name=model_name
    )

    prompt_id = session_service.save_prompt_version(
        session_id=session_id,
        structured_prompt=structured_prompt,
        optimized_prompt=optimized_prompt,
        version=1
    )

    # 5. Return Session Data
    return {
        "session_id": session_id,
        "prompt_id": prompt_id,
        "structured_prompt": structured_prompt,
        "optimized_prompt": optimized_prompt,
        "model_name": model_name
    }

@router.post("/assemble")
async def assemble_prompt(req: ProcessRequest):
    # Granular route for debugging
    validation_service = PromptValidationService()
    errors = validation_service.validate(req.brand_brain_snapshot, req.creative_request)
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})
        
    assembly_engine = PromptAssemblyEngine()
    structured_prompt = assembly_engine.assemble(req.brand_brain_snapshot, req.creative_request)
    return {"structured_prompt": structured_prompt}

@router.post("/optimize")
async def optimize_prompt(req: Dict[str, Any]):
    # Granular route for debugging
    optimization_provider = get_optimization_provider()
    optimized_prompt = optimization_provider.optimize(req)
    return {"optimized_prompt": optimized_prompt}

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    session_service = GenerationSessionService()
    return session_service.get_session(session_id)

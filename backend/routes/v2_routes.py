import json
import os
import uuid
import logging
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from services.auth import get_current_user
from services.product_understanding.service import ProductUnderstandingService
from services.product_understanding.vision_provider import GroqVisionProviderAdapter
from services.creative_planner.planner import CreativePlanner
from services.creative_engine.generation_planner import GenerationPlanner
from services.critic.critic import GoVisualCritic
from services.critic.providers.groq_provider import GroqCriticProvider
from services.self_correction.providers.openai_regeneration_provider import OpenAIRegenerationProvider
from services.brand import BrandService
from services.caption_service import generate_caption
from services.image_guardrails import sanitize_and_validate_image, ValidationError
from payments.service import get_credit_guard

logger = logging.getLogger("GoVisual.V2Routes")

router = APIRouter(tags=["v2_generation"])

class V2GenerateResponse(BaseModel):
    success: bool = True
    session_id: str
    candidates: list
    caption: str
    recommended_candidate_id: Optional[str] = None
    recommendation_reason: Optional[str] = None
    creative_brief: Optional[dict] = None

@router.post("/generate", response_model=V2GenerateResponse)
@router.post("/generate-v2", response_model=V2GenerateResponse)
async def generate_v2(
    product: str = Form(...),
    price: str = Form(...),
    format: str = Form(...),
    image_type: str = Form(...),
    purpose: str = Form(...),
    mood: str = Form(...),
    background: str = Form(...),
    lighting: str = Form(...),
    offer: str = Form(...),
    main_text: str = Form(""),
    language: str = Form("English"),
    urgency: str = Form("no"),
    brand_name: str = Form(...),
    brand_colors: str = Form(...),
    category: str = Form(...),
    brand_dna: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    ingredients: Optional[str] = Form(None),
    features: Optional[str] = Form(None),
    benefits: Optional[str] = Form(None),
    specifications: Optional[str] = Form(None),
    product_image: Optional[UploadFile] = File(None),
    logo_image: Optional[UploadFile] = File(None),
    logo_position: str = Form("top-right"),
    reference_image_url: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    logger.info("[V2_PIPELINE_ACTIVE] Request received for /generate")

    user_id = str(user.id if hasattr(user, "id") else (user.get("id") if isinstance(user, dict) else user))
    credit_guard = get_credit_guard()
    critic_requested = os.getenv("ENABLE_CRITIC", "false").strip().lower() == "true"

    # Enforce atomic credit check, run limits, and auto-correction gate
    credit_guard.verify_generation_eligibility(
        user_id=user_id,
        requested_images_count=3,
        auto_correction_requested=critic_requested
    )

    # 1. Read & Validate Authoritative Product Reference Image
    image_bytes = b""
    if product_image is not None:
        raw_bytes = await product_image.read()
        if not raw_bytes:
            raise HTTPException(status_code=400, detail="Uploaded product image is empty.")
        try:
            sanitized_product_bytes, _, _ = sanitize_and_validate_image(raw_bytes)
            image_bytes = sanitized_product_bytes
        except ValidationError as ve:
            raise HTTPException(status_code=400, detail=ve.message)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid product image file: {e}")
    elif reference_image_url:
        try:
            brand_svc = BrandService()
            image_bytes = await brand_svc.download_photo(reference_image_url)
            if not image_bytes:
                raise HTTPException(status_code=400, detail="Downloaded reference image is empty.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch reference image: {e}")
    else:
        raise HTTPException(status_code=400, detail="Provide product_image or reference_image_url")

    # Parse brand_dna early to access brand metadata and stored logo_url
    supplied_brand_dna = {}
    if brand_dna:
        try:
            supplied_brand_dna = json.loads(brand_dna)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="brand_dna must be valid JSON.")

    # 2. Read & Validate Logo Image (from form upload or stored brand profile)
    logo_bytes = None
    if logo_image is not None:
        raw_logo = await logo_image.read()
        if raw_logo:
            try:
                sanitized_logo, _, _ = sanitize_and_validate_image(raw_logo)
                logo_bytes = sanitized_logo
            except Exception as le:
                logger.warning("[V2] Logo validation warning: %s", le)
                logo_bytes = raw_logo
    elif supplied_brand_dna.get("logo_url") or supplied_brand_dna.get("logoUrl"):
        stored_logo_url = supplied_brand_dna.get("logo_url") or supplied_brand_dna.get("logoUrl")
        try:
            brand_svc = BrandService()
            fetched_logo = await brand_svc.download_photo(stored_logo_url)
            if fetched_logo:
                try:
                    sanitized_logo, _, _ = sanitize_and_validate_image(fetched_logo)
                    logo_bytes = sanitized_logo
                except Exception:
                    logo_bytes = fetched_logo
                logger.info("[V2] Successfully loaded authoritative logo from brand profile URL.")
        except Exception as le:
            logger.warning("[V2] Could not fetch logo from stored profile URL: %s", le)
    
    # 3. Product Understanding (Vision analysis)
    logger.info("[V2] Starting Product Understanding (Groq)")
    vision_provider = GroqVisionProviderAdapter()
    pu_service = ProductUnderstandingService(vision_provider)
    pu_result = await pu_service.analyze_product(image_bytes)
    
    if pu_result.status != "success":
        logger.error("[V2] Product understanding failed.")
        raise HTTPException(status_code=500, detail="Product understanding failed.")
        
    # 4. Creative Planner & Advertising Director Engine
    logger.info("[V2] Starting Creative Planner with Brand & Product Intelligence")
    engine = GenerationPlanner()

    brand_dna_dict = {
        **supplied_brand_dna,
        "brand_name": brand_name,
        "colors": brand_colors,
        "category": category,
        "logo_present": bool(logo_bytes),
    }

    catalog_product = {
        "name": product,
        "description": description,
        "category": category,
        "price": price,
        "offer": offer,
        "ingredients": ingredients,
        "features": features,
        "benefits": benefits,
        "specifications": specifications,
    }

    marketing_req = (
        f"{purpose} for {product}. Offer: {offer}. Mood: {mood}. "
        f"Lighting: {lighting}. Setting: {background}. Headline: {main_text or 'Special Showcase'}."
    )
    
    creative_preferences = {
        "format": format,
        "image_type": image_type,
        "purpose": purpose,
        "mood": mood,
        "background": background,
        "lighting": lighting,
        "main_text": main_text,
        "offer": offer,
        "price": price,
        "urgency": urgency,
        "language": language,
        "logo_position": logo_position,
        "product": product,
        "category": category,
        "description": description,
        "ingredients": ingredients,
        "features": features,
        "benefits": benefits,
        "specifications": specifications,
    }

    creative_requests = engine.prepare_candidates(
        product_understanding=pu_result.analysis,
        brand_dna=brand_dna_dict,
        marketing_requirement=marketing_req,
        creative_preferences=creative_preferences,
        reference_image_bytes=image_bytes,
        logo_image_bytes=logo_bytes,
        logo_position=logo_position,
        catalog_product=catalog_product,
    )
    
    # 5. Image Generation
    logger.info(f"[V2] Generating {len(creative_requests)} candidates via Image Generation Provider")
    from services.image_provider.factory import get_image_generation_provider
    image_provider = get_image_generation_provider()

    run_id = f"gen_{uuid.uuid4().hex[:10]}"
    credit_guard.reserve_generation_credits(user_id=user_id, amount=3, run_id=run_id)

    generated_results = []
    failed_candidates = 0
    try:
        for req in creative_requests:
            res = await image_provider.generate(req)
            result = res[0]
            # Preserve brief and metadata on the generated result
            if req.metadata:
                if not result.metadata:
                    result.metadata = {}
                result.metadata.update(req.metadata)

            # Ensure authoritative brand logo is composited into final candidate pixels if available
            if logo_bytes and result.status == "SUCCESS" and result.image_bytes:
                if not (result.metadata and result.metadata.get("logo_composited")):
                    try:
                        from services.logo_overlay import apply_exact_logo
                        composited = apply_exact_logo(
                            result.image_bytes,
                            logo_bytes,
                            position=logo_position or "top-right"
                        )
                        if composited:
                            result.image_bytes = composited
                            if result.metadata is not None:
                                result.metadata["logo_composited"] = True
                            if result.image_url and "/static/generated/" in result.image_url:
                                filename = os.path.basename(result.image_url)
                                os.makedirs("generated_images", exist_ok=True)
                                with open(os.path.join("generated_images", filename), "wb") as f:
                                    f.write(composited)
                    except Exception as le:
                        logger.warning("[V2] Post-generation logo overlay warning: %s", le)
                else:
                    if result.metadata is not None:
                        result.metadata["logo_composited"] = True

            generated_results.append(result)
            if result.status == "FAILED":
                logger.error(f"[V2] Candidate {req.candidate_id} failed: {result.error}")
                failed_candidates += 1

        delivered_candidates = [r for r in generated_results if r.status == "SUCCESS"]
        credit_guard.settle_generation(
            user_id=user_id,
            reserved_amount=3,
            delivered_amount=len(delivered_candidates),
            run_id=run_id
        )
    except Exception as gen_exc:
        logger.error(f"[V2] Generation pipeline exception: {gen_exc}")
        credit_guard.settle_generation(
            user_id=user_id,
            reserved_amount=3,
            delivered_amount=0,
            run_id=run_id
        )
        raise gen_exc

    if failed_candidates:
        raise HTTPException(status_code=502, detail="One or more reference-conditioned image generations failed.")
        
    critic_enabled = os.getenv("ENABLE_CRITIC", "false").strip().lower() == "true"

    # 6. Critic Evaluation (Optional, disabled in testing/default)
    final_ranking = {}
    winner_id = None
    reason = "Highest valid visual fidelity and advertising composition."
    
    eval_candidates = []
    for gen in generated_results:
        eval_candidates.append({
            "candidate_id": gen.candidate_id,
            "strategy_id": gen.strategy_name,
            "strategy_name": gen.strategy_name,
            "image_bytes": gen.image_bytes,
            "prompt_used": gen.prompt_used,
            "status": gen.status,
            "url": gen.image_url,
            "provider": gen.provider,
            "model": gen.model,
            "latency": gen.latency,
            "reference_conditioned": gen.reference_conditioned,
            "error": gen.error,
            "logo_image": gen.metadata.get("logo_image") if gen.metadata else logo_bytes,
            "logo_position": gen.metadata.get("logo_position", "top-right") if gen.metadata else "top-right",
            "metadata": gen.metadata,
        })
        
    successful_cands = [c for c in eval_candidates if c["status"] == "SUCCESS"]
    
    if critic_enabled and successful_cands:
        try:
            credit_guard.check_and_consume_critic(user_id=user_id)
        except Exception as qe:
            logger.warning(f"[V2] Critic quota check warning: {qe}")
        try:
            from services.self_correction.correction_engine import CorrectionEngine
            critic_provider = GroqCriticProvider()
            critic = GoVisualCritic(critic_provider)
            sc_engine = CorrectionEngine(critic, OpenAIRegenerationProvider())
            
            logger.info("[V2_PIPELINE] [SELF_CORRECTION] Running Real Critic & Self-Correction loop")
            final_ranking = await sc_engine.run_correction_loop(
                initial_candidates=eval_candidates,
                reference_image_bytes=image_bytes,
                product_understanding=pu_result.analysis.model_dump(),
                brand_dna=brand_dna_dict,
                marketing_requirement=marketing_req
            )
            
            winner_id = final_ranking.get("winner_candidate_id")
            for res in final_ranking.get("sorted_results", []):
                if res.candidate_id == winner_id:
                    reason = res.overall_reasoning or f"Recommended with a score of {res.scores.weighted_total}."
                    break
        except Exception as e:
            logger.warning(f"[V2] Critic evaluation warning: {e}")
            winner_id = successful_cands[0]["candidate_id"]
    elif not successful_cands:
        raise HTTPException(status_code=502, detail="No successful image candidates were generated.")
    else:
        winner_id = successful_cands[0]["candidate_id"]

    # 7. Format Output & Attach Sanitized Creative Briefs
    fallback_candidates = [
        {
            "candidate_id": gen.candidate_id,
            "strategy_name": gen.strategy_name,
            "prompt_used": gen.prompt_used,
            "provider": gen.provider,
            "model": gen.model,
            "status": gen.status,
            "latency": gen.latency,
            "url": gen.image_url,
            "reference_conditioned": gen.reference_conditioned,
            "error": gen.error,
            "metadata": gen.metadata,
        }
        for gen in generated_results
    ]

    final_candidates = (
        final_ranking.get("candidates")
        if (critic_enabled and final_ranking.get("candidates"))
        else fallback_candidates
    )
    score_map = {
        result.candidate_id: result
        for result in final_ranking.get("sorted_results", [])
    } if critic_enabled else {}

    output_candidates = []
    primary_brief = None

    for gen in final_candidates:
        cand_id = gen.get("candidate_id")
        critic_result = score_map.get(cand_id)
        meta = gen.get("metadata") or {}
        cand_brief = meta.get("creative_brief")
        if not primary_brief and cand_brief:
            primary_brief = cand_brief

        output_candidates.append({
            "candidate_id": cand_id,
            "strategy_name": gen.get("strategy_name"),
            "prompt_used": gen.get("prompt_used"),
            "provider": gen.get("provider"),
            "model": gen.get("model"),
            "status": gen.get("status"),
            "latency": gen.get("latency"),
            "url": gen.get("url"),
            "reference_conditioned": gen.get("reference_conditioned", True),
            "error": gen.get("error"),
            "scores": critic_result.scores.model_dump() if critic_result else None,
            "critic_pass": critic_result.pass_ if critic_result else None,
            "critic_issues": critic_result.issues if critic_result else [],
            "is_recommended": cand_id == winner_id,
            "recommendation_reason": reason if cand_id == winner_id else None,
            "creative_brief": cand_brief,
            "verified_features": meta.get("verified_features", []),
            "logo_composited": meta.get("logo_composited", bool(logo_bytes)),
        })
        
    if critic_enabled and final_ranking and "ranking" in final_ranking:
        rank_map = {r["candidate_id"]: r["rank"] for r in final_ranking["ranking"]}
        output_candidates.sort(key=lambda x: rank_map.get(x["candidate_id"], 999))
    else:
        output_candidates.sort(key=lambda x: 0 if x["is_recommended"] else 1)
        
    if len(output_candidates) != 3:
        raise HTTPException(status_code=502, detail=f"Expected 3 candidates, got {len(output_candidates)}")
        
    # 8. Synchronized Caption Generation
    try:
        credit_guard.check_and_consume_caption(user_id=user_id)
    except Exception as ce:
        logger.warning(f"[V2] Caption quota check notice: {ce}")

    caption = await generate_caption(
        product=product,
        brand_name=brand_name,
        offer=offer,
        purpose=purpose,
        language=language,
    )

    return V2GenerateResponse(
        success=True,
        session_id=str(uuid.uuid4())[:8],
        candidates=output_candidates,
        caption=caption,
        recommended_candidate_id=winner_id,
        recommendation_reason=reason,
        creative_brief=primary_brief,
    )

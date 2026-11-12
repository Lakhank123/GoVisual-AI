import os
import base64
import json
import httpx
import logging
import io
from PIL import Image
from typing import Dict, Any, Optional

from ..base import CriticProvider
from ..models import CriticResult, CandidateScore, DetectedFailure, FailureType, FailureSeverity

logger = logging.getLogger("GoVisual.Critic")

class GroqCriticProvider(CriticProvider):
    def __init__(self, model_name: str = "qwen/qwen3.8-27b"):
        self.model_name = os.getenv("GROQ_VISION_MODEL", model_name)
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        
    async def evaluate_candidate(
        self,
        candidate_id: str,
        strategy_id: str,
        image_bytes: Optional[bytes],
        reference_image_bytes: Optional[bytes],
        product_understanding: Dict[str, Any],
        brand_dna: Dict[str, Any],
        marketing_requirement: str,
        prompt_used: str
    ) -> CriticResult:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment.")
            
        if not image_bytes or not reference_image_bytes:
            raise ValueError("Both generated candidate image and reference image are required for evaluation.")

        # Critic-only thumbnails keep Groq vision input usage within the account
        # token budget. The original bytes remain unchanged for generation/output.
        reference_image_bytes = self._prepare_critic_image(reference_image_bytes)
        image_bytes = self._prepare_critic_image(image_bytes)

        # Determine mime type for reference
        ref_mime_type = "image/jpeg"

        # Determine mime type for candidate
        cand_mime_type = "image/jpeg"

        ref_b64 = base64.b64encode(reference_image_bytes).decode("utf-8")
        cand_b64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt_instructions = f"""
        You are an expert, highly critical AI Advertising Critic.
        You must evaluate a newly generated advertisement (Image 2) against the original product reference (Image 1).
        
        Context:
        - Product Understanding: {json.dumps(product_understanding)}
        - Brand DNA: {json.dumps(brand_dna)}
        - Marketing Requirement: {marketing_requirement}
        - Generation Prompt Used: {prompt_used}
        
        You must evaluate the candidate on exactly 7 dimensions. Provide an integer score from 0 to 100 for each.
        Product fidelity and product placement are highest priority. Compare the final image against the supplied reference.
        You must also detect failures (if any) and classify them by severity (LOW, MEDIUM, HIGH, CRITICAL) and type (PRODUCT_ERROR, BRAND_ERROR, PROMPT_ERROR, COMPOSITION_ERROR, AESTHETIC_ERROR, TEXT_ERROR, REALISM_ERROR).
        
        Return exactly this JSON structure (no markdown formatting, no code blocks):
        {{
            "product_fidelity": 0,
            "product_placement": 0,
            "scene_integration": 0,
            "composition": 0,
            "brand_consistency": 0,
            "marketing_effectiveness": 0,
            "text_logo_safety": 0,
            "pass": true,
            "issues": [],
            "failures": [
                {{
                    "failure_type": "TEXT_ERROR",
                    "severity": "CRITICAL",
                    "evidence": "Describe evidence",
                    "explanation": "Why this is a failure",
                    "affected_dimension": "text_safety"
                }}
            ],
            "strengths": ["string"],
            "weaknesses": ["string"],
            "recommendation_reason": "string"
        }}
        """

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_instructions},
                        {"type": "image_url", "image_url": {"url": f"data:{ref_mime_type};base64,{ref_b64}", "detail": "low"}},
                        {"type": "image_url", "image_url": {"url": f"data:{cand_mime_type};base64,{cand_b64}", "detail": "low"}}
                    ]
                }
            ],
            "max_completion_tokens": 512,
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    response = await client.post(url, json=payload, headers=headers)
                    if response.status_code >= 400:
                        if response.status_code == 429:
                            raise RuntimeError(f"Groq critic rate limit reached: {response.text[:500]}")
                        raise ValueError(f"Groq API Error {response.status_code}: {response.text[:500]}")
                    
                    data = response.json()
                    content = data.get("choices", [])[0].get("message", {}).get("content", "")
                    if not content:
                        raise ValueError("Empty response from Groq.")
                    
                    analysis = json.loads(content)
                    
                    # Map to CriticResult
                    scores = CandidateScore(
                        product_fidelity=analysis.get("product_fidelity", 0),
                        product_placement=analysis.get("product_placement", 0),
                        scene_integration=analysis.get("scene_integration", 0),
                        composition=analysis.get("composition", 0),
                        brand_consistency=analysis.get("brand_consistency", 0),
                        marketing_effectiveness=analysis.get("marketing_effectiveness", 0),
                        text_logo_safety=analysis.get("text_logo_safety", 0)
                    )
                    
                    failures = []
                    for f in analysis.get("failures", []):
                        failures.append(DetectedFailure(**f))
                        
                    issues = analysis.get("issues", [])
                    critical_failure = any(f.severity.value == "CRITICAL" for f in failures)
                    hard_gate_failure = (
                        scores.product_fidelity < 50
                        or scores.product_placement < 45
                        or scores.scene_integration < 45
                        or scores.brand_consistency < 45
                    )
                    if hard_gate_failure and not critical_failure:
                        failures.append(DetectedFailure(
                            failure_type=FailureType.PRODUCT_ERROR,
                            severity=FailureSeverity.HIGH,
                            evidence="One or more product/brand quality gates scored below the production threshold.",
                            explanation="The candidate cannot be recommended without repair.",
                            affected_dimension="product_fidelity",
                        ))
                    return CriticResult(
                        candidate_id=candidate_id,
                        strategy_id=strategy_id,
                        scores=scores,
                        failures=failures,
                        strengths=analysis.get("strengths", []),
                        weaknesses=analysis.get("weaknesses", []),
                        overall_reasoning=analysis.get("recommendation_reason", ""),
                        pass_=bool(analysis.get("pass", True)) and not critical_failure and not hard_gate_failure,
                        issues=issues,
                    )
                    
            except RuntimeError:
                raise
            except Exception as e:
                if attempt == 1:
                    logger.error(f"[CRITIC] Error evaluating candidate {candidate_id}: {e}")
                    raise
                else:
                    logger.warning(f"[CRITIC] Retrying candidate {candidate_id} due to {e}")

    @staticmethod
    def _prepare_critic_image(image_bytes: bytes) -> bytes:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=60, optimize=True)
        return output.getvalue()


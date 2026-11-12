import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException
from payments.schemas import PlanTier, CreditTransactionType

logger = logging.getLogger("GoVisual.CreditGuard")

class CreditGuard:
    """
    Enforces atomic credit reservations, settlements, quota limits, and plan tier gating.
    Protects AI image generation, caption generation, critic evaluations, and auto-correction.
    """

    def __init__(self, billing_service):
        self.billing_service = billing_service

    def verify_generation_eligibility(
        self,
        user_id: str,
        requested_images_count: int = 3,
        auto_correction_requested: bool = False,
    ) -> Dict[str, Any]:
        """
        Validates whether the user is eligible to initiate a generation run.
        Checks:
        1. User subscription tier.
        2. Monthly run limits for Free tier (max 2 runs/month).
        3. Feature availability (auto-correction forbidden on Free tier).
        4. Credit balance sufficient for requested images.
        """
        subscription = self.billing_service.get_user_subscription(user_id)
        active_plan = subscription.active_plan
        tier = active_plan.tier

        # 1. Feature gating: Auto-correction
        if auto_correction_requested and not active_plan.auto_correction_allowed:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "FEATURE_LOCKED",
                    "feature": "auto_correction",
                    "plan": tier.value,
                    "message": "Self-correction is exclusively available on Creator Pro and Business Max plans. Please upgrade to unlock."
                }
            )

        # 2. Quota check: Free tier max 2 three-image runs per calendar month
        quota_usage = self.billing_service.get_current_month_quota(user_id)
        if tier == PlanTier.FREE:
            if quota_usage.three_image_runs >= active_plan.max_three_image_runs_monthly:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "code": "MONTHLY_RUN_LIMIT_EXCEEDED",
                        "current_runs": quota_usage.three_image_runs,
                        "limit": active_plan.max_three_image_runs_monthly,
                        "message": (
                            f"Free starter tier limit of {active_plan.max_three_image_runs_monthly} "
                            "creative generation runs reached for this month. Upgrade to Creator Pro for unlimited runs."
                        )
                    }
                )

        # 3. Credit sufficiency check
        current_balance = self.billing_service.get_user_credits(user_id)
        if current_balance < requested_images_count:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "INSUFFICIENT_CREDITS",
                    "required": requested_images_count,
                    "available": current_balance,
                    "message": (
                        f"Insufficient image credits. You need {requested_images_count} credits, "
                        f"but have {current_balance} remaining. Please upgrade your plan."
                    )
                }
            )

        return {
            "eligible": True,
            "tier": tier.value,
            "quality": "low" if tier == PlanTier.FREE else "medium",
            "current_balance": current_balance,
            "plan_code": active_plan.code
        }

    def reserve_generation_credits(
        self,
        user_id: str,
        amount: int,
        run_id: str
    ) -> int:
        """
        Atomically reserves credits prior to image generation.
        Returns the remaining balance after deduction.
        """
        return self.billing_service.reserve_credits(user_id, amount, run_id)

    def settle_generation(
        self,
        user_id: str,
        reserved_amount: int,
        delivered_amount: int,
        run_id: str
    ) -> int:
        """
        Settles delivered images and refunds any failed generations.
        1 delivered image = 1 credit.
        If delivered < reserved, refunds (reserved - delivered).
        Increments monthly usage quotas for completed generation.
        """
        new_balance = self.billing_service.settle_or_refund_credits(
            user_id=user_id,
            reserved_amount=reserved_amount,
            delivered_amount=delivered_amount,
            reference_id=run_id
        )

        if delivered_amount > 0:
            self.billing_service.increment_monthly_quota(
                user_id=user_id,
                images_delta=delivered_amount,
                runs_delta=1
            )

        return new_balance

    def check_and_consume_caption(self, user_id: str) -> bool:
        """Checks and tracks monthly caption usage against plan limit."""
        subscription = self.billing_service.get_user_subscription(user_id)
        quota = self.billing_service.get_current_month_quota(user_id)
        limit = subscription.active_plan.monthly_captions

        if quota.captions_generated >= limit:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "CAPTION_LIMIT_EXCEEDED",
                    "limit": limit,
                    "message": f"Monthly caption suggestion limit ({limit}) reached. Upgrade your plan for more captions."
                }
            )

        self.billing_service.increment_monthly_quota(user_id=user_id, captions_delta=1)
        return True

    def check_and_consume_critic(self, user_id: str) -> bool:
        """Checks and tracks monthly critic evaluations against plan limit."""
        subscription = self.billing_service.get_user_subscription(user_id)
        quota = self.billing_service.get_current_month_quota(user_id)
        limit = subscription.active_plan.monthly_critic_evals

        if quota.critic_evaluations >= limit:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "CRITIC_LIMIT_EXCEEDED",
                    "limit": limit,
                    "message": f"Monthly GoVisual Critic evaluations limit ({limit}) reached. Upgrade your plan."
                }
            )

        self.billing_service.increment_monthly_quota(user_id=user_id, critic_delta=1)
        return True

    def check_and_consume_minisite(self, user_id: str) -> bool:
        """Checks and tracks monthly minisite drafts against plan limit."""
        subscription = self.billing_service.get_user_subscription(user_id)
        quota = self.billing_service.get_current_month_quota(user_id)
        limit = subscription.active_plan.monthly_minisite_drafts

        if quota.minisites_created >= limit:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "MINISITE_LIMIT_EXCEEDED",
                    "limit": limit,
                    "message": f"Monthly MiniSite draft limit ({limit}) reached. Upgrade to Business Max for 3 MiniSites."
                }
            )

        self.billing_service.increment_monthly_quota(user_id=user_id, minisites_delta=1)
        return True


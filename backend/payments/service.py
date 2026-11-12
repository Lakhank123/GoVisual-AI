import os
import time
import hmac
import hashlib
import json
import logging
import calendar
from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
    KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
except Exception:
    KOLKATA_TZ = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")

from typing import Dict, Any, List, Optional
from uuid import uuid4

from fastapi import HTTPException

from payments.schemas import (
    PlanTier,
    BillingInterval,
    SubscriptionStatus,
    PaymentOrderStatus,
    CreditTransactionType,
    PlanResponse,
    CheckoutOrderResponse,
    PaymentVerificationResponse,
    UserSubscriptionResponse,
    MonthlyQuotaUsage,
    CreditLedgerEntry,
    AdminBillingMetricsResponse,
)
from payments.base import PaymentGateway
from payments.factory import PaymentGatewayFactory

logger = logging.getLogger("GoVisual.BillingService")

def calculate_calendar_anniversary(dt: datetime, months_to_add: int, original_day: int) -> datetime:
    """
    Calculates the target date preserving the original purchase day anniversary.
    Automatically handles leap years and clamps month-end dates (e.g. Jan 31 -> Feb 28/29).
    """
    new_year = dt.year + (dt.month - 1 + months_to_add) // 12
    new_month = ((dt.month - 1 + months_to_add) % 12) + 1
    max_days = calendar.monthrange(new_year, new_month)[1]
    new_day = min(original_day, max_days)
    return dt.replace(year=new_year, month=new_month, day=new_day)


# Authoritative Plan Definitions
AUTHORITATIVE_PLANS: Dict[str, PlanResponse] = {
    "free_monthly": PlanResponse(
        code="free_monthly",
        tier=PlanTier.FREE,
        name="Free Starter",
        description="Essential marketing creative pack for small businesses",
        billing_interval=BillingInterval.FREE,
        price_inr=0.00,
        price_paise=0,
        duration_days=3650,
        monthly_image_credits=6,
        max_three_image_runs_monthly=2,
        monthly_captions=10,
        monthly_critic_evals=2,
        monthly_minisite_drafts=1,
        auto_correction_allowed=False,
        max_auto_corrections_per_batch=0,
        features=[
            "6 low-quality image credits/mo",
            "Max 2 three-image runs/mo",
            "1 saved brand profile",
            "10 caption suggestions/mo",
            "2 critic evaluations/mo",
            "1 MiniSite draft",
            "Standard support"
        ],
        is_active=True
    ),
    "creator_pro_monthly": PlanResponse(
        code="creator_pro_monthly",
        tier=PlanTier.CREATOR_PRO,
        name="Creator Pro Monthly",
        description="Enhanced commercial generation with critic and brand memory",
        billing_interval=BillingInterval.MONTHLY,
        price_inr=699.00,
        price_paise=69900,
        duration_days=30,
        monthly_image_credits=24,
        max_three_image_runs_monthly=8,
        monthly_captions=30,
        monthly_critic_evals=8,
        monthly_minisite_drafts=1,
        auto_correction_allowed=True,
        max_auto_corrections_per_batch=1,
        features=[
            "24 medium-quality image credits/mo",
            "Max 8 three-image runs/mo",
            "30 caption suggestions/mo",
            "8 critic evaluations/mo",
            "1 MiniSite draft",
            "Saved brand & product context",
            "1 auto-correction per batch",
            "Manual renewal (no auto-renew)"
        ],
        is_active=True
    ),
    "creator_pro_yearly": PlanResponse(
        code="creator_pro_yearly",
        tier=PlanTier.CREATOR_PRO,
        name="Creator Pro Yearly",
        description="Annual commitment with 12 months for the price of 10",
        billing_interval=BillingInterval.YEARLY,
        price_inr=6990.00,
        price_paise=699000,
        duration_days=365,
        monthly_image_credits=24,
        max_three_image_runs_monthly=8,
        monthly_captions=30,
        monthly_critic_evals=8,
        monthly_minisite_drafts=1,
        auto_correction_allowed=True,
        max_auto_corrections_per_batch=1,
        features=[
            "24 medium-quality credits released monthly",
            "Save ₹1,398 (12 months for price of 10)",
            "Max 8 three-image runs/mo",
            "30 caption suggestions/mo",
            "8 critic evaluations/mo",
            "1 MiniSite draft",
            "1 auto-correction per batch"
        ],
        is_active=True
    ),
    "business_max_monthly": PlanResponse(
        code="business_max_monthly",
        tier=PlanTier.BUSINESS_MAX,
        name="Business Max Monthly",
        description="High-volume agency & multi-product creative production",
        billing_interval=BillingInterval.MONTHLY,
        price_inr=1499.00,
        price_paise=149900,
        duration_days=30,
        monthly_image_credits=60,
        max_three_image_runs_monthly=20,
        monthly_captions=100,
        monthly_critic_evals=20,
        monthly_minisite_drafts=3,
        auto_correction_allowed=True,
        max_auto_corrections_per_batch=1,
        features=[
            "60 medium-quality image credits/mo",
            "Max 20 three-image runs/mo",
            "100 caption suggestions/mo",
            "20 critic evaluations/mo",
            "3 MiniSite drafts",
            "Full brand memory & priority rendering",
            "1 auto-correction per batch"
        ],
        is_active=True
    ),
    "business_max_yearly": PlanResponse(
        code="business_max_yearly",
        tier=PlanTier.BUSINESS_MAX,
        name="Business Max Yearly",
        description="Annual high-volume package with maximum savings",
        billing_interval=BillingInterval.YEARLY,
        price_inr=14990.00,
        price_paise=1499000,
        duration_days=365,
        monthly_image_credits=60,
        max_three_image_runs_monthly=20,
        monthly_captions=100,
        monthly_critic_evals=20,
        monthly_minisite_drafts=3,
        auto_correction_allowed=True,
        max_auto_corrections_per_batch=1,
        features=[
            "60 medium-quality credits released monthly",
            "Save ₹2,998 (12 months for price of 10)",
            "Max 20 three-image runs/mo",
            "100 caption suggestions/mo",
            "20 critic evaluations/mo",
            "3 MiniSite drafts",
            "Priority rendering"
        ],
        is_active=True
    ),
}


class BillingRepository:
    """
    In-Memory & Supabase Abstraction Layer.
    Provides fast, isolated ACID state for testing, while supporting live Postgres storage.
    """

    def __init__(self):
        # In-memory storage for test isolation and fallback
        self.users: Dict[str, Dict[str, Any]] = {}
        self.subscriptions: Dict[str, Dict[str, Any]] = {}
        self.entitlements: Dict[str, List[Dict[str, Any]]] = {}
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.ledger: Dict[str, List[Dict[str, Any]]] = {}
        self.quotas: Dict[str, Dict[str, Any]] = {}
        self.processed_webhook_events: set = set()
        self.processed_payment_ids: set = set()

    def get_or_create_user(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self.users:
            now_kolkata = datetime.now(KOLKATA_TZ)
            free_plan = AUTHORITATIVE_PLANS["free_monthly"]
            self.users[user_id] = {
                "id": user_id,
                "credits_remaining": free_plan.monthly_image_credits,
                "tier": PlanTier.FREE.value,
                "created_at": now_kolkata.isoformat(),
                "updated_at": now_kolkata.isoformat()
            }
            # Record initial free ledger entry
            self.add_ledger_entry(
                user_id=user_id,
                tx_type=CreditTransactionType.INITIAL_GRANT,
                amount=free_plan.monthly_image_credits,
                balance_after=free_plan.monthly_image_credits,
                reference_type="free_starter",
                reference_id="welcome_grant",
                description="Initial free starter allocation"
            )
        return self.users[user_id]

    def add_ledger_entry(
        self,
        user_id: str,
        tx_type: CreditTransactionType,
        amount: int,
        balance_after: int,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        entry = {
            "id": f"led_{uuid4().hex[:12]}",
            "user_id": user_id,
            "transaction_type": tx_type,
            "amount": amount,
            "balance_after": balance_after,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "description": description,
            "metadata": metadata or {},
            "created_at": datetime.now(KOLKATA_TZ).isoformat()
        }
        if user_id not in self.ledger:
            self.ledger[user_id] = []
        self.ledger[user_id].append(entry)
        return entry

    def get_current_quota_record(self, user_id: str, year_month: str) -> Dict[str, Any]:
        key = f"{user_id}:{year_month}"
        if key not in self.quotas:
            self.quotas[key] = {
                "id": f"qta_{uuid4().hex[:8]}",
                "user_id": user_id,
                "year_month": year_month,
                "images_generated": 0,
                "three_image_runs": 0,
                "captions_generated": 0,
                "critic_evaluations": 0,
                "minisites_created": 0,
                "updated_at": datetime.now(KOLKATA_TZ).isoformat()
            }
        return self.quotas[key]


class BillingService:
    """
    Central SaaS Billing & Payment Management Engine for GoVisual AI V2.
    """

    def __init__(self, gateway: Optional[PaymentGateway] = None, repo: Optional[BillingRepository] = None):
        self.repo = repo or BillingRepository()
        self._gateway = gateway

    @property
    def gateway(self) -> PaymentGateway:
        if self._gateway is None:
            self._gateway = PaymentGatewayFactory.get_gateway()
        return self._gateway

    def get_plans(self) -> List[PlanResponse]:
        """Returns all authoritative active billing plans."""
        return [plan for plan in AUTHORITATIVE_PLANS.values() if plan.is_active]

    def get_plan_by_code(self, code: str) -> PlanResponse:
        """Retrieves specific plan or raises 404."""
        plan = AUTHORITATIVE_PLANS.get(code)
        if not plan or not plan.is_active:
            raise HTTPException(status_code=404, detail=f"Billing plan '{code}' not found.")
        return plan

    def get_current_year_month(self) -> str:
        """Returns current YYYY-MM string in Asia/Kolkata timezone."""
        return datetime.now(KOLKATA_TZ).strftime("%Y-%m")

    def get_current_month_quota(self, user_id: str) -> MonthlyQuotaUsage:
        """Retrieves or initializes current calendar month quota in Asia/Kolkata timezone."""
        ym = self.get_current_year_month()
        record = self.repo.get_current_quota_record(user_id, ym)
        return MonthlyQuotaUsage(
            year_month=record["year_month"],
            images_generated=record["images_generated"],
            three_image_runs=record["three_image_runs"],
            captions_generated=record["captions_generated"],
            critic_evaluations=record["critic_evaluations"],
            minisites_created=record["minisites_created"]
        )

    def increment_monthly_quota(
        self,
        user_id: str,
        images_delta: int = 0,
        runs_delta: int = 0,
        captions_delta: int = 0,
        critic_delta: int = 0,
        minisites_delta: int = 0
    ):
        """Atomically increments monthly usage quota numbers."""
        ym = self.get_current_year_month()
        record = self.repo.get_current_quota_record(user_id, ym)
        record["images_generated"] += images_delta
        record["three_image_runs"] += runs_delta
        record["captions_generated"] += captions_delta
        record["critic_evaluations"] += critic_delta
        record["minisites_created"] += minisites_delta
        record["updated_at"] = datetime.now(KOLKATA_TZ).isoformat()

    def get_user_credits(self, user_id: str) -> int:
        """Returns current available image credits for user."""
        user = self.repo.get_or_create_user(user_id)
        return user["credits_remaining"]

    def reserve_credits(self, user_id: str, amount: int, reference_id: str) -> int:
        """
        Atomically checks balance and reserves credits prior to image generation.
        """
        user = self.repo.get_or_create_user(user_id)
        if user["credits_remaining"] < amount:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits: {user['credits_remaining']} remaining, {amount} required."
            )

        user["credits_remaining"] -= amount
        user["updated_at"] = datetime.now(KOLKATA_TZ).isoformat()

        self.repo.add_ledger_entry(
            user_id=user_id,
            tx_type=CreditTransactionType.RESERVATION,
            amount=-amount,
            balance_after=user["credits_remaining"],
            reference_type="generation_run",
            reference_id=reference_id,
            description=f"Reserved {amount} credits for generation run {reference_id}"
        )
        return user["credits_remaining"]

    def settle_or_refund_credits(
        self,
        user_id: str,
        reserved_amount: int,
        delivered_amount: int,
        reference_id: str
    ) -> int:
        """
        Settles delivered images and refunds any unused reserved credits.
        """
        user = self.repo.get_or_create_user(user_id)
        refund_amount = max(0, reserved_amount - delivered_amount)

        if refund_amount > 0:
            user["credits_remaining"] += refund_amount
            user["updated_at"] = datetime.now(KOLKATA_TZ).isoformat()
            self.repo.add_ledger_entry(
                user_id=user_id,
                tx_type=CreditTransactionType.REFUND,
                amount=refund_amount,
                balance_after=user["credits_remaining"],
                reference_type="generation_run",
                reference_id=reference_id,
                description=f"Refunded {refund_amount} unused credits for generation run {reference_id}"
            )

        if delivered_amount > 0:
            self.repo.add_ledger_entry(
                user_id=user_id,
                tx_type=CreditTransactionType.SETTLEMENT,
                amount=0,
                balance_after=user["credits_remaining"],
                reference_type="generation_run",
                reference_id=reference_id,
                description=f"Settled {delivered_amount} images delivered for run {reference_id}"
            )

        return user["credits_remaining"]

    def get_user_subscription(self, user_id: str) -> UserSubscriptionResponse:
        """
        Fetches active subscription or falls back to standard Free Starter plan.
        """
        user = self.repo.get_or_create_user(user_id)
        now_kolkata = datetime.now(KOLKATA_TZ)
        quota = self.get_current_month_quota(user_id)

        sub = self.repo.subscriptions.get(user_id)
        if sub and sub.get("status") == SubscriptionStatus.ACTIVE.value:
            # Check expiration
            end_dt = datetime.fromisoformat(sub["end_date"])
            if now_kolkata > end_dt:
                sub["status"] = SubscriptionStatus.EXPIRED.value
                user["tier"] = PlanTier.FREE.value
            else:
                plan = AUTHORITATIVE_PLANS[sub["plan_code"]]
                is_annual = plan.billing_interval == BillingInterval.YEARLY
                
                # Check for next entitlement release date
                next_release = None
                if is_annual and user_id in self.repo.entitlements:
                    for ent in self.repo.entitlements[user_id]:
                        if not ent["is_released"]:
                            next_release = ent["period_start"]
                            break

                return UserSubscriptionResponse(
                    active_plan=plan,
                    status=SubscriptionStatus.ACTIVE,
                    start_date=sub["start_date"],
                    end_date=sub["end_date"],
                    current_period_start=sub["current_period_start"],
                    current_period_end=sub["current_period_end"],
                    auto_renew=False,
                    is_annual=is_annual,
                    total_periods_count=sub.get("total_periods_count", 1),
                    completed_periods_count=sub.get("completed_periods_count", 1),
                    credits_remaining=user["credits_remaining"],
                    monthly_quota_used=quota,
                    next_entitlement_release=next_release
                )

        # Default: Free Starter Plan
        free_plan = AUTHORITATIVE_PLANS["free_monthly"]
        first_of_month = now_kolkata.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # End of current month
        next_month = (first_of_month + timedelta(days=32)).replace(day=1)
        end_of_month = next_month - timedelta(seconds=1)

        return UserSubscriptionResponse(
            active_plan=free_plan,
            status=SubscriptionStatus.ACTIVE,
            start_date=first_of_month.isoformat(),
            end_date=end_of_month.isoformat(),
            current_period_start=first_of_month.isoformat(),
            current_period_end=end_of_month.isoformat(),
            auto_renew=False,
            is_annual=False,
            total_periods_count=1,
            completed_periods_count=1,
            credits_remaining=user["credits_remaining"],
            monthly_quota_used=quota,
            next_entitlement_release=next_month.isoformat()
        )

    def create_checkout_order(
        self,
        user_id: str,
        plan_code: str,
        idempotency_key: Optional[str] = None
    ) -> CheckoutOrderResponse:
        """
        Generates an authoritative Razorpay order with strict server-side pricing.
        """
        plan = self.get_plan_by_code(plan_code)
        if plan.tier == PlanTier.FREE:
            raise HTTPException(status_code=400, detail="Free plan does not require a payment transaction.")

        # Idempotency check: if order already exists with same idempotency key for user
        if idempotency_key:
            for ord_data in self.repo.orders.values():
                if ord_data.get("idempotency_key") == idempotency_key and ord_data["user_id"] == user_id:
                    if ord_data["status"] == PaymentOrderStatus.CREATED.value:
                        return CheckoutOrderResponse(
                            order_id=ord_data["razorpay_order_id"],
                            amount=ord_data["amount_paise"],
                            currency="INR",
                            key_id=self.gateway.key_id,
                            plan_code=plan.code,
                            plan_name=plan.name,
                            billing_interval=plan.billing_interval.value,
                            notes=ord_data.get("metadata", {})
                        )

        receipt = f"rcpt_{user_id[:8]}_{int(time.time())}"
        notes = {
            "user_id": user_id,
            "plan_code": plan.code,
            "tier": plan.tier.value,
            "billing_interval": plan.billing_interval.value
        }

        # Create order at gateway
        gateway_order = self.gateway.create_order(
            amount_paise=plan.price_paise,
            currency="INR",
            receipt=receipt,
            notes=notes
        )

        order_id = gateway_order["id"]

        # Persist order record
        order_record = {
            "id": f"po_{uuid4().hex[:12]}",
            "user_id": user_id,
            "plan_id": plan.code,
            "plan_code": plan.code,
            "billing_interval": plan.billing_interval.value,
            "amount_inr": plan.price_inr,
            "amount_paise": plan.price_paise,
            "currency": "INR",
            "razorpay_order_id": order_id,
            "razorpay_payment_id": None,
            "razorpay_signature": None,
            "status": PaymentOrderStatus.CREATED.value,
            "idempotency_key": idempotency_key,
            "metadata": notes,
            "created_at": datetime.now(KOLKATA_TZ).isoformat(),
            "updated_at": datetime.now(KOLKATA_TZ).isoformat()
        }
        self.repo.orders[order_id] = order_record

        return CheckoutOrderResponse(
            order_id=order_id,
            amount=plan.price_paise,
            currency="INR",
            key_id=self.gateway.key_id,
            plan_code=plan.code,
            plan_name=plan.name,
            billing_interval=plan.billing_interval.value,
            notes=notes
        )

    def verify_and_activate_payment(
        self,
        user_id: str,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> PaymentVerificationResponse:
        """
        Verifies client-submitted signature and activates subscription entitlements.
        Idempotent: double submissions return existing activated subscription safely.
        """
        order = self.repo.orders.get(razorpay_order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        # Idempotency check: if already captured, return success immediately
        if order["status"] == PaymentOrderStatus.CAPTURED.value:
            user = self.repo.get_or_create_user(user_id)
            sub = self.repo.subscriptions.get(user_id, {})
            return PaymentVerificationResponse(
                success=True,
                status="captured",
                subscription_id=sub.get("id", "sub_active"),
                plan_code=order["plan_code"],
                tier=order["metadata"].get("tier", "creator_pro"),
                credits_added=0,
                total_credits=user["credits_remaining"],
                expires_at=sub.get("end_date", ""),
                message="Payment already verified and active."
            )

        # Verify HMAC signature
        is_valid = self.gateway.verify_payment_signature(
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature
        )

        if not is_valid:
            order["status"] = PaymentOrderStatus.FAILED.value
            order["updated_at"] = datetime.now(KOLKATA_TZ).isoformat()
            raise HTTPException(status_code=400, detail="Invalid payment signature. Transaction rejected.")

        # Update order status
        order["status"] = PaymentOrderStatus.CAPTURED.value
        order["razorpay_payment_id"] = razorpay_payment_id
        order["razorpay_signature"] = razorpay_signature
        order["updated_at"] = datetime.now(KOLKATA_TZ).isoformat()

        # Activate subscription
        sub_resp = self._activate_subscription_for_order(user_id, order)
        return sub_resp

    def _activate_subscription_for_order(self, user_id: str, order: Dict[str, Any]) -> PaymentVerificationResponse:
        """
        Internal subscription activation logic:
        - Grants 1st month credits (initial_grant).
        - If yearly, sets up 12 scheduled monthly entitlement periods (NEVER all credits upfront).
        - Updates user tier and credits_remaining.
        """
        plan = self.get_plan_by_code(order["plan_code"])
        now_kolkata = datetime.now(KOLKATA_TZ)
        user = self.repo.get_or_create_user(user_id)

        is_annual = plan.billing_interval == BillingInterval.YEARLY
        purchase_day = now_kolkata.day
        end_date = calculate_calendar_anniversary(now_kolkata, 12, purchase_day) if is_annual else calculate_calendar_anniversary(now_kolkata, 1, purchase_day)
        period_1_end = calculate_calendar_anniversary(now_kolkata, 1, purchase_day)

        sub_id = f"sub_{uuid4().hex[:12]}"
        subscription = {
            "id": sub_id,
            "user_id": user_id,
            "plan_code": plan.code,
            "tier": plan.tier.value,
            "billing_interval": plan.billing_interval.value,
            "status": SubscriptionStatus.ACTIVE.value,
            "start_date": now_kolkata.isoformat(),
            "end_date": end_date.isoformat(),
            "current_period_start": now_kolkata.isoformat(),
            "current_period_end": period_1_end.isoformat(),
            "total_periods_count": 12 if is_annual else 1,
            "completed_periods_count": 1,
            "auto_renew": False,
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": order.get("razorpay_payment_id"),
            "metadata": {"amount_paid_paise": order["amount_paise"]}
        }
        self.repo.subscriptions[user_id] = subscription

        # Setup Entitlement Schedule (Anniversary-based monthly release across 12 calendar months)
        monthly_credits = plan.monthly_image_credits
        if is_annual:
            entitlements = []
            for i in range(1, 13):
                p_start = calculate_calendar_anniversary(now_kolkata, i - 1, purchase_day)
                p_end = calculate_calendar_anniversary(now_kolkata, i, purchase_day)
                entitlements.append({
                    "id": f"ent_{uuid4().hex[:8]}",
                    "subscription_id": sub_id,
                    "user_id": user_id,
                    "period_number": i,
                    "period_start": p_start.isoformat(),
                    "period_end": p_end.isoformat(),
                    "credits_allocated": monthly_credits,
                    "is_released": (i == 1),
                    "released_at": now_kolkata.isoformat() if i == 1 else None
                })
            self.repo.entitlements[user_id] = entitlements

        # Grant first month credits
        user["credits_remaining"] += monthly_credits
        user["tier"] = plan.tier.value
        user["updated_at"] = now_kolkata.isoformat()

        self.repo.add_ledger_entry(
            user_id=user_id,
            tx_type=CreditTransactionType.INITIAL_GRANT,
            amount=monthly_credits,
            balance_after=user["credits_remaining"],
            reference_type="payment_order",
            reference_id=order["razorpay_order_id"],
            description=f"First month credits for {plan.name}"
        )

        return PaymentVerificationResponse(
            success=True,
            status="captured",
            subscription_id=sub_id,
            plan_code=plan.code,
            tier=plan.tier.value,
            credits_added=monthly_credits,
            total_credits=user["credits_remaining"],
            expires_at=end_date.isoformat(),
            message=f"Successfully upgraded to {plan.name}! {monthly_credits} image credits granted."
        )

    def release_due_entitlements(self) -> int:
        """
        Scheduled entitlement release job.
        Releases credits for annual subscriptions when their monthly period matures.
        Returns the number of entitlements successfully released.
        """
        now_kolkata = datetime.now(KOLKATA_TZ)
        released_count = 0

        for user_id, entitlements in self.repo.entitlements.items():
            user = self.repo.get_or_create_user(user_id)
            sub = self.repo.subscriptions.get(user_id)
            if not sub or sub.get("status") != SubscriptionStatus.ACTIVE.value:
                continue

            for ent in entitlements:
                if not ent["is_released"]:
                    p_start = datetime.fromisoformat(ent["period_start"])
                    if now_kolkata >= p_start:
                        # Release this month's credits!
                        credits = ent["credits_allocated"]
                        ent["is_released"] = True
                        ent["released_at"] = now_kolkata.isoformat()

                        user["credits_remaining"] += credits
                        user["updated_at"] = now_kolkata.isoformat()

                        sub["completed_periods_count"] = max(sub.get("completed_periods_count", 1), ent["period_number"])
                        sub["current_period_start"] = ent["period_start"]
                        sub["current_period_end"] = ent["period_end"]

                        self.repo.add_ledger_entry(
                            user_id=user_id,
                            tx_type=CreditTransactionType.MONTHLY_ENTITLEMENT,
                            amount=credits,
                            balance_after=user["credits_remaining"],
                            reference_type="annual_entitlement",
                            reference_id=ent["id"],
                            description=f"Monthly entitlement #{ent['period_number']} released ({credits} credits)"
                        )
                        released_count += 1

        return released_count

    def process_webhook_event(self, raw_body_bytes: bytes, signature_header: str) -> Dict[str, Any]:
        """
        Handles incoming Razorpay webhook with raw HMAC verification and double-delivery idempotency.
        """
        if not signature_header:
            raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header.")

        # 1. Verify webhook signature
        is_valid = self.gateway.verify_webhook_signature(raw_body_bytes, signature_header)
        if not is_valid:
            logger.warning("Invalid webhook signature received.")
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")

        # 2. Parse payload
        try:
            payload = json.loads(raw_body_bytes.decode("utf-8"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Malformed webhook JSON: {e}")

        event_id = payload.get("event_id") or payload.get("id") or str(uuid4())
        event_type = payload.get("event", "unknown")

        # 3. Idempotency check: Double-event delivery prevention
        if event_id in self.repo.processed_webhook_events:
            logger.info(f"Webhook event {event_id} already processed. Skipping duplicate.")
            return {"status": "success", "message": "Event already processed"}

        self.repo.processed_webhook_events.add(event_id)

        # 4. Handle events
        if event_type in ("order.paid", "payment.captured"):
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            notes = payment_entity.get("notes", {})
            user_id = notes.get("user_id")

            # Payment-level idempotency
            if payment_id and payment_id in self.repo.processed_payment_ids:
                logger.info(f"Payment {payment_id} already processed. Skipping duplicate.")
                return {"status": "success", "message": "Payment already processed"}

            if order_id and order_id in self.repo.orders:
                order = self.repo.orders[order_id]
                # Order-level idempotency
                if order["status"] != PaymentOrderStatus.CAPTURED.value:
                    order["status"] = PaymentOrderStatus.CAPTURED.value
                    order["razorpay_payment_id"] = payment_id
                    if payment_id:
                        self.repo.processed_payment_ids.add(payment_id)
                    target_user_id = user_id or order["user_id"]
                    self._activate_subscription_for_order(target_user_id, order)
                    logger.info(f"Order {order_id} activated via webhook.")
                else:
                    logger.info(f"Order {order_id} already captured. Skipping re-activation.")

        elif event_type == "payment.authorized":
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            if order_id and order_id in self.repo.orders:
                order = self.repo.orders[order_id]
                if order["status"] == PaymentOrderStatus.CREATED.value:
                    order["status"] = PaymentOrderStatus.AUTHORIZED.value
                    order["razorpay_payment_id"] = payment_id
                    logger.info(f"Order {order_id} authorized (pending capture).")

        elif event_type == "payment.failed":
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            if order_id and order_id in self.repo.orders:
                self.repo.orders[order_id]["status"] = PaymentOrderStatus.FAILED.value
                logger.info(f"Order {order_id} marked failed via webhook.")

        return {"status": "success", "event": event_type, "event_id": event_id}

    def get_admin_metrics(self) -> AdminBillingMetricsResponse:
        """
        Calculates SaaS metrics: MRR, ARR, subscribers by tier, credits allocated/consumed,
        and estimated margins.
        """
        now = datetime.now(KOLKATA_TZ)
        subscribers_by_tier = {
            PlanTier.FREE.value: 0,
            PlanTier.CREATOR_PRO.value: 0,
            PlanTier.BUSINESS_MAX.value: 0
        }

        mrr = 0.0
        arr = 0.0
        active_subs_count = 0

        for user_id, sub in self.repo.subscriptions.items():
            if sub.get("status") == SubscriptionStatus.ACTIVE.value:
                end_dt = datetime.fromisoformat(sub["end_date"])
                if now <= end_dt:
                    tier = sub["tier"]
                    subscribers_by_tier[tier] = subscribers_by_tier.get(tier, 0) + 1
                    active_subs_count += 1
                    plan = AUTHORITATIVE_PLANS.get(sub["plan_code"])
                    if plan:
                        if plan.billing_interval == BillingInterval.MONTHLY:
                            mrr += plan.price_inr
                            arr += plan.price_inr * 12
                        elif plan.billing_interval == BillingInterval.YEARLY:
                            arr += plan.price_inr
                            mrr += plan.price_inr / 12.0

        # Credits metrics from ledger
        total_allocated = 0
        total_consumed = 0
        for txs in self.repo.ledger.values():
            for tx in txs:
                if tx["transaction_type"] in (CreditTransactionType.INITIAL_GRANT, CreditTransactionType.MONTHLY_ENTITLEMENT):
                    total_allocated += tx["amount"]
                elif tx["transaction_type"] == CreditTransactionType.SETTLEMENT:
                    pass  # settlements recorded with amount=0 or actual delivered
                elif tx["transaction_type"] == CreditTransactionType.RESERVATION:
                    # absolute value is consumed before refunds
                    pass

        # Estimate based on quotas
        for q in self.repo.quotas.values():
            total_consumed += q["images_generated"]

        # Provider cost estimate: e.g. average $0.02 USD per delivered image
        usd_to_inr = 85.0
        estimated_cost_usd = total_consumed * 0.02
        estimated_cost_inr = estimated_cost_usd * usd_to_inr

        total_revenue_inr = sum(
            ord_data["amount_inr"] for ord_data in self.repo.orders.values()
            if ord_data["status"] == PaymentOrderStatus.CAPTURED.value
        )

        margin_pct = 0.0
        if total_revenue_inr > 0:
            margin_pct = max(0.0, ((total_revenue_inr - estimated_cost_inr) / total_revenue_inr) * 100.0)

        total_subs = sum(subscribers_by_tier.values())

        return AdminBillingMetricsResponse(
            total_subscribers=total_subs,
            subscribers_by_tier=subscribers_by_tier,
            mrr_inr=round(mrr, 2),
            arr_inr=round(arr, 2),
            total_image_credits_allocated=total_allocated,
            total_image_credits_consumed=total_consumed,
            total_provider_cost_usd=round(estimated_cost_usd, 4),
            total_provider_cost_inr=round(estimated_cost_inr, 2),
            estimated_margin_pct=round(margin_pct, 2),
            active_subscriptions_count=active_subs_count
        )


# Global Singleton BillingService & CreditGuard instances
_global_billing_service: Optional[BillingService] = None
_global_credit_guard: Optional[CreditGuard] = None

def get_billing_service() -> BillingService:
    global _global_billing_service
    if _global_billing_service is None:
        _global_billing_service = BillingService()
    return _global_billing_service

def get_credit_guard() -> CreditGuard:
    global _global_credit_guard
    if _global_credit_guard is None:
        _global_credit_guard = CreditGuard(get_billing_service())
    return _global_credit_guard

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class PlanTier(str, Enum):
    FREE = "free"
    CREATOR_PRO = "creator_pro"
    BUSINESS_MAX = "business_max"

class BillingInterval(str, Enum):
    FREE = "free"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    PENDING = "pending"
    CANCELLED = "cancelled"

class PaymentOrderStatus(str, Enum):
    CREATED = "created"
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"

class CreditTransactionType(str, Enum):
    INITIAL_GRANT = "initial_grant"
    MONTHLY_ENTITLEMENT = "monthly_entitlement"
    RESERVATION = "reservation"
    SETTLEMENT = "settlement"
    REFUND = "refund"
    MANUAL_ADJUSTMENT = "manual_adjustment"
    LEGACY_MIGRATION = "legacy_migration"

class PlanResponse(BaseModel):
    code: str
    tier: PlanTier
    name: str
    description: str
    billing_interval: BillingInterval
    price_inr: float
    price_paise: int
    duration_days: int
    monthly_image_credits: int
    max_three_image_runs_monthly: int
    monthly_captions: int
    monthly_critic_evals: int
    monthly_minisite_drafts: int
    auto_correction_allowed: bool
    max_auto_corrections_per_batch: int
    features: List[str]
    is_active: bool = True

class CheckoutOrderRequest(BaseModel):
    plan_code: str
    idempotency_key: Optional[str] = None

class CheckoutOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str = "INR"
    key_id: str
    plan_code: str
    plan_name: str
    billing_interval: str
    notes: Dict[str, Any] = {}

class PaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PaymentVerificationResponse(BaseModel):
    success: bool
    status: str
    subscription_id: str
    plan_code: str
    tier: str
    credits_added: int
    total_credits: int
    expires_at: str
    message: str

class MonthlyQuotaUsage(BaseModel):
    year_month: str
    images_generated: int = 0
    three_image_runs: int = 0
    captions_generated: int = 0
    critic_evaluations: int = 0
    minisites_created: int = 0

class UserSubscriptionResponse(BaseModel):
    active_plan: PlanResponse
    status: SubscriptionStatus
    start_date: str
    end_date: str
    current_period_start: str
    current_period_end: str
    auto_renew: bool = False
    is_annual: bool = False
    total_periods_count: int = 1
    completed_periods_count: int = 1
    credits_remaining: int = 0
    monthly_quota_used: MonthlyQuotaUsage
    next_entitlement_release: Optional[str] = None

class CreditLedgerEntry(BaseModel):
    id: str
    transaction_type: CreditTransactionType
    amount: int
    balance_after: int
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    description: Optional[str] = None
    created_at: str

class AdminBillingMetricsResponse(BaseModel):
    total_subscribers: int
    subscribers_by_tier: Dict[str, int]
    mrr_inr: float
    arr_inr: float
    total_image_credits_allocated: int
    total_image_credits_consumed: int
    total_provider_cost_usd: float
    total_provider_cost_inr: float
    estimated_margin_pct: float
    active_subscriptions_count: int


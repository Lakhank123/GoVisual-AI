import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.auth import get_current_user
from payments.schemas import (
    PlanResponse,
    CheckoutOrderRequest,
    CheckoutOrderResponse,
    PaymentVerificationRequest,
    PaymentVerificationResponse,
    UserSubscriptionResponse,
    AdminBillingMetricsResponse,
)
from payments.service import get_billing_service, BillingService

logger = logging.getLogger("GoVisual.BillingRoutes")

router = APIRouter(prefix="/api/billing", tags=["billing"])
security = HTTPBearer(auto_error=False)

def extract_user_id(user: Any) -> str:
    """Extracts a string UUID user ID from Supabase user object or dict."""
    if hasattr(user, "id"):
        return str(user.id)
    if isinstance(user, dict):
        return str(user.get("id") or user.get("sub") or "00000000-0000-0000-0000-000000000000")
    return str(user)

def require_admin_user(user: Any = Depends(get_current_user)) -> Any:
    """Server-side verification of admin privileges."""
    email = getattr(user, "email", None) or (user.get("email") if isinstance(user, dict) else "")
    app_meta = getattr(user, "app_metadata", {}) or (user.get("app_metadata", {}) if isinstance(user, dict) else {})
    role = app_meta.get("role") if isinstance(app_meta, dict) else getattr(user, "role", None)

    admin_emails = [e.strip() for e in os.getenv("ADMIN_EMAILS", "admin@govisual.ai").split(",") if e.strip()]
    
    is_admin = (email in admin_emails) or (role in ("admin", "service_role"))

    # In local testing/mock mode, allow if TEST_ADMIN_MODE=true or user_id has admin tag
    if not is_admin:
        if os.getenv("TEST_ADMIN_MODE", "false").lower() == "true":
            return user
        raise HTTPException(status_code=403, detail="Admin authorization required to access billing metrics.")

    return user

@router.get("/plans", response_model=List[PlanResponse])
def get_plans(billing_svc: BillingService = Depends(get_billing_service)):
    """
    Returns public catalog of active commercial and free plans with authoritative pricing.
    """
    return billing_svc.get_plans()

@router.get("/subscription", response_model=UserSubscriptionResponse)
def get_user_subscription(
    user: Any = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Returns authenticated user's current subscription, credit balance, and monthly quotas.
    """
    user_id = extract_user_id(user)
    return billing_svc.get_user_subscription(user_id)

@router.post("/checkout/create-order", response_model=CheckoutOrderResponse)
def create_checkout_order(
    request: CheckoutOrderRequest,
    user: Any = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Creates an authoritative payment order for the requested plan.
    Enforces server-side price calculation in paise.
    """
    user_id = extract_user_id(user)
    return billing_svc.create_checkout_order(
        user_id=user_id,
        plan_code=request.plan_code,
        idempotency_key=request.idempotency_key
    )
    try:
        return billing_svc.create_checkout_order(
            user_id=user_id,
            plan_code=request.plan_code,
            idempotency_key=request.idempotency_key
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create checkout order for user {user_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Payment Gateway Error: {e}")

@router.post("/checkout/verify-payment", response_model=PaymentVerificationResponse)
def verify_payment(
    request: PaymentVerificationRequest,
    user: Any = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Verifies Razorpay HMAC signature and activates subscription entitlements.
    Safe against replay attacks and double submissions.
    """
    user_id = extract_user_id(user)
    return billing_svc.verify_and_activate_payment(
        user_id=user_id,
        razorpay_order_id=request.razorpay_order_id,
        razorpay_payment_id=request.razorpay_payment_id,
        razorpay_signature=request.razorpay_signature
    )
    try:
        return billing_svc.verify_and_activate_payment(
            user_id=user_id,
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify payment for user {user_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Payment Verification Error: {e}")

@router.get("/order-status/{order_id}")
def get_order_status(
    order_id: str,
    user: Any = Depends(get_current_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Checks the status of a payment order for polling during pending checkout.
    """
    user_id = extract_user_id(user)
    order = billing_svc.repo.orders.get(order_id)
    if not order or order["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Order not found.")
    return {
        "order_id": order["razorpay_order_id"],
        "status": order["status"],
        "plan_code": order["plan_code"],
        "amount_paise": order["amount_paise"],
        "updated_at": order["updated_at"]
    }

@router.get("/admin/metrics", response_model=AdminBillingMetricsResponse)
def get_admin_metrics(
    admin_user: Any = Depends(require_admin_user),
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Secured SaaS analytics endpoint: MRR, ARR, active subscribers, margins, and credit burn rate.
    """
    return billing_svc.get_admin_metrics()


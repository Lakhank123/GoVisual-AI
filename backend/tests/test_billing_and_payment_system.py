import sys
import os

# Ensure backend and workspace root are in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

import pytest
import json
import hmac
import hashlib
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from routes.billing_routes import router as billing_router
from routes.webhook_routes import router as webhook_router
from payments.schemas import (
    PlanTier,
    BillingInterval,
    SubscriptionStatus,
    PaymentOrderStatus,
    CreditTransactionType,
)
from payments.service import (
    BillingService,
    BillingRepository,
    AUTHORITATIVE_PLANS,
    get_billing_service,
    get_credit_guard,
)
from payments.credit_guard import CreditGuard
from payments.mock_gateway import MockPaymentGateway
from payments.factory import PaymentGatewayFactory
from services.auth import get_current_user

# Test User Fixtures
TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
TEST_ADMIN_ID = "00000000-0000-0000-0000-000000000002"

class DummyUser:
    def __init__(self, id, email, role="authenticated"):
        self.id = id
        self.email = email
        self.role = role
        self.app_metadata = {"role": role}

@pytest.fixture
def mock_repo():
    return BillingRepository()

@pytest.fixture
def mock_gw():
    return MockPaymentGateway(
        key_id="rzp_test_key123",
        key_secret="test_secret_abc",
        webhook_secret="test_webhook_sec_xyz"
    )

@pytest.fixture
def billing_svc(mock_gw, mock_repo):
    return BillingService(gateway=mock_gw, repo=mock_repo)

@pytest.fixture
def credit_guard(billing_svc):
    return CreditGuard(billing_svc)

@pytest.fixture
def test_client(billing_svc):
    test_app = FastAPI()
    test_app.include_router(billing_router)
    test_app.include_router(webhook_router)

    def override_get_current_user():
        return DummyUser(id=TEST_USER_ID, email="testuser@example.com")

    def override_get_billing_svc():
        return billing_svc

    test_app.dependency_overrides[get_current_user] = override_get_current_user
    test_app.dependency_overrides[get_billing_service] = override_get_billing_svc

    return TestClient(test_app)


# =========================================================================
# TEST SUITE: 28 SaaS Billing & Razorpay Specifications
# =========================================================================

# 1. Public plans listing returns all 5 plans with correct pricing & features
def test_01_public_plans_catalog(billing_svc):
    from routes.billing_routes import get_plans
    plans = get_plans(billing_svc=billing_svc)
    assert len(plans) == 5
    codes = [p.code for p in plans]
    assert "free_monthly" in codes
    assert "creator_pro_monthly" in codes
    assert "creator_pro_yearly" in codes
    assert "business_max_monthly" in codes
    assert "business_max_yearly" in codes

# 2. Checkout order generation produces proper amounts in paise
def test_02_checkout_order_amounts(billing_svc):
    order_cp_m = billing_svc.create_checkout_order(TEST_USER_ID, "creator_pro_monthly")
    assert order_cp_m.amount == 69900  # ₹699 in paise
    assert order_cp_m.currency == "INR"

    order_cp_y = billing_svc.create_checkout_order(TEST_USER_ID, "creator_pro_yearly")
    assert order_cp_y.amount == 699000  # ₹6,990 in paise

    order_bm_m = billing_svc.create_checkout_order(TEST_USER_ID, "business_max_monthly")
    assert order_bm_m.amount == 149900  # ₹1,499 in paise

    order_bm_y = billing_svc.create_checkout_order(TEST_USER_ID, "business_max_yearly")
    assert order_bm_y.amount == 1499000  # ₹14,990 in paise

# 3. Server-side authoritative pricing rejects free plan checkout or invalid plan
def test_03_free_plan_checkout_rejected(billing_svc):
    with pytest.raises(HTTPException) as exc_info:
        billing_svc.create_checkout_order(TEST_USER_ID, "free_monthly")
    assert exc_info.value.status_code == 400

# 4. Idempotency key prevents duplicate orders
def test_04_checkout_order_idempotency(billing_svc):
    idem_key = "idemp_test_key_12345"
    order1 = billing_svc.create_checkout_order(TEST_USER_ID, "creator_pro_monthly", idempotency_key=idem_key)
    order2 = billing_svc.create_checkout_order(TEST_USER_ID, "creator_pro_monthly", idempotency_key=idem_key)
    assert order1.order_id == order2.order_id

# 5. Mock payment verification validates valid signatures
def test_05_mock_payment_verification_success(billing_svc, mock_gw):
    order = billing_svc.create_checkout_order(TEST_USER_ID, "creator_pro_monthly")
    payment_id = "pay_mock_success_001"
    sig = mock_gw.compute_mock_signature(order.order_id, payment_id)

    res = billing_svc.verify_and_activate_payment(
        user_id=TEST_USER_ID,
        razorpay_order_id=order.order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=sig
    )
    assert res.success is True
    assert res.status == "captured"
    assert res.plan_code == "creator_pro_monthly"
    assert res.tier == "creator_pro"
    assert res.credits_added == 24

# 6. Mock payment verification rejects invalid/forged signatures
def test_06_mock_payment_verification_forged_sig(billing_svc):
    order = billing_svc.create_checkout_order(TEST_USER_ID, "creator_pro_monthly")
    with pytest.raises(HTTPException) as exc_info:
        billing_svc.verify_and_activate_payment(
            user_id=TEST_USER_ID,
            razorpay_order_id=order.order_id,
            razorpay_payment_id="pay_fake_001",
            razorpay_signature="forged_signature_hex_invalid"
        )
    assert exc_info.value.status_code == 400
    assert "Invalid payment signature" in exc_info.value.detail

# 7. Payment activation sets subscription to active (30 days for monthly, 365 for annual)
def test_07_subscription_duration_calculation(billing_svc, mock_gw):
    # Monthly
    ord_m = billing_svc.create_checkout_order(TEST_USER_ID, "creator_pro_monthly")
    sig_m = mock_gw.compute_mock_signature(ord_m.order_id, "pay_m_01")
    billing_svc.verify_and_activate_payment(TEST_USER_ID, ord_m.order_id, "pay_m_01", sig_m)
    sub_m = billing_svc.get_user_subscription(TEST_USER_ID)
    assert sub_m.status == SubscriptionStatus.ACTIVE
    assert sub_m.is_annual is False

    # Yearly
    user_yearly_id = "00000000-0000-0000-0000-000000000009"
    ord_y = billing_svc.create_checkout_order(user_yearly_id, "business_max_yearly")
    sig_y = mock_gw.compute_mock_signature(ord_y.order_id, "pay_y_01")
    billing_svc.verify_and_activate_payment(user_yearly_id, ord_y.order_id, "pay_y_01", sig_y)
    sub_y = billing_svc.get_user_subscription(user_yearly_id)
    assert sub_y.status == SubscriptionStatus.ACTIVE
    assert sub_y.is_annual is True
    assert sub_y.total_periods_count == 12

# 8. First month credits are immediately allocated
def test_08_first_month_credits_immediate_allocation(billing_svc, mock_gw):
    user_id = "00000000-0000-0000-0000-000000000008"
    initial_credits = billing_svc.get_user_credits(user_id)  # Starts at 6 (Free)
    assert initial_credits == 6

    ord = billing_svc.create_checkout_order(user_id, "creator_pro_monthly")
    sig = mock_gw.compute_mock_signature(ord.order_id, "pay_08")
    billing_svc.verify_and_activate_payment(user_id, ord.order_id, "pay_08", sig)

    new_credits = billing_svc.get_user_credits(user_id)
    assert new_credits == 6 + 24  # 30

# 9. Annual plans schedule 12 monthly releases (NEVER 288 or 720 upfront)
def test_09_annual_plan_never_releases_all_credits_upfront(billing_svc, mock_gw):
    user_id = "00000000-0000-0000-0000-000000000009"
    initial_credits = billing_svc.get_user_credits(user_id)  # 6
    ord = billing_svc.create_checkout_order(user_id, "creator_pro_yearly")
    sig = mock_gw.compute_mock_signature(ord.order_id, "pay_09")
    billing_svc.verify_and_activate_payment(user_id, ord.order_id, "pay_09", sig)

    # Balance must receive ONLY month 1 allocation (24 credits), NEVER 288!
    balance_after = billing_svc.get_user_credits(user_id)
    assert balance_after == initial_credits + 24
    assert balance_after != initial_credits + 288

    # Entitlements schedule must have 12 records, 1 released, 11 pending
    entitlements = billing_svc.repo.entitlements[user_id]
    assert len(entitlements) == 12
    assert entitlements[0]["is_released"] is True
    for i in range(1, 12):
        assert entitlements[i]["is_released"] is False

# 10. Atomic credit reservation decrements balance
def test_10_atomic_credit_reservation(billing_svc):
    user_id = "00000000-0000-0000-0000-000000000010"
    billing_svc.repo.get_or_create_user(user_id)  # has 6 credits
    bal_after = billing_svc.reserve_credits(user_id, 3, "run_10")
    assert bal_after == 3
    assert billing_svc.get_user_credits(user_id) == 3

# 11. Insufficient credits aborts generation with HTTP 402
def test_11_insufficient_credits_aborts(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000011"
    user = billing_svc.repo.get_or_create_user(user_id)
    user["credits_remaining"] = 1  # only 1 left

    with pytest.raises(HTTPException) as exc_info:
        credit_guard.verify_generation_eligibility(user_id, requested_images_count=3)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "INSUFFICIENT_CREDITS"

# 12. Settle delivered images charges 1 credit per delivered image
def test_12_settle_delivered_images(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000012"
    billing_svc.repo.get_or_create_user(user_id)  # 6 credits
    credit_guard.reserve_generation_credits(user_id, 3, "run_12")  # 3 remaining
    # Settle all 3 delivered
    final_bal = credit_guard.settle_generation(user_id, reserved_amount=3, delivered_amount=3, run_id="run_12")
    assert final_bal == 3

# 13. Failed generations refund reserved credits
def test_13_failed_generations_refund(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000013"
    billing_svc.repo.get_or_create_user(user_id)  # 6 credits
    credit_guard.reserve_generation_credits(user_id, 3, "run_13")  # 3 remaining
    # If 1 delivered and 2 failed, refund 2
    final_bal = credit_guard.settle_generation(user_id, reserved_amount=3, delivered_amount=1, run_id="run_13")
    assert final_bal == 5  # 3 + 2 refunded

# 14. Free tier max 2 runs of 3 images per month enforced
def test_14_free_tier_max_two_runs_limit(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000014"
    billing_svc.repo.get_or_create_user(user_id)

    # First run allowed
    credit_guard.verify_generation_eligibility(user_id, 3)
    billing_svc.increment_monthly_quota(user_id, runs_delta=1)

    # Second run allowed
    credit_guard.verify_generation_eligibility(user_id, 3)
    billing_svc.increment_monthly_quota(user_id, runs_delta=1)

    # Third run must be rejected with 402
    with pytest.raises(HTTPException) as exc_info:
        credit_guard.verify_generation_eligibility(user_id, 3)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "MONTHLY_RUN_LIMIT_EXCEEDED"

# 15. Free tier auto-correction blocked with HTTP 402
def test_15_free_tier_auto_correction_blocked(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000015"
    billing_svc.repo.get_or_create_user(user_id)  # Free tier

    with pytest.raises(HTTPException) as exc_info:
        credit_guard.verify_generation_eligibility(user_id, 3, auto_correction_requested=True)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "FEATURE_LOCKED"

# 16. Creator Pro and Business Max allow auto-correction
def test_16_paid_tiers_allow_auto_correction(credit_guard, billing_svc, mock_gw):
    user_id = "00000000-0000-0000-0000-000000000016"
    ord = billing_svc.create_checkout_order(user_id, "creator_pro_monthly")
    sig = mock_gw.compute_mock_signature(ord.order_id, "pay_16")
    billing_svc.verify_and_activate_payment(user_id, ord.order_id, "pay_16", sig)

    # Now on Creator Pro, auto-correction must pass
    res = credit_guard.verify_generation_eligibility(user_id, 3, auto_correction_requested=True)
    assert res["eligible"] is True
    assert res["tier"] == "creator_pro"

# 17. Captions quota limit enforced
def test_17_caption_quota_enforced(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000017"
    billing_svc.repo.get_or_create_user(user_id)  # Free has 10 captions limit

    for _ in range(10):
        credit_guard.check_and_consume_caption(user_id)

    with pytest.raises(HTTPException) as exc_info:
        credit_guard.check_and_consume_caption(user_id)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "CAPTION_LIMIT_EXCEEDED"

# 18. Critic evaluations quota limit enforced
def test_18_critic_quota_enforced(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000018"
    billing_svc.repo.get_or_create_user(user_id)  # Free has 2 critic limit

    credit_guard.check_and_consume_critic(user_id)
    credit_guard.check_and_consume_critic(user_id)

    with pytest.raises(HTTPException) as exc_info:
        credit_guard.check_and_consume_critic(user_id)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "CRITIC_LIMIT_EXCEEDED"

# 19. MiniSite drafts quota limit enforced
def test_19_minisite_quota_enforced(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000019"
    billing_svc.repo.get_or_create_user(user_id)  # Free has 1 minisite limit

    credit_guard.check_and_consume_minisite(user_id)

    with pytest.raises(HTTPException) as exc_info:
        credit_guard.check_and_consume_minisite(user_id)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "MINISITE_LIMIT_EXCEEDED"

# 20. Webhook HMAC verification succeeds with correct secret
def test_20_webhook_hmac_success(billing_svc, mock_gw):
    payload = {"event": "payment.captured", "id": "evt_test_020", "payload": {}}
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = hmac.new(b"test_webhook_sec_xyz", body_bytes, hashlib.sha256).hexdigest()

    res = billing_svc.process_webhook_event(body_bytes, sig)
    assert res["status"] == "success"

# 21. Webhook HMAC verification fails with bad secret
def test_21_webhook_hmac_bad_secret(billing_svc):
    payload = {"event": "payment.captured", "id": "evt_test_021"}
    body_bytes = json.dumps(payload).encode("utf-8")

    with pytest.raises(HTTPException) as exc_info:
        billing_svc.process_webhook_event(body_bytes, "invalid_webhook_signature_hex")
    assert exc_info.value.status_code == 400

# 22. Webhook order.paid activates subscription
def test_22_webhook_order_paid_activates(billing_svc, mock_gw):
    user_id = "00000000-0000-0000-0000-000000000022"
    order = billing_svc.create_checkout_order(user_id, "creator_pro_monthly")

    payload = {
        "event": "order.paid",
        "id": "evt_order_paid_022",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook_022",
                    "order_id": order.order_id,
                    "notes": {"user_id": user_id}
                }
            }
        }
    }
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = hmac.new(b"test_webhook_sec_xyz", body_bytes, hashlib.sha256).hexdigest()

    res = billing_svc.process_webhook_event(body_bytes, sig)
    assert res["status"] == "success"

    # User subscription must now be active
    sub = billing_svc.get_user_subscription(user_id)
    assert sub.status == SubscriptionStatus.ACTIVE
    assert sub.active_plan.tier == PlanTier.CREATOR_PRO

# 23. Webhook double-delivery does not double-credit (idempotency)
def test_23_webhook_double_delivery_idempotent(billing_svc, mock_gw):
    user_id = "00000000-0000-0000-0000-000000000023"
    order = billing_svc.create_checkout_order(user_id, "creator_pro_monthly")

    payload = {
        "event": "payment.captured",
        "id": "evt_double_delivery_023",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_double_023",
                    "order_id": order.order_id,
                    "notes": {"user_id": user_id}
                }
            }
        }
    }
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = hmac.new(b"test_webhook_sec_xyz", body_bytes, hashlib.sha256).hexdigest()

    # Delivery 1
    res1 = billing_svc.process_webhook_event(body_bytes, sig)
    credits_after_first = billing_svc.get_user_credits(user_id)

    # Delivery 2 (Duplicate)
    res2 = billing_svc.process_webhook_event(body_bytes, sig)
    credits_after_second = billing_svc.get_user_credits(user_id)

    assert res2["message"] == "Event already processed"
    assert credits_after_first == credits_after_second  # No double credits!

# 24. Annual entitlement release job releases mature periods
def test_24_annual_entitlement_release_job(billing_svc, mock_gw):
    from datetime import datetime, timedelta, timezone
    kolkata_tz = timezone(timedelta(hours=5, minutes=30))

    user_id = "00000000-0000-0000-0000-000000000024"
    ord = billing_svc.create_checkout_order(user_id, "creator_pro_yearly")
    sig = mock_gw.compute_mock_signature(ord.order_id, "pay_24")
    billing_svc.verify_and_activate_payment(user_id, ord.order_id, "pay_24", sig)

    # Fast forward period 2 start_date to the past to simulate month 2 arrival
    entitlements = billing_svc.repo.entitlements[user_id]
    entitlements[1]["period_start"] = (datetime.now(kolkata_tz) - timedelta(days=1)).isoformat()

    bal_before = billing_svc.get_user_credits(user_id)
    released = billing_svc.release_due_entitlements()
    assert released >= 1
    bal_after = billing_svc.get_user_credits(user_id)
    assert bal_after == bal_before + 24
    assert entitlements[1]["is_released"] is True

# 25. Admin metrics calculates accurate MRR, ARR, active subscriber counts, margins
def test_25_admin_metrics_calculation(billing_svc, mock_gw):
    # Setup 1 Creator Pro Monthly subscriber
    u1 = "00000000-0000-0000-0000-000000000025_1"
    ord1 = billing_svc.create_checkout_order(u1, "creator_pro_monthly")
    sig1 = mock_gw.compute_mock_signature(ord1.order_id, "pay_25_1")
    billing_svc.verify_and_activate_payment(u1, ord1.order_id, "pay_25_1", sig1)

    # Setup 1 Business Max Yearly subscriber
    u2 = "00000000-0000-0000-0000-000000000025_2"
    ord2 = billing_svc.create_checkout_order(u2, "business_max_yearly")
    sig2 = mock_gw.compute_mock_signature(ord2.order_id, "pay_25_2")
    billing_svc.verify_and_activate_payment(u2, ord2.order_id, "pay_25_2", sig2)

    metrics = billing_svc.get_admin_metrics()
    assert metrics.active_subscriptions_count >= 2
    assert metrics.subscribers_by_tier["creator_pro"] >= 1
    assert metrics.subscribers_by_tier["business_max"] >= 1
    # MRR = 699 + (14990 / 12) = 699 + 1249.17 = 1948.17
    assert metrics.mrr_inr >= 1900.0
    # ARR = 699 * 12 + 14990 = 8388 + 14990 = 23378.0
    assert metrics.arr_inr >= 23000.0

# 26. Non-admin access to admin metrics blocked with HTTP 403
def test_26_admin_endpoint_forbidden_for_regular_users():
    from routes.billing_routes import require_admin_user
    regular_user = DummyUser(id=TEST_USER_ID, email="regular@example.com", role="authenticated")
    with pytest.raises(HTTPException) as exc_info:
        require_admin_user(user=regular_user)
    assert exc_info.value.status_code == 403
    assert "Admin authorization required" in exc_info.value.detail

# 27. Payment gateway factory raises error if live/test mode lacks Razorpay keys
def test_27_factory_missing_keys_raises_error(monkeypatch):
    monkeypatch.setenv("PAYMENT_GATEWAY_MODE", "live")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)

    with pytest.raises(ValueError) as exc_info:
        PaymentGatewayFactory.get_gateway(force_mode="live")
    assert "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured" in str(exc_info.value)

# 28. Payment gateway factory returns MockPaymentGateway in mock mode
def test_28_factory_returns_mock_in_mock_mode(monkeypatch):
    monkeypatch.setenv("PAYMENT_GATEWAY_MODE", "mock")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)
    gw = PaymentGatewayFactory.get_gateway(force_mode="mock")
    assert isinstance(gw, MockPaymentGateway)
    assert gw.key_id == "rzp_mock_govisual_key"

# 29. Shared Credit Balance: Studio V2 and Product Photoshoot deduct from the same pool
def test_29_shared_credit_balance_between_studio_and_photoshoot(credit_guard, billing_svc):
    user_id = "00000000-0000-0000-0000-000000000029"
    # User starts with 6 free starter credits
    initial_credits = billing_svc.get_user_credits(user_id)
    assert initial_credits == 6

    # 1. Creative Studio V2 reserves and settles 3 images
    run_studio_id = "gen_studio_029"
    credit_guard.reserve_generation_credits(user_id, 3, run_studio_id)
    assert billing_svc.get_user_credits(user_id) == 3
    credit_guard.settle_generation(user_id, reserved_amount=3, delivered_amount=3, run_id=run_studio_id)
    assert billing_svc.get_user_credits(user_id) == 3

    # 2. Product Photoshoot uses the SAME user and reserves 3 images
    run_shoot_id = "shoot_029"
    credit_guard.reserve_generation_credits(user_id, 3, run_shoot_id)
    assert billing_svc.get_user_credits(user_id) == 0

    # Photoshoot delivers 2 successful images and 1 fails -> refunds 1 credit
    bal_after = credit_guard.settle_generation(user_id, reserved_amount=3, delivered_amount=2, run_id=run_shoot_id)
    assert bal_after == 1
    assert billing_svc.get_user_credits(user_id) == 1

    # 3. Next photoshoot generation needs 3 credits but only 1 remains and 2 runs done -> blocked with 402
    with pytest.raises(HTTPException) as exc_info:
        credit_guard.verify_generation_eligibility(user_id, requested_images_count=3)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] in ("INSUFFICIENT_CREDITS", "MONTHLY_RUN_LIMIT_EXCEEDED")

# 30. Anniversary entitlement dates and leap year month-end calculations
def test_30_anniversary_entitlement_dates_and_leap_year():
    from datetime import datetime
    from payments.service import calculate_calendar_anniversary

    # Case A: Nov 20 purchase -> preserves day 20 across all 12 calendar months
    dt_nov20 = datetime(2026, 11, 20, 10, 0)
    for m in range(1, 13):
        anniversary_dt = calculate_calendar_anniversary(dt_nov20, m, 20)
        assert anniversary_dt.day == 20

    # Period 12 must be exact anniversary 1 year later (Nov 20, 2027)
    assert calculate_calendar_anniversary(dt_nov20, 12, 20).year == 2027
    assert calculate_calendar_anniversary(dt_nov20, 12, 20).month == 11
    assert calculate_calendar_anniversary(dt_nov20, 12, 20).day == 20

    # Case B: Jan 31 purchase in leap year (2028) -> clamps Feb to 29, Mar to 31
    dt_jan31_leap = datetime(2028, 1, 31, 10, 0)
    feb_anniversary = calculate_calendar_anniversary(dt_jan31_leap, 1, 31)
    assert feb_anniversary.month == 2
    assert feb_anniversary.day == 29

    mar_anniversary = calculate_calendar_anniversary(dt_jan31_leap, 2, 31)
    assert mar_anniversary.month == 3
    assert mar_anniversary.day == 31

    # Case C: Jan 31 purchase in non-leap year (2027) -> clamps Feb to 28
    dt_jan31_nonleap = datetime(2027, 1, 31, 10, 0)
    feb_nonleap = calculate_calendar_anniversary(dt_jan31_nonleap, 1, 31)
    assert feb_nonleap.month == 2
    assert feb_nonleap.day == 28

# 31. Cross-event Webhook Idempotency: order.paid + payment.captured for same payment
def test_31_cross_event_webhook_idempotency_order_paid_and_payment_captured(billing_svc):
    user_id = "00000000-0000-0000-0000-000000000031"
    order = billing_svc.create_checkout_order(user_id, "creator_pro_monthly")
    payment_id = "pay_cross_event_031"

    # Step 1: Incoming order.paid event arrives
    evt1_payload = {
        "event": "order.paid",
        "id": "evt_order_paid_031",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order.order_id,
                    "notes": {"user_id": user_id}
                }
            }
        }
    }
    body1 = json.dumps(evt1_payload).encode("utf-8")
    sig1 = hmac.new(b"test_webhook_sec_xyz", body1, hashlib.sha256).hexdigest()

    res1 = billing_svc.process_webhook_event(body1, sig1)
    assert res1["status"] == "success"
    credits_after_evt1 = billing_svc.get_user_credits(user_id)  # 6 + 24 = 30
    assert credits_after_evt1 == 30

    # Step 2: Razorpay duplicate of order.paid arrives with same event_id
    res1_dup = billing_svc.process_webhook_event(body1, sig1)
    assert res1_dup["message"] == "Event already processed"
    assert billing_svc.get_user_credits(user_id) == 30

    # Step 3: Razorpay payment.captured arrives later with different event_id for same order & payment
    evt2_payload = {
        "event": "payment.captured",
        "id": "evt_payment_captured_031",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order.order_id,
                    "notes": {"user_id": user_id}
                }
            }
        }
    }
    body2 = json.dumps(evt2_payload).encode("utf-8")
    sig2 = hmac.new(b"test_webhook_sec_xyz", body2, hashlib.sha256).hexdigest()

    res2 = billing_svc.process_webhook_event(body2, sig2)
    # Must be intercepted by payment-level/order-level idempotency!
    credits_after_evt2 = billing_svc.get_user_credits(user_id)
    assert credits_after_evt2 == 30  # Exactly 30, NEVER 54!

    # Step 4: Duplicate payment.captured arrives
    res2_dup = billing_svc.process_webhook_event(body2, sig2)
    assert res2_dup["message"] == "Event already processed"
    assert billing_svc.get_user_credits(user_id) == 30

# 32. Webhook payment.authorized stays pending and payment.failed rejects activation
def test_32_webhook_payment_authorized_and_failed_states(billing_svc):
    user_id = "00000000-0000-0000-0000-000000000032"
    order = billing_svc.create_checkout_order(user_id, "creator_pro_monthly")
    payment_id = "pay_auth_032"

    # 1. payment.authorized event arrives (authorized but not yet captured)
    evt_auth = {
        "event": "payment.authorized",
        "id": "evt_auth_032",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order.order_id,
                    "notes": {"user_id": user_id}
                }
            }
        }
    }
    body_auth = json.dumps(evt_auth).encode("utf-8")
    sig_auth = hmac.new(b"test_webhook_sec_xyz", body_auth, hashlib.sha256).hexdigest()

    res_auth = billing_svc.process_webhook_event(body_auth, sig_auth)
    assert res_auth["status"] == "success"

    # Order must be authorized, but subscription must NOT be active
    ord_rec = billing_svc.repo.orders[order.order_id]
    assert ord_rec["status"] == PaymentOrderStatus.AUTHORIZED.value
    sub = billing_svc.get_user_subscription(user_id)
    assert sub.active_plan.tier == PlanTier.FREE  # Still on Free starter

    # 2. payment.failed event arrives
    evt_fail = {
        "event": "payment.failed",
        "id": "evt_fail_032",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order.order_id,
                    "notes": {"user_id": user_id}
                }
            }
        }
    }
    body_fail = json.dumps(evt_fail).encode("utf-8")
    sig_fail = hmac.new(b"test_webhook_sec_xyz", body_fail, hashlib.sha256).hexdigest()

    res_fail = billing_svc.process_webhook_event(body_fail, sig_fail)
    assert res_fail["status"] == "success"
    assert ord_rec["status"] == PaymentOrderStatus.FAILED.value
    assert billing_svc.get_user_credits(user_id) == 6  # Credits never granted


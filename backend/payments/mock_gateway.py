import hmac
import hashlib
import uuid
from typing import Dict, Any, Optional
from payments.base import PaymentGateway

class MockPaymentGateway(PaymentGateway):
    """
    Deterministic In-Memory / Test Payment Gateway.
    Allows hermetic test execution without calling Razorpay servers.
    """

    def __init__(self, key_id: str = "rzp_mock_govisual_key", key_secret: str = "mock_secret_key_12345", webhook_secret: str = "mock_webhook_secret_67890"):
        self._key_id = key_id
        self._key_secret = key_secret
        self._webhook_secret = webhook_secret
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.payments: Dict[str, Dict[str, Any]] = {}

    @property
    def key_id(self) -> str:
        return self._key_id

    def create_order(
        self,
        amount_paise: int,
        currency: str = "INR",
        receipt: str = "",
        notes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        order_obj = {
            "id": order_id,
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": currency,
            "receipt": receipt,
            "status": "created",
            "attempts": 0,
            "notes": notes or {},
            "created_at": 1730000000,
        }
        self.orders[order_id] = order_obj
        return order_obj

    def compute_mock_signature(self, order_id: str, payment_id: str) -> str:
        msg = f"{order_id}|{payment_id}"
        return hmac.new(self._key_secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
            return False
        # Also accept standard mock prefix for fast headless tests
        if razorpay_signature == f"mock_sig_{razorpay_payment_id}_{razorpay_order_id}":
            return True
        expected = self.compute_mock_signature(razorpay_order_id, razorpay_payment_id)
        return hmac.compare_digest(expected, razorpay_signature)

    def verify_webhook_signature(
        self,
        body_bytes: bytes,
        signature: str,
    ) -> bool:
        if not body_bytes or not signature:
            return False
        # If signature is "mock_webhook_bypass_sig", allow in test mode
        if signature == "mock_webhook_bypass_sig":
            return True
        expected = hmac.new(self._webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def fetch_payment(self, payment_id: str) -> Dict[str, Any]:
        if payment_id in self.payments:
            return self.payments[payment_id]
        return {
            "id": payment_id,
            "entity": "payment",
            "amount": 69900,
            "currency": "INR",
            "status": "captured",
            "method": "card",
            "captured": True,
            "description": "Mock payment capture",
        }


import os
import logging
from typing import Optional
from payments.base import PaymentGateway
from payments.mock_gateway import MockPaymentGateway
from payments.razorpay_gateway import RazorpayGateway

logger = logging.getLogger("GoVisual.PaymentGatewayFactory")

class PaymentGatewayFactory:
    """
    Factory for producing configured PaymentGateway instances.
    Strictly enforces environment configuration rules:
    - In 'live' or 'test' mode: requires valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.
    - If keys are missing in live/test mode, raises ValueError (never silently mocks).
    - In 'mock' mode: returns MockPaymentGateway.
    """

    _instance: Optional[PaymentGateway] = None

    @classmethod
    def get_gateway(cls, force_mode: Optional[str] = None) -> PaymentGateway:
        mode = force_mode or os.getenv("PAYMENT_GATEWAY_MODE", "mock").lower()

        if mode in ("live", "test"):
            key_id = os.getenv("RAZORPAY_KEY_ID")
            key_secret = os.getenv("RAZORPAY_KEY_SECRET")
            webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
            raw_key_id = os.getenv("RAZORPAY_KEY_ID", "").strip().strip('"').strip("'")
            # Defensive check: auto-strip accidental duplicate leading 'R' before 'rzp_'
            key_id = raw_key_id[1:] if raw_key_id.startswith("Rrzp_") else raw_key_id
            key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip().strip('"').strip("'")
            webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip().strip('"').strip("'")

            if not key_id or not key_secret:
                raise ValueError(
                    f"Invalid Payment Gateway Configuration: PAYMENT_GATEWAY_MODE is set to '{mode}', "
                    "but RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in the environment."
                )

            logger.info(f"Initialized RazorpayGateway in {mode.upper()} mode with Key ID: {key_id[:8]}***")
            return RazorpayGateway(key_id=key_id, key_secret=key_secret, webhook_secret=webhook_secret)

        elif mode == "mock":
            key_id = os.getenv("RAZORPAY_KEY_ID")
            if not key_id or key_id.startswith("REPLACE_"):
                key_id = "rzp_mock_govisual_key"
            key_secret = os.getenv("RAZORPAY_KEY_SECRET")
            if not key_secret or key_secret.startswith("REPLACE_"):
                key_secret = "mock_secret_key_12345"
            webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
            if not webhook_secret or webhook_secret.startswith("REPLACE_"):
                webhook_secret = "mock_webhook_secret_67890"
            logger.info("Initialized MockPaymentGateway for local development/testing.")
            return MockPaymentGateway(key_id=key_id, key_secret=key_secret, webhook_secret=webhook_secret)

        else:
            raise ValueError(f"Unsupported PAYMENT_GATEWAY_MODE: '{mode}'. Valid modes are 'live', 'test', 'mock'.")

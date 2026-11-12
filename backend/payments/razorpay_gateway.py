import razorpay
import logging
from typing import Dict, Any, Optional
from payments.base import PaymentGateway

logger = logging.getLogger("GoVisual.RazorpayGateway")

class RazorpayGateway(PaymentGateway):
    """
    Production & Staging Razorpay Integration using the official Razorpay SDK.
    """

    def __init__(self, key_id: str, key_secret: str, webhook_secret: Optional[str] = None):
        if not key_id or not key_secret:
            raise ValueError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for RazorpayGateway.")
        self._key_id = key_id
        self._key_secret = key_secret
        self._webhook_secret = webhook_secret or ""
        self.client = razorpay.Client(auth=(self._key_id, self._key_secret))

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
        data = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": receipt,
            "notes": notes or {},
            "payment_capture": 1  # Auto capture payment on authorization
        }
        try:
            order = self.client.order.create(data=data)
            return order
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {e}")
            raise RuntimeError(f"Razorpay order creation failed: {e}")

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        }
        try:
            self.client.utility.verify_payment_signature(params_dict)
            return True
        except razorpay.errors.SignatureVerificationError:
            logger.warning(f"Razorpay signature mismatch for order {razorpay_order_id}")
            return False
        except Exception as e:
            logger.error(f"Error during signature verification: {e}")
            return False

    def verify_webhook_signature(
        self,
        body_bytes: bytes,
        signature: str,
    ) -> bool:
        if not self._webhook_secret:
            logger.error("RAZORPAY_WEBHOOK_SECRET is not configured.")
            return False
        try:
            body_str = body_bytes.decode("utf-8")
            self.client.utility.verify_webhook_signature(
                body_str,
                signature,
                self._webhook_secret
            )
            return True
        except razorpay.errors.SignatureVerificationError:
            logger.warning("Webhook signature verification failed.")
            return False
        except Exception as e:
            logger.error(f"Webhook signature error: {e}")
            return False

    def fetch_payment(self, payment_id: str) -> Dict[str, Any]:
        try:
            return self.client.payment.fetch(payment_id)
        except Exception as e:
            logger.error(f"Error fetching payment {payment_id}: {e}")
            raise RuntimeError(f"Failed to fetch payment details: {e}")


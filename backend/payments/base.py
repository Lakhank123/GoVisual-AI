from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class PaymentGateway(ABC):
    """
    Abstract Payment Gateway Interface.
    Enforces unified contracts across Razorpay (Live/Test) and Mock implementations.
    """

    @abstractmethod
    def create_order(
        self,
        amount_paise: int,
        currency: str = "INR",
        receipt: str = "",
        notes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Creates an order with the payment gateway."""
        pass

    @abstractmethod
    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """Verifies HMAC signature returned after client checkout."""
        pass

    @abstractmethod
    def verify_webhook_signature(
        self,
        body_bytes: bytes,
        signature: str,
    ) -> bool:
        """Verifies Razorpay webhook X-Razorpay-Signature with raw request body."""
        pass

    @abstractmethod
    def fetch_payment(self, payment_id: str) -> Dict[str, Any]:
        """Retrieves payment details from gateway."""
        pass

    @property
    @abstractmethod
    def key_id(self) -> str:
        """Returns the public key id for frontend SDK checkout initialization."""
        pass


import logging
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from payments.service import get_billing_service, BillingService

logger = logging.getLogger("GoVisual.WebhookRoutes")

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    billing_svc: BillingService = Depends(get_billing_service)
):
    """
    Receives incoming webhook events directly from Razorpay.
    Verifies raw body HMAC-SHA256 signature and performs idempotent processing.
    """
    signature = request.headers.get("x-razorpay-signature")
    if not signature:
        logger.warning("Razorpay webhook rejected: missing 'x-razorpay-signature' header.")
        raise HTTPException(status_code=400, detail="Missing x-razorpay-signature header.")

    # Extract raw body bytes prior to any JSON parsing
    raw_body_bytes = await request.body()

    result = billing_svc.process_webhook_event(
        raw_body_bytes=raw_body_bytes,
        signature_header=signature
    )

    return result


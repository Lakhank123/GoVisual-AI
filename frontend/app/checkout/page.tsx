'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { Shield, ArrowLeft, CheckCircle2, AlertCircle, Loader2, CreditCard, Sparkles } from 'lucide-react'
import {
  fetchBillingPlans,
  createCheckoutOrder,
  verifyPayment,
  BillingPlan,
  CheckoutOrderResponse,
} from '@/lib/billingApi'

declare global {
  interface Window {
    Razorpay: any
  }
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') || 'creator_pro_monthly'

  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<CheckoutOrderResponse | null>(null)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const data = await fetchBillingPlans()
        setPlans(data)
        const match = data.find((p) => p.code === planParam) || data.find((p) => p.tier === 'creator_pro')
        setSelectedPlan(match || null)
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load plan details.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [planParam])

  const handleStartPayment = async () => {
    if (!selectedPlan) return
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      // 1. Create authoritative backend order
      const order = await createCheckoutOrder(selectedPlan.code)
      setOrderData(order)

      // 2. Check if we are in mock mode
      const isMock = order.key_id.startsWith('rzp_mock_')

      if (isMock || typeof window.Razorpay === 'undefined') {
        // Execute fast deterministic mock checkout flow
        const mockPaymentId = `pay_mock_${Date.now()}`
        const mockSig = `mock_sig_${mockPaymentId}_${order.order_id}`

        const verification = await verifyPayment({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSig,
        })

        if (verification.success) {
          router.push(
            `/payment/success?order_id=${encodeURIComponent(order.order_id)}&plan=${encodeURIComponent(
              selectedPlan.code
            )}&credits=${verification.credits_added}&total=${verification.total_credits}`
          )
          return
        }
      }

      // 3. Live or Staging Razorpay modal checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'GoVisual AI',
        description: `${selectedPlan.name} Subscription`,
        order_id: order.order_id,
        handler: async function (response: any) {
          try {
            const verification = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            if (verification.success) {
              router.push(
                `/payment/success?order_id=${encodeURIComponent(response.razorpay_order_id)}&plan=${encodeURIComponent(
                  selectedPlan.code
                )}&credits=${verification.credits_added}&total=${verification.total_credits}`
              )
            } else {
              router.push(`/payment/failed?reason=verification_failed&order_id=${response.razorpay_order_id}`)
            }
          } catch (verr: any) {
            router.push(`/payment/failed?reason=${encodeURIComponent(verr.message)}`)
          }
        },
        prefill: {
          name: 'GoVisual Customer',
          email: 'customer@govisual.ai',
        },
        theme: {
          color: '#7c3aed',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp: any) {
        setIsProcessing(false)
        router.push(
          `/payment/failed?reason=${encodeURIComponent(resp.error?.description || 'Payment rejected by bank')}&order_id=${order.order_id}`
        )
      })
      rzp.open()
    } catch (err: any) {
      console.error('Checkout error:', err)
      setErrorMessage(err.message || 'Could not initiate checkout transaction.')
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Plan not found</h2>
        <Link href="/pricing" className="mt-4 text-violet-400 underline">
          Return to Pricing
        </Link>
      </div>
    )
  }

  const isAnnual = selectedPlan.billing_interval === 'yearly'

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <div className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Pricing
          </Link>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                  Checkout Confirmation
                </span>
                <h1 className="text-2xl font-bold text-white mt-1">{selectedPlan.name}</h1>
                <p className="text-sm text-neutral-400 mt-1">{selectedPlan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-white">₹{selectedPlan.price_inr.toLocaleString('en-IN')}</div>
                <div className="text-xs text-neutral-400">
                  Billed {isAnnual ? 'Annually (365 days)' : 'Monthly (30 days)'}
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Checkout Notice</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Order Summary & Feature List */}
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                Plan Entitlements & Features
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-sm text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Delivery Breakdown */}
            <div className="mt-8 rounded-xl bg-neutral-950 border border-neutral-800/80 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-semibold text-white">Credit Release Schedule</span>
                  <p className="text-neutral-400 mt-0.5 leading-relaxed">
                    {isAnnual ? (
                      <>
                        You receive <strong>{selectedPlan.monthly_image_credits} image credits</strong> immediately upon payment today, and another {selectedPlan.monthly_image_credits} credits on the 1st of each subsequent month for 12 months.
                      </>
                    ) : (
                      <>
                        You receive <strong>{selectedPlan.monthly_image_credits} image credits</strong> immediately upon payment, valid for your 30-day billing cycle.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Guarantee and Auto-renewal Notice */}
            <div className="mt-6 flex items-start gap-3 text-xs text-neutral-400">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Zero Auto-Renewal Guarantee:</strong> GoVisual AI does not store payment credentials or charge automatic renewals. You will be prompted manually when your subscription nears expiration.
              </p>
            </div>

            {/* Payment Button */}
            <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStartPayment}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl font-bold text-base bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-800/30 transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Securing Transaction...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" /> Pay ₹{selectedPlan.price_inr.toLocaleString('en-IN')} via Razorpay
                  </>
                )}
              </button>

              <p className="text-center text-xs text-neutral-500">
                Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and EMI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}


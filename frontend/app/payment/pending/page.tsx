'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Clock, CheckCircle2 } from 'lucide-react'
import { fetchOrderStatus } from '@/lib/billingApi'

function PaymentPendingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [status, setStatus] = useState<string>('pending')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!orderId) return
    const interval = setInterval(async () => {
      try {
        const order = await fetchOrderStatus(orderId)
        setStatus(order.status)
        if (order.status === 'captured') {
          clearInterval(interval)
          router.push(`/payment/success?order_id=${encodeURIComponent(orderId)}&plan=${order.plan_code}`)
        } else if (order.status === 'failed') {
          clearInterval(interval)
          router.push(`/payment/failed?order_id=${encodeURIComponent(orderId)}`)
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
      setAttempts((prev) => prev + 1)
    }, 2500)

    return () => clearInterval(interval)
  }, [orderId, router])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-violet-950 border border-violet-800 flex items-center justify-center mx-auto text-violet-400 mb-6">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold text-white">Verifying Transaction</h1>
        <p className="text-sm text-neutral-400 mt-2">
          We are confirming payment confirmation from your bank via Razorpay webhooks. Please do not close this window.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <span>Status: {status} (Checking #{attempts + 1})</span>
        </div>

        <div className="mt-8 pt-4 border-t border-neutral-800">
          <Link
            href="/dashboard"
            className="text-xs text-neutral-500 hover:text-neutral-400 underline"
          >
            Go to Dashboard while we confirm
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <PaymentPendingContent />
    </Suspense>
  )
}


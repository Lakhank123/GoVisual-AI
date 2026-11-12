'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircle, RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react'

function PaymentFailedContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'The transaction could not be completed.'
  const orderId = searchParams.get('order_id')

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mx-auto text-rose-400 mb-6 shadow-lg shadow-rose-950/50">
          <XCircle className="w-10 h-10" />
        </div>

        <h1 className="text-2xl font-bold text-white">Payment Unsuccessful</h1>
        <p className="text-sm text-neutral-400 mt-2">
          {decodeURIComponent(reason)}
        </p>

        {orderId && (
          <p className="text-xs text-neutral-500 font-mono mt-3">
            Reference: {orderId}
          </p>
        )}

        <div className="mt-6 rounded-xl bg-neutral-950 border border-neutral-800 p-4 text-left text-xs text-neutral-400 space-y-2">
          <p className="font-semibold text-neutral-300">Common reasons for payment rejection:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Bank OTP timeout or incorrect PIN entered</li>
            <li>UPI app request expired or declined in app</li>
            <li>Insufficient card limits or international billing blocks</li>
          </ul>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/checkout?plan=creator_pro_monthly"
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 text-white transition flex items-center justify-center gap-2 shadow-lg"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </Link>
          <Link
            href="/pricing"
            className="w-full py-3 px-4 rounded-xl font-medium text-sm border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Pricing Plans
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <PaymentFailedContent />
    </Suspense>
  )
}


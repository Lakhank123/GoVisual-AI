'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Sparkles, Layers, ShieldCheck } from 'lucide-react'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id') || 'N/A'
  const plan = searchParams.get('plan') || 'Creator Pro'
  const creditsAdded = searchParams.get('credits') || '24'
  const totalCredits = searchParams.get('total') || '30'

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center mx-auto text-emerald-400 mb-6 shadow-lg shadow-emerald-950/50">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5" /> Payment Successful
        </span>

        <h1 className="text-2xl font-bold text-white mt-4">Welcome to Your Upgraded Plan!</h1>
        <p className="text-sm text-neutral-400 mt-2">
          Your payment has been verified and your creative credits are now available in your account.
        </p>

        {/* Credit Summary Card */}
        <div className="mt-6 rounded-xl bg-neutral-950 border border-neutral-800 p-4 text-left space-y-2">
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span>Reference Order:</span>
            <span className="font-mono text-neutral-300">{orderId.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span>Plan:</span>
            <span className="font-semibold text-white capitalize">{plan.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-2 border-t border-neutral-800">
            <span className="font-medium text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-400" /> Granted Today:
            </span>
            <span className="font-bold text-emerald-400">+{creditsAdded} Credits</span>
          </div>
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span>New Ledger Balance:</span>
            <span className="font-bold text-white">{totalCredits} Image Credits</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Link
            href="/studio"
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-violet-900/40"
          >
            Launch Creative Studio <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/billing"
            className="w-full py-3 px-4 rounded-xl font-medium text-sm border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4" /> View Billing Center
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}


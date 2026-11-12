'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Zap, Shield, ArrowRight, HelpCircle } from 'lucide-react'
import { fetchBillingPlans, BillingPlan } from '@/lib/billingApi'

export default function PricingPage() {
  const router = useRouter()
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchBillingPlans()
        setPlans(data)
      } catch (err) {
        console.error('Failed to load plans:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Resolve plans by tier & interval
  const freePlan = plans.find((p) => p.tier === 'free')
  const creatorPlan = plans.find(
    (p) => p.tier === 'creator_pro' && p.billing_interval === interval
  ) || plans.find((p) => p.tier === 'creator_pro')
  const businessPlan = plans.find(
    (p) => p.tier === 'business_max' && p.billing_interval === interval
  ) || plans.find((p) => p.tier === 'business_max')

  const handleSelectPlan = (planCode: string) => {
    if (planCode === 'free_monthly') {
      router.push('/dashboard')
    } else {
      router.push(`/checkout?plan=${planCode}`)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-16 px-4 sm:px-6 lg:px-8">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-neutral-950/0 to-neutral-950/0 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-violet-950/80 border border-violet-800/50 text-violet-300">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Commercial SaaS AI Production Tiers
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Transparent Pricing for <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              High-Converting Brand Creatives
            </span>
          </h1>
          <p className="text-lg text-neutral-400">
            Authoritative brand identity compositing, real critic evaluation, and commercial AI generation. 
            All paid plans include manual renewal with strict zero auto-renewal protection.
          </p>

          {/* Billing Interval Toggle */}
          <div className="pt-6 flex justify-center items-center gap-3">
            <span className={`text-sm font-medium ${interval === 'monthly' ? 'text-white' : 'text-neutral-400'}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-neutral-800 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
              role="switch"
              aria-checked={interval === 'yearly'}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-violet-500 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  interval === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium flex items-center gap-1.5 ${interval === 'yearly' ? 'text-white' : 'text-neutral-400'}`}>
              Annual
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                12 Months for price of 10
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
          {/* 1. FREE STARTER */}
          <div className="flex flex-col justify-between rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 shadow-xl hover:border-neutral-700 transition">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Free Starter</h3>
                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-800 text-neutral-300">
                  Starter
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-400">
                Essential marketing creative pack for small local businesses testing AI generation.
              </p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-white">₹0</span>
                <span className="text-sm font-medium text-neutral-400"> / forever</span>
              </div>

              <div className="mt-6 border-t border-neutral-800 pt-6">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Included in Free
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    '6 low-quality image credits / month',
                    'Max 2 three-image generation runs / month',
                    '1 saved Brand Brain profile',
                    '10 synchronized caption suggestions / mo',
                    '2 GoVisual Critic evaluations / mo',
                    '1 MiniSite preview draft',
                    'Standard community support',
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                      <Check className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => handleSelectPlan('free_monthly')}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm border border-neutral-700 text-neutral-200 hover:bg-neutral-800 transition"
              >
                Continue with Free
              </button>
            </div>
          </div>

          {/* 2. CREATOR PRO (Featured) */}
          <div className="relative flex flex-col justify-between rounded-2xl bg-gradient-to-b from-violet-950/40 via-neutral-900/80 to-neutral-900 border-2 border-violet-500 p-8 shadow-2xl shadow-violet-950/50">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-600 text-white uppercase tracking-wider shadow-md">
                <Zap className="w-3.5 h-3.5 fill-current" /> Most Popular
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mt-2">
                <h3 className="text-xl font-bold text-white">Creator Pro</h3>
                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-violet-900/60 border border-violet-700/50 text-violet-300">
                  Commercial
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-300">
                Enhanced commercial generation with critic loop, logo compositing, and brand memory.
              </p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-white">
                  ₹{interval === 'yearly' ? '6,990' : '699'}
                </span>
                <span className="text-sm font-medium text-neutral-400">
                  {' '}/ {interval === 'yearly' ? 'year' : 'month'}
                </span>
                {interval === 'yearly' && (
                  <p className="text-xs text-emerald-400 mt-1 font-medium">
                    Save ₹1,398 (effective ₹582/mo)
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-neutral-800 pt-6">
                <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
                  Everything in Free, plus:
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    '24 medium-quality image credits / month',
                    'Max 8 three-image generation runs / month',
                    'Exact pixel-perfect brand logo compositing',
                    '30 caption suggestions / month',
                    '8 GoVisual Critic evaluations / month',
                    '1 AI self-correction retry per batch',
                    'Saved brand & product catalog context',
                    interval === 'yearly'
                      ? '24 credits released monthly (12 releases)'
                      : 'Immediate credit delivery on renewal',
                    'No auto-renewal (100% manual renewal)',
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-200">
                      <Check className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => handleSelectPlan(creatorPlan ? creatorPlan.code : `creator_pro_${interval}`)}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-700/30 transition flex items-center justify-center gap-2"
              >
                Upgrade to Creator Pro <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3. BUSINESS MAX */}
          <div className="flex flex-col justify-between rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 shadow-xl hover:border-neutral-700 transition">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Business Max</h3>
                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-800 text-amber-300">
                  Agency Tier
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-400">
                High-volume multi-product creative production and agency-ready marketing suites.
              </p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-white">
                  ₹{interval === 'yearly' ? '14,990' : '1,499'}
                </span>
                <span className="text-sm font-medium text-neutral-400">
                  {' '}/ {interval === 'yearly' ? 'year' : 'month'}
                </span>
                {interval === 'yearly' && (
                  <p className="text-xs text-emerald-400 mt-1 font-medium">
                    Save ₹2,998 (effective ₹1,249/mo)
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-neutral-800 pt-6">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Full Power Production
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    '60 medium-quality image credits / month',
                    'Max 20 three-image generation runs / month',
                    '100 caption suggestions / month',
                    '20 GoVisual Critic evaluations / month',
                    '3 interactive MiniSite landing pages',
                    'Priority GPU rendering queue',
                    'Full product catalog memory',
                    interval === 'yearly'
                      ? '60 credits released monthly (12 releases)'
                      : 'Immediate credit delivery on renewal',
                    'Direct commercial export rights',
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => handleSelectPlan(businessPlan ? businessPlan.code : `business_max_${interval}`)}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white transition flex items-center justify-center gap-2"
              >
                Choose Business Max <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Credit Release & Non-Auto-Renewal Disclosure */}
        <div className="mt-16 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 p-6 sm:p-8 max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-violet-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-base font-semibold text-white">
                Consumer Protection & Credit Allocation Policy
              </h4>
              <p className="mt-1 text-sm text-neutral-400 leading-relaxed">
                • <strong>Annual Subscription Schedule:</strong> Yearly subscriptions receive their monthly credit allowance on the 1st of every calendar month (24 credits/mo for Creator Pro, 60 credits/mo for Business Max). Credits are never loaded 100% upfront to prevent batch forfeiture.
                <br />
                • <strong>No Auto-Renewal:</strong> You are never billed automatically. When your subscription period ends, your account transitions to the Free Starter tier with no penalty or hidden recurring charges.
                <br />
                • <strong>1 Delivered Image = 1 Credit:</strong> If a generation fails or is interrupted, reserved credits are immediately refunded back to your ledger balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


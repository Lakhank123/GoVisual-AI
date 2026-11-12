'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Zap,
  Sparkles,
  Calendar,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import { fetchUserSubscription, UserSubscription } from '@/lib/billingApi'

export default function DashboardBillingPage() {
  const [sub, setSub] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchUserSubscription()
        setSub(data)
      } catch (err: any) {
        console.warn('Subscription fetch notice:', err)
        setError(err.message || 'Could not load subscription details.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    )
  }

  const activePlan = sub?.active_plan
  const tier = activePlan?.tier || 'free'
  const isFree = tier === 'free'
  const isAnnual = sub?.is_annual || false
  const creditsRemaining = sub?.credits_remaining ?? 6
  const monthlyQuota = sub?.monthly_quota_used

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 sm:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            Account & Subscriptions
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-1">Billing & Credit Management</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Review active plan entitlements, credit ledger quotas, and manual renewal dates.
          </p>
        </div>
        <div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 transition"
          >
            <Sparkles className="w-4 h-4" /> {isFree ? 'Upgrade Plan' : 'Change Plan'}
          </Link>
        </div>
      </div>

      {/* Grid: Plan Overview + Credit Gauge */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Card */}
        <div className="lg:col-span-2 rounded-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-950 border border-violet-800 text-violet-300">
                Current Active Tier
              </span>
              <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Shield className="w-4 h-4 text-emerald-400" /> No Auto-Renewal
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <h2 className="text-3xl font-black text-white">{activePlan?.name || 'Free Starter'}</h2>
              <span className="text-sm font-medium text-neutral-400">
                (₹{activePlan?.price_inr.toLocaleString('en-IN') || '0'} / {isAnnual ? 'yr' : 'mo'})
              </span>
            </div>

            <p className="text-sm text-neutral-400 mt-2">
              {activePlan?.description || 'Essential marketing creative pack for testing AI generation.'}
            </p>

            {/* Date Details */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-neutral-800/80">
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <Calendar className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                <div>
                  <div className="text-xs text-neutral-500">Period Validity</div>
                  <div className="font-semibold text-white">
                    {sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Continuous (Free)'}
                  </div>
                </div>
              </div>

              {isAnnual && sub?.next_entitlement_release && (
                <div className="flex items-center gap-3 text-sm text-neutral-300">
                  <RefreshCw className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-violet-400 font-medium">Next Credit Release</div>
                    <div className="font-semibold text-white">
                      +{activePlan?.monthly_image_credits} Credits on{' '}
                      {new Date(sub.next_entitlement_release).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800/80">
            <span className="text-xs text-neutral-400">
              {isFree
                ? 'Upgrade to unlock high-resolution renderings, exact logo compositing & self-correction.'
                : 'Need more credits? You can renew manually or upgrade to Business Max anytime.'}
            </span>
            <Link
              href={isFree ? '/pricing' : `/checkout?plan=${activePlan?.code}`}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              {isFree ? 'Explore Commercial Plans' : 'Renew Subscription'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Available Credits Card */}
        <div className="rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-900/60 border border-neutral-800 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Creative Balance
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">{creditsRemaining}</span>
              <span className="text-sm font-semibold text-violet-400">Image Credits</span>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              1 delivered image consumes 1 credit. Failed or canceled generations are automatically refunded.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-800/80 space-y-3">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Quality Tier:</span>
              <span className="font-semibold text-white uppercase">{isFree ? 'Standard' : 'Commercial HQ'}</span>
            </div>
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Auto-Correction:</span>
              <span className="font-semibold text-white">
                {activePlan?.auto_correction_allowed ? 'Enabled (1/batch)' : 'Locked on Free'}
              </span>
            </div>
            <Link
              href="/studio"
              className="mt-4 w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-neutral-800 hover:bg-neutral-700 text-white transition flex items-center justify-center gap-2"
            >
              Open Creative Studio <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Monthly Quota Consumption Progress */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-white mb-4">
          Monthly Quota Consumption ({monthlyQuota?.year_month || 'Current Month'})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Generation Runs */}
          <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-4">
            <span className="text-xs text-neutral-400 font-medium">3-Image Generation Runs</span>
            <div className="mt-2 text-2xl font-bold text-white">
              {monthlyQuota?.three_image_runs || 0}{' '}
              <span className="text-xs text-neutral-500 font-normal">
                / {activePlan?.max_three_image_runs_monthly || 2} max
              </span>
            </div>
            <div className="mt-3 w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-violet-500 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((monthlyQuota?.three_image_runs || 0) / (activePlan?.max_three_image_runs_monthly || 2)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Captions */}
          <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-4">
            <span className="text-xs text-neutral-400 font-medium">Caption Suggestions</span>
            <div className="mt-2 text-2xl font-bold text-white">
              {monthlyQuota?.captions_generated || 0}{' '}
              <span className="text-xs text-neutral-500 font-normal">
                / {activePlan?.monthly_captions || 10} max
              </span>
            </div>
            <div className="mt-3 w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-fuchsia-500 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((monthlyQuota?.captions_generated || 0) / (activePlan?.monthly_captions || 10)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Critic Evals */}
          <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-4">
            <span className="text-xs text-neutral-400 font-medium">GoVisual Critic Evals</span>
            <div className="mt-2 text-2xl font-bold text-white">
              {monthlyQuota?.critic_evaluations || 0}{' '}
              <span className="text-xs text-neutral-500 font-normal">
                / {activePlan?.monthly_critic_evals || 2} max
              </span>
            </div>
            <div className="mt-3 w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((monthlyQuota?.critic_evaluations || 0) / (activePlan?.monthly_critic_evals || 2)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* MiniSites */}
          <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-4">
            <span className="text-xs text-neutral-400 font-medium">MiniSite Drafts</span>
            <div className="mt-2 text-2xl font-bold text-white">
              {monthlyQuota?.minisites_created || 0}{' '}
              <span className="text-xs text-neutral-500 font-normal">
                / {activePlan?.monthly_minisite_drafts || 1} max
              </span>
            </div>
            <div className="mt-3 w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((monthlyQuota?.minisites_created || 0) / (activePlan?.monthly_minisite_drafts || 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


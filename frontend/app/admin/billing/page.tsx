'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Users,
  DollarSign,
  Cpu,
  PieChart,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react'
import { fetchAdminBillingMetrics, AdminBillingMetrics } from '@/lib/billingApi'

export default function AdminBillingPage() {
  const [metrics, setMetrics] = useState<AdminBillingMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminBillingMetrics()
      setMetrics(data)
    } catch (err: any) {
      setError(err.message || 'Access denied or server error.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 flex flex-col items-center justify-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Admin Privileges Required</h2>
        <p className="text-sm text-neutral-400 mt-2 text-center max-w-md">{error}</p>
        <Link
          href="/dashboard"
          className="mt-6 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm hover:bg-neutral-800"
        >
          Return to User Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 sm:p-10 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-300">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              Executive Analytics
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">SaaS Financial & Credit Operations</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time subscriber tiers, MRR/ARR runs, AI infrastructure cost burn, and margin calculations.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Metrics
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Monthly Recurring Revenue (MRR)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4 text-3xl font-black text-white">
            ₹{metrics?.mrr_inr.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            ARR: ₹{metrics?.arr_inr.toLocaleString('en-IN') || '0'}
          </div>
        </div>

        {/* Active Subscribers */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Active Paid Subscribers
            </span>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-4 text-3xl font-black text-white">
            {metrics?.active_subscriptions_count || 0}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Total users tracked: {metrics?.total_subscribers || 0}
          </div>
        </div>

        {/* AI Provider Cost Burn */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Est. AI Provider Cost
            </span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4 text-3xl font-black text-white">
            ₹{metrics?.total_provider_cost_inr.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            ${metrics?.total_provider_cost_usd || '0.00'} USD (Groq + Gemini/Flux)
          </div>
        </div>

        {/* Gross Margin */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Gross SaaS Margin
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-4 text-3xl font-black text-emerald-400">
            {metrics?.estimated_margin_pct ?? 0}%
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Cost-of-Goods-Sold optimized
          </div>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscribers by Tier */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-violet-400" /> Subscribers by Tier
          </h3>
          <div className="mt-6 space-y-4">
            {Object.entries(metrics?.subscribers_by_tier || {}).map(([t, count]) => (
              <div key={t} className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-sm font-semibold capitalize text-neutral-300">
                  {t.replace('_', ' ')}
                </span>
                <span className="text-sm font-bold text-white bg-neutral-900 px-3 py-1 rounded-lg border border-neutral-800">
                  {count} accounts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Production Ledger */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" /> Credits Allocation & Consumption
          </h3>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-sm text-neutral-300">Total Credits Allocated</span>
              <span className="text-sm font-bold text-violet-400">
                {metrics?.total_image_credits_allocated || 0} Credits
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-sm text-neutral-300">Total Credits Consumed (Images)</span>
              <span className="text-sm font-bold text-amber-400">
                {metrics?.total_image_credits_consumed || 0} Delivered
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-sm text-neutral-300">Active Unspent Pool</span>
              <span className="text-sm font-bold text-emerald-400">
                {(metrics?.total_image_credits_allocated || 0) - (metrics?.total_image_credits_consumed || 0)} Credits
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


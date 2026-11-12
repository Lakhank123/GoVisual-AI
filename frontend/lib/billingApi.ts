import { getSafeSession } from './supabase'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export interface BillingPlan {
  code: string
  tier: 'free' | 'creator_pro' | 'business_max'
  name: string
  description: string
  billing_interval: 'free' | 'monthly' | 'yearly'
  price_inr: number
  price_paise: number
  duration_days: number
  monthly_image_credits: number
  max_three_image_runs_monthly: number
  monthly_captions: number
  monthly_critic_evals: number
  monthly_minisite_drafts: number
  auto_correction_allowed: boolean
  max_auto_corrections_per_batch: number
  features: string[]
  is_active?: boolean
}

export interface CheckoutOrderResponse {
  order_id: string
  amount: number
  currency: string
  key_id: string
  plan_code: string
  plan_name: string
  billing_interval: string
  notes?: Record<string, any>
}

export interface PaymentVerificationResponse {
  success: boolean
  status: string
  subscription_id: string
  plan_code: string
  tier: string
  credits_added: number
  total_credits: number
  expires_at: string
  message: string
}

export interface MonthlyQuotaUsage {
  year_month: string
  images_generated: number
  three_image_runs: number
  captions_generated: number
  critic_evaluations: number
  minisites_created: number
}

export interface UserSubscription {
  active_plan: BillingPlan
  status: 'active' | 'expired' | 'pending' | 'cancelled'
  start_date: string
  end_date: string
  current_period_start: string
  current_period_end: string
  auto_renew: boolean
  is_annual: boolean
  total_periods_count: number
  completed_periods_count: number
  credits_remaining: number
  monthly_quota_used: MonthlyQuotaUsage
  next_entitlement_release?: string | null
}

export interface AdminBillingMetrics {
  total_subscribers: number
  subscribers_by_tier: Record<string, number>
  mrr_inr: number
  arr_inr: number
  total_image_credits_allocated: number
  total_image_credits_consumed: number
  total_provider_cost_usd: number
  total_provider_cost_inr: number
  estimated_margin_pct: number
  active_subscriptions_count: number
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await getSafeSession()
  const token = session?.access_token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    // In mock or development demo session
    headers['Authorization'] = 'Bearer demo_token_bypass_local'
  }
  return headers
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  try {
    const res = await fetch(`${BASE}/api/billing/plans`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('Failed to fetch billing plans from API, using fallback catalog:', err)
    return [
      {
        code: 'free_monthly',
        tier: 'free',
        name: 'Free Starter',
        description: 'Essential marketing creative pack for small businesses',
        billing_interval: 'free',
        price_inr: 0,
        price_paise: 0,
        duration_days: 3650,
        monthly_image_credits: 6,
        max_three_image_runs_monthly: 2,
        monthly_captions: 10,
        monthly_critic_evals: 2,
        monthly_minisite_drafts: 1,
        auto_correction_allowed: false,
        max_auto_corrections_per_batch: 0,
        features: [
          '6 low-quality image credits/mo',
          'Max 2 three-image runs/mo',
          '1 saved brand profile',
          '10 caption suggestions/mo',
          '2 critic evaluations/mo',
          '1 MiniSite draft',
        ],
      },
      {
        code: 'creator_pro_monthly',
        tier: 'creator_pro',
        name: 'Creator Pro Monthly',
        description: 'Enhanced commercial generation with critic and brand memory',
        billing_interval: 'monthly',
        price_inr: 699,
        price_paise: 69900,
        duration_days: 30,
        monthly_image_credits: 24,
        max_three_image_runs_monthly: 8,
        monthly_captions: 30,
        monthly_critic_evals: 8,
        monthly_minisite_drafts: 1,
        auto_correction_allowed: true,
        max_auto_corrections_per_batch: 1,
        features: [
          '24 medium-quality image credits/mo',
          'Max 8 three-image runs/mo',
          '30 caption suggestions/mo',
          '8 critic evaluations/mo',
          '1 MiniSite draft',
          'Saved brand & product context',
          '1 auto-correction per batch',
          'Manual renewal (no auto-renew)',
        ],
      },
      {
        code: 'creator_pro_yearly',
        tier: 'creator_pro',
        name: 'Creator Pro Yearly',
        description: 'Annual commitment with 12 months for the price of 10',
        billing_interval: 'yearly',
        price_inr: 6990,
        price_paise: 699000,
        duration_days: 365,
        monthly_image_credits: 24,
        max_three_image_runs_monthly: 8,
        monthly_captions: 30,
        monthly_critic_evals: 8,
        monthly_minisite_drafts: 1,
        auto_correction_allowed: true,
        max_auto_corrections_per_batch: 1,
        features: [
          '24 medium-quality credits released monthly',
          'Save ₹1,398 (12 months for price of 10)',
          'Max 8 three-image runs/mo',
          '30 caption suggestions/mo',
          '8 critic evaluations/mo',
          '1 MiniSite draft',
          '1 auto-correction per batch',
        ],
      },
      {
        code: 'business_max_monthly',
        tier: 'business_max',
        name: 'Business Max Monthly',
        description: 'High-volume agency & multi-product creative production',
        billing_interval: 'monthly',
        price_inr: 1499,
        price_paise: 149900,
        duration_days: 30,
        monthly_image_credits: 60,
        max_three_image_runs_monthly: 20,
        monthly_captions: 100,
        monthly_critic_evals: 20,
        monthly_minisite_drafts: 3,
        auto_correction_allowed: true,
        max_auto_corrections_per_batch: 1,
        features: [
          '60 medium-quality image credits/mo',
          'Max 20 three-image runs/mo',
          '100 caption suggestions/mo',
          '20 critic evaluations/mo',
          '3 MiniSite drafts',
          'Full brand memory & priority rendering',
          '1 auto-correction per batch',
        ],
      },
      {
        code: 'business_max_yearly',
        tier: 'business_max',
        name: 'Business Max Yearly',
        description: 'Annual high-volume package with maximum savings',
        billing_interval: 'yearly',
        price_inr: 14990,
        price_paise: 1499000,
        duration_days: 365,
        monthly_image_credits: 60,
        max_three_image_runs_monthly: 20,
        monthly_captions: 100,
        monthly_critic_evals: 20,
        monthly_minisite_drafts: 3,
        auto_correction_allowed: true,
        max_auto_corrections_per_batch: 1,
        features: [
          '60 medium-quality credits released monthly',
          'Save ₹2,998 (12 months for price of 10)',
          'Max 20 three-image runs/mo',
          '100 caption suggestions/mo',
          '20 critic evaluations/mo',
          '3 MiniSite drafts',
          'Priority rendering',
        ],
      },
    ]
  }
}

export async function fetchUserSubscription(): Promise<UserSubscription> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/api/billing/subscription`, { headers })
  if (!res.ok) {
    throw new Error(`Failed to fetch subscription: HTTP ${res.status}`)
  }
  return await res.json()
}

export async function createCheckoutOrder(
  planCode: string,
  idempotencyKey?: string
): Promise<CheckoutOrderResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/api/billing/checkout/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plan_code: planCode,
      idempotency_key: idempotencyKey,
    }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to create checkout order: HTTP ${res.status}`)
  }
  return await res.json()
}

export async function verifyPayment(payload: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}): Promise<PaymentVerificationResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/api/billing/checkout/verify-payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Payment verification failed: HTTP ${res.status}`)
  }
  return await res.json()
}

export async function fetchOrderStatus(orderId: string): Promise<any> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/api/billing/order-status/${encodeURIComponent(orderId)}`, { headers })
  if (!res.ok) {
    throw new Error(`Failed to check order status: HTTP ${res.status}`)
  }
  return await res.json()
}

export async function fetchAdminBillingMetrics(): Promise<AdminBillingMetrics> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/api/billing/admin/metrics`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Admin access denied: HTTP ${res.status}`)
  }
  return await res.json()
}


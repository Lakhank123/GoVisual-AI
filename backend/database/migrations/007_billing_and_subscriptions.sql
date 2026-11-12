-- =========================================================================
-- Migration 007: GoVisual AI V2 Complete Billing, Subscriptions & Razorpay
-- Idempotent Supabase PostgreSQL Migration
-- =========================================================================

-- 1. Create ENUMs safely
DO $$ BEGIN
    CREATE TYPE subscription_status_enum AS ENUM ('active', 'expired', 'pending', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE billing_interval_enum AS ENUM ('free', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_order_status_enum AS ENUM ('created', 'pending', 'authorized', 'captured', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE credit_transaction_type_enum AS ENUM (
        'initial_grant', 'monthly_entitlement', 'reservation', 'settlement', 
        'refund', 'manual_adjustment', 'legacy_migration'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Billing Plans Table (Authoritative plan configuration)
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL, -- 'free', 'creator_pro', 'business_max'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    billing_interval billing_interval_enum NOT NULL DEFAULT 'monthly',
    price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_paise BIGINT NOT NULL DEFAULT 0,
    duration_days INT NOT NULL DEFAULT 30, -- 30 for monthly, 365 for yearly
    monthly_image_credits INT NOT NULL DEFAULT 6,
    max_three_image_runs_monthly INT NOT NULL DEFAULT 2,
    monthly_captions INT NOT NULL DEFAULT 10,
    monthly_critic_evals INT NOT NULL DEFAULT 2,
    monthly_minisite_drafts INT NOT NULL DEFAULT 1,
    auto_correction_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    max_auto_corrections_per_batch INT NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed authoritative billing plans
INSERT INTO billing_plans (
    code, tier, name, description, billing_interval, price_inr, price_paise, duration_days,
    monthly_image_credits, max_three_image_runs_monthly, monthly_captions, monthly_critic_evals,
    monthly_minisite_drafts, auto_correction_allowed, max_auto_corrections_per_batch, features
) VALUES 
(
    'free_monthly', 'free', 'Free Starter', 
    'Essential marketing creative pack for small businesses', 'free', 0.00, 0, 3650,
    6, 2, 10, 2, 1, FALSE, 0,
    '["6 low-quality image credits/mo", "Max 2 three-image runs/mo", "1 saved brand profile", "10 caption suggestions/mo", "2 critic evaluations/mo", "1 MiniSite draft", "Standard support"]'::jsonb
),
(
    'creator_pro_monthly', 'creator_pro', 'Creator Pro Monthly', 
    'Enhanced commercial generation with critic and brand memory', 'monthly', 699.00, 69900, 30,
    24, 8, 30, 8, 1, TRUE, 1,
    '["24 medium-quality image credits/mo", "Max 8 three-image runs/mo", "30 caption suggestions/mo", "8 critic evaluations/mo", "1 MiniSite draft", "Saved brand & product context", "1 auto-correction per batch", "No auto-renewal"]'::jsonb
),
(
    'creator_pro_yearly', 'creator_pro', 'Creator Pro Yearly', 
    'Annual commitment with 12 months for the price of 10', 'yearly', 6990.00, 699000, 365,
    24, 8, 30, 8, 1, TRUE, 1,
    '["24 medium-quality credits released monthly", "Save ₹1,398 (12 months for price of 10)", "Max 8 three-image runs/mo", "30 caption suggestions/mo", "8 critic evaluations/mo", "1 MiniSite draft", "1 auto-correction per batch"]'::jsonb
),
(
    'business_max_monthly', 'business_max', 'Business Max Monthly', 
    'High-volume agency & multi-product creative production', 'monthly', 1499.00, 149900, 30,
    60, 20, 100, 20, 3, TRUE, 1,
    '["60 medium-quality image credits/mo", "Max 20 three-image runs/mo", "100 caption suggestions/mo", "20 critic evaluations/mo", "3 MiniSite drafts", "Full brand memory", "Priority rendering"]'::jsonb
),
(
    'business_max_yearly', 'business_max', 'Business Max Yearly', 
    'Annual high-volume package with maximum savings', 'yearly', 14990.00, 1499000, 365,
    60, 20, 100, 20, 3, TRUE, 1,
    '["60 medium-quality credits released monthly", "Save ₹2,998 (12 months for price of 10)", "Max 20 three-image runs/mo", "100 caption suggestions/mo", "20 critic evaluations/mo", "3 MiniSite drafts", "Priority rendering"]'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    price_inr = EXCLUDED.price_inr,
    price_paise = EXCLUDED.price_paise,
    monthly_image_credits = EXCLUDED.monthly_image_credits,
    features = EXCLUDED.features,
    updated_at = CURRENT_TIMESTAMP;

-- 3. User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    plan_code VARCHAR(50) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    billing_interval billing_interval_enum NOT NULL DEFAULT 'monthly',
    status subscription_status_enum NOT NULL DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_periods_count INT NOT NULL DEFAULT 1,
    completed_periods_count INT NOT NULL DEFAULT 1,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 4. Subscription Entitlement Periods (For scheduled monthly credit release on annual plans)
CREATE TABLE IF NOT EXISTS subscription_entitlement_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    period_number INT NOT NULL, -- 1 through 12
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    credits_allocated INT NOT NULL,
    is_released BOOLEAN NOT NULL DEFAULT FALSE,
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_entitlements_due ON subscription_entitlement_periods(is_released, period_start);

-- 5. Payment Orders Table (Razorpay Orders and Captures)
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    plan_code VARCHAR(50) NOT NULL,
    billing_interval billing_interval_enum NOT NULL,
    amount_inr NUMERIC(10, 2) NOT NULL,
    amount_paise BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    razorpay_order_id VARCHAR(100) UNIQUE NOT NULL,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature VARCHAR(255),
    status payment_order_status_enum NOT NULL DEFAULT 'created',
    failure_reason TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(razorpay_order_id);

-- 6. Append-Only Credit Ledger
CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_type credit_transaction_type_enum NOT NULL,
    amount INT NOT NULL, -- Positive for credits, negative for debits
    balance_after INT NOT NULL,
    reference_type VARCHAR(50), -- 'order', 'generation_run', 'photoshoot', 'admin_adjustment', 'monthly_reset'
    reference_id VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at DESC);

-- 7. Monthly Usage Quotas (Per-calendar-month quota tracking)
CREATE TABLE IF NOT EXISTS monthly_usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM' (e.g. '2026-11') in Asia/Kolkata
    images_generated INT NOT NULL DEFAULT 0,
    three_image_runs INT NOT NULL DEFAULT 0,
    captions_generated INT NOT NULL DEFAULT 0,
    critic_evaluations INT NOT NULL DEFAULT 0,
    minisites_created INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_year_month UNIQUE (user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_quotas_lookup ON monthly_usage_quotas(user_id, year_month);

-- 8. AI Provider Cost Logs
CREATE TABLE IF NOT EXISTS provider_cost_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    service_type VARCHAR(50) NOT NULL, -- 'openai', 'groq', 'gemini', 'flux'
    model_name VARCHAR(100) NOT NULL,
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    image_count INT DEFAULT 1,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    estimated_cost_inr NUMERIC(10, 4) DEFAULT 0.0000,
    generation_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_cost_logs_created ON provider_cost_logs(created_at);

-- 9. Razorpay Webhook Events Log (for HMAC verification & double-delivery prevention)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'processed',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON webhook_events(event_id);

-- 10. Enable Row Level Security (RLS) on all billing tables
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_entitlement_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_cost_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- 11. Define Public and User Access Policies
-- Everyone can read active billing plans
DROP POLICY IF EXISTS "Public can view active billing plans" ON billing_plans;
CREATE POLICY "Public can view active billing plans"
ON billing_plans FOR SELECT
USING (is_active = TRUE);

-- Users can view ONLY their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Users can view ONLY their own entitlement periods
DROP POLICY IF EXISTS "Users can view own entitlements" ON subscription_entitlement_periods;
CREATE POLICY "Users can view own entitlements"
ON subscription_entitlement_periods FOR SELECT
USING (auth.uid() = user_id);

-- Users can view ONLY their own payment orders
DROP POLICY IF EXISTS "Users can view own payment orders" ON payment_orders;
CREATE POLICY "Users can view own payment orders"
ON payment_orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can view ONLY their own credit transactions
DROP POLICY IF EXISTS "Users can view own credit ledger" ON credit_ledger;
CREATE POLICY "Users can view own credit ledger"
ON credit_ledger FOR SELECT
USING (auth.uid() = user_id);

-- Users can view ONLY their own monthly quotas
DROP POLICY IF EXISTS "Users can view own usage quotas" ON monthly_usage_quotas;
CREATE POLICY "Users can view own usage quotas"
ON monthly_usage_quotas FOR SELECT
USING (auth.uid() = user_id);

-- Provider cost logs and webhook events are restricted to service_role only (no public policy)

-- 12. Security Definer Functions for Atomic Operations
CREATE OR REPLACE FUNCTION atomic_reserve_credits(
    p_user_id UUID,
    p_amount INT,
    p_reference_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_credits INT;
BEGIN
    -- Lock user profile row for atomic update
    SELECT credits_remaining INTO v_current_credits
    FROM user_profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_credits IS NULL OR v_current_credits < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct reserved credits
    UPDATE user_profiles
    SET credits_remaining = credits_remaining - p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Record transaction in ledger
    INSERT INTO credit_ledger (
        user_id, transaction_type, amount, balance_after,
        reference_type, reference_id, description
    ) VALUES (
        p_user_id, 'reservation', -p_amount, v_current_credits - p_amount,
        'generation_run', p_reference_id, 'Temporary reservation for creative generation'
    );

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION atomic_settle_or_refund_credits(
    p_user_id UUID,
    p_reserved_amount INT,
    p_actual_used_amount INT,
    p_reference_id TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_refund_amount INT;
    v_new_balance INT;
BEGIN
    v_refund_amount := p_reserved_amount - p_actual_used_amount;
    
    -- If some or all reserved credits were not used, refund them to user_profiles
    IF v_refund_amount > 0 THEN
        UPDATE user_profiles
        SET credits_remaining = credits_remaining + v_refund_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id
        RETURNING credits_remaining INTO v_new_balance;

        INSERT INTO credit_ledger (
            user_id, transaction_type, amount, balance_after,
            reference_type, reference_id, description
        ) VALUES (
            p_user_id, 'refund', v_refund_amount, v_new_balance,
            'generation_run', p_reference_id, 'Refund unused reserved credits'
        );
    ELSE
        SELECT credits_remaining INTO v_new_balance
        FROM user_profiles
        WHERE id = p_user_id;
    END IF;

    -- Record final settlement in ledger
    IF p_actual_used_amount > 0 THEN
        INSERT INTO credit_ledger (
            user_id, transaction_type, amount, balance_after,
            reference_type, reference_id, description
        ) VALUES (
            p_user_id, 'settlement', 0, v_new_balance,
            'generation_run', p_reference_id, 'Settled ' || p_actual_used_amount || ' credits for generated images'
        );
    END IF;

    RETURN v_new_balance;
END;
$$;


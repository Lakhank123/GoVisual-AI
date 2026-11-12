-- =========================================================================
-- Migration 007 Rollback: Revert GoVisual AI V2 Billing & Subscriptions
-- =========================================================================

-- 1. Drop security definer functions
DROP FUNCTION IF EXISTS atomic_settle_or_refund_credits(UUID, INT, INT, TEXT);
DROP FUNCTION IF EXISTS atomic_reserve_credits(UUID, INT, TEXT);

-- 2. Drop RLS policies
DROP POLICY IF EXISTS "Users can view own usage quotas" ON monthly_usage_quotas;
DROP POLICY IF EXISTS "Users can view own credit ledger" ON credit_ledger;
DROP POLICY IF EXISTS "Users can view own payment orders" ON payment_orders;
DROP POLICY IF EXISTS "Users can view own entitlements" ON subscription_entitlement_periods;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Public can view active billing plans" ON billing_plans;

-- 3. Drop tables in reverse dependency order
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS provider_cost_logs CASCADE;
DROP TABLE IF EXISTS monthly_usage_quotas CASCADE;
DROP TABLE IF EXISTS credit_ledger CASCADE;
DROP TABLE IF EXISTS payment_orders CASCADE;
DROP TABLE IF EXISTS subscription_entitlement_periods CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS billing_plans CASCADE;

-- 4. Drop ENUM types
DROP TYPE IF EXISTS credit_transaction_type_enum CASCADE;
DROP TYPE IF EXISTS payment_order_status_enum CASCADE;
DROP TYPE IF EXISTS billing_interval_enum CASCADE;
DROP TYPE IF EXISTS subscription_status_enum CASCADE;


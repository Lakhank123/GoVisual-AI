-- =========================================================================
-- DATABASE RECONCILIATION SCRIPT (002_go_visual_schema_reconciliation.sql)
-- Safely creates all missing GoVisual AI tables and applies Phase 1 extensions
-- Preserves existing user_profiles and data.
-- Highly Idempotent.
-- =========================================================================

-- ==========================================
-- 1. ENUMs (Idempotent creation using DO blocks)
-- ==========================================
-- From 001_initial_schema.sql
DO $$ BEGIN
    CREATE TYPE asset_type_enum AS ENUM ('logo', 'product_image', 'store_photo', 'brand_guideline', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE event_type_enum AS ENUM ('creative_generated', 'creative_approved', 'creative_rejected', 'creative_published', 'photoshoot_generated', 'video_generated', 'website_updated', 'caption_edited', 'color_overridden', 'festival_used', 'instagram_posted', 'engagement_received');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- From 002_phase1_architecture_extensions.sql
DO $$ BEGIN
    CREATE TYPE onboarding_method_enum AS ENUM ('google', 'instagram', 'website', 'manual', 'assets');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE business_category_enum AS ENUM ('electronics', 'clothing', 'food', 'jewellery', 'pharmacy', 'home_decor', 'salon', 'furniture');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE logo_bg_type_enum AS ENUM ('light', 'dark', 'transparent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE visual_style_enum AS ENUM ('premium', 'friendly', 'festive', 'minimal', 'bold');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE preferred_background_enum AS ENUM ('dark', 'light', 'gradient', 'contextual', 'outdoor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE font_personality_enum AS ENUM ('modern', 'traditional', 'playful', 'elegant', 'bold');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE primary_language_enum AS ENUM ('english', 'hindi', 'marathi', 'hinglish');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE brand_tone_enum AS ENUM ('formal', 'casual', 'energetic', 'warm', 'festive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE price_positioning_enum AS ENUM ('budget', 'mid', 'premium', 'luxury');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE memory_module_enum AS ENUM ('creative', 'photoshoot', 'video', 'website', 'caption', 'campaign', 'social');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE outcome_enum AS ENUM ('approved', 'rejected', 'published', 'ignored', 'edited', 'shared');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE audience_segment_enum AS ENUM ('youth_18_25', 'young_professionals', 'families', 'parents', 'children', 'senior_citizens', 'tourists', 'students', 'corporate', 'local_neighbourhood', 'high_income', 'budget_conscious');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE photography_style_enum AS ENUM ('lifestyle', 'studio', 'candid', 'flat_lay', 'macro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE lighting_enum AS ENUM ('natural', 'studio', 'dramatic', 'soft', 'neon');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE composition_enum AS ENUM ('rule_of_thirds', 'centered', 'minimalist', 'dynamic', 'symmetrical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE image_mood_enum AS ENUM ('vibrant', 'dark', 'light', 'moody', 'airy', 'vintage');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE color_grading_enum AS ENUM ('warm', 'cool', 'high_contrast', 'pastel', 'cinematic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE asset_source_enum AS ENUM ('google', 'instagram', 'website', 'upload', 'generated');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ==========================================
-- 2. TRIGGER FUNCTIONS
-- ==========================================

-- From 001_initial_schema.sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- From 003_raw_sources.sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- From 002_phase1_architecture_extensions.sql (Replaced 001 trigger)
CREATE OR REPLACE FUNCTION save_brand_core_identity_history_and_increment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_identity_history (business_id, version, archived_at)
    VALUES (OLD.business_id, OLD.version, now());
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- From 002_phase1_architecture_extensions.sql (Replaced 001 trigger)
CREATE OR REPLACE FUNCTION save_brand_visual_dna_history_and_increment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_visual_dna_history (business_id, version, archived_at)
    VALUES (OLD.business_id, OLD.version, now());
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';


-- ==========================================
-- 3. CORE TABLES (IF NOT EXISTS)
-- ==========================================

-- A. user_profiles (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type VARCHAR(50),
    plan VARCHAR(50),
    credits_remaining INT DEFAULT 0,
    business_name VARCHAR(255),
    business_email VARCHAR(255),
    phone VARCHAR(50),
    instagram_user_id VARCHAR(255),
    whatsapp_phone VARCHAR(50),
    whatsapp_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely add columns to user_profiles just in case it already existed but was missing them
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS account_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS plan VARCHAR(50),
    ADD COLUMN IF NOT EXISTS credits_remaining INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS business_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS instagram_user_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- B. brand_core_identity (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_core_identity (
    business_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    category business_category_enum,
    sub_category VARCHAR(255),
    primary_color VARCHAR(50),
    secondary_color VARCHAR(50),
    accent_color VARCHAR(50),
    brand_tone brand_tone_enum,
    primary_language primary_language_enum,
    brand_brief TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- C. brand_identity_history (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_identity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    version INT NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- D. brand_visual_dna (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_visual_dna (
    business_id UUID PRIMARY KEY REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    primary_fonts JSONB,
    secondary_fonts JSONB,
    layout_constraints JSONB,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- E. brand_visual_dna_history (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_visual_dna_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_visual_dna(business_id) ON DELETE CASCADE,
    version INT NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- F. brand_asset_library (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_asset_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    asset_type asset_type_enum NOT NULL,
    asset_url TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- G. brand_audience_profiles (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_audience_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    segments audience_segment_enum[],
    primary_segment audience_segment_enum,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- H. brand_memory (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    event_type event_type_enum NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- I. brand_products (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS brand_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_positioning price_positioning_enum,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- J. generation_sessions (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS generation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    module_type VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- K. generation_prompts (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS generation_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES generation_sessions(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    prompt_version VARCHAR(50),
    prompt_engine_version VARCHAR(50),
    t5_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- L. generated_assets (From 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS generated_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES generation_sessions(id) ON DELETE CASCADE,
    asset_url TEXT NOT NULL,
    format VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- M. brand_raw_sources (From 003_raw_sources.sql)
CREATE TABLE IF NOT EXISTS brand_raw_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    raw_google_data JSONB,
    raw_website_data JSONB,
    raw_instagram_data JSONB,
    raw_logo_analysis JSONB,
    merged_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- N. generation_jobs (From 005_generation_engine.sql)
CREATE TABLE IF NOT EXISTS generation_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES generation_sessions(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- O. generation_manifests (From 005_generation_engine.sql)
CREATE TABLE IF NOT EXISTS generation_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES generation_sessions(id),
    generation_hash VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    processing_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- P. generation_assets_engine (From 005_generation_engine.sql, named generation_assets but we keep it distinct or merge it)
-- Since 'generated_assets' from 001 exists, 005 creates 'generation_assets'. 
CREATE TABLE IF NOT EXISTS generation_assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manifest_id UUID NOT NULL REFERENCES generation_manifests(manifest_id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INT,
    height INT,
    storage_provider VARCHAR(50) NOT NULL,
    storage_path TEXT NOT NULL,
    checksum VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Q. generation_events (From 005_generation_engine.sql)
CREATE TABLE IF NOT EXISTS generation_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES generation_sessions(id),
    event_name VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 4. ALTER TABLES (Safely Add Missing Columns from Phase 1 Extensions)
-- ==========================================

-- brand_core_identity (From 002_phase1_architecture_extensions.sql)
ALTER TABLE brand_core_identity
    ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS onboarding_method onboarding_method_enum,
    ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(255),
    ADD COLUMN IF NOT EXISTS locality VARCHAR(255),
    ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS google_rating FLOAT,
    ADD COLUMN IF NOT EXISTS business_hours VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS established_year INT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS logo_bg_type logo_bg_type_enum,
    ADD COLUMN IF NOT EXISTS full_color_palette JSONB,
    ADD COLUMN IF NOT EXISTS visual_style visual_style_enum,
    ADD COLUMN IF NOT EXISTS preferred_background preferred_background_enum,
    ADD COLUMN IF NOT EXISTS font_personality font_personality_enum,
    ADD COLUMN IF NOT EXISTS secondary_languages primary_language_enum[],
    ADD COLUMN IF NOT EXISTS tagline VARCHAR(255),
    ADD COLUMN IF NOT EXISTS unique_selling_point TEXT,
    ADD COLUMN IF NOT EXISTS brand_personality_tags VARCHAR(255)[],
    ADD COLUMN IF NOT EXISTS flagship_products JSONB,
    ADD COLUMN IF NOT EXISTS seasonal_products BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS average_transaction_value VARCHAR(100),
    ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(255),
    ADD COLUMN IF NOT EXISTS instagram_connected BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS website_url TEXT,
    ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- brand_visual_dna (From 002_phase1_architecture_extensions.sql)
ALTER TABLE brand_visual_dna
    ADD COLUMN IF NOT EXISTS photography_style photography_style_enum,
    ADD COLUMN IF NOT EXISTS lighting lighting_enum,
    ADD COLUMN IF NOT EXISTS composition composition_enum,
    ADD COLUMN IF NOT EXISTS image_mood image_mood_enum,
    ADD COLUMN IF NOT EXISTS preferred_background preferred_background_enum,
    ADD COLUMN IF NOT EXISTS depth_of_field VARCHAR(255),
    ADD COLUMN IF NOT EXISTS color_grading color_grading_enum,
    ADD COLUMN IF NOT EXISTS logo_preferred_position VARCHAR(100),
    ADD COLUMN IF NOT EXISTS logo_safe_zone VARCHAR(100),
    ADD COLUMN IF NOT EXISTS watermark_opacity NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS logo_minimum_size INT,
    ADD COLUMN IF NOT EXISTS preferred_logo_variant asset_type_enum;

-- brand_asset_library (From 002_phase1_architecture_extensions.sql)
ALTER TABLE brand_asset_library
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS width_px INT,
    ADD COLUMN IF NOT EXISTS height_px INT,
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS tags JSONB,
    ADD COLUMN IF NOT EXISTS source asset_source_enum;

-- brand_audience_profiles (From 002_phase1_architecture_extensions.sql)
ALTER TABLE brand_audience_profiles
    ADD COLUMN IF NOT EXISTS hyper_local BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS city_wide BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS tourist_facing BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS segment_language_map JSONB,
    ADD COLUMN IF NOT EXISTS festivals_relevant VARCHAR(255)[],
    ADD COLUMN IF NOT EXISTS cricket_relevant BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS price_visible_in_creatives BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS offer_driven_audience BOOLEAN DEFAULT false;

-- brand_memory (From 002_phase1_architecture_extensions.sql)
ALTER TABLE brand_memory
    ADD COLUMN IF NOT EXISTS module memory_module_enum,
    ADD COLUMN IF NOT EXISTS generation_prompt_id UUID REFERENCES generation_prompts(id),
    ADD COLUMN IF NOT EXISTS style_used VARCHAR(255),
    ADD COLUMN IF NOT EXISTS colors_used VARCHAR(50)[],
    ADD COLUMN IF NOT EXISTS format_used VARCHAR(100),
    ADD COLUMN IF NOT EXISTS festival_context VARCHAR(255),
    ADD COLUMN IF NOT EXISTS outcome outcome_enum,
    ADD COLUMN IF NOT EXISTS edit_delta JSONB,
    ADD COLUMN IF NOT EXISTS engagement_data JSONB,
    ADD COLUMN IF NOT EXISTS inferred_preference TEXT,
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);

-- generation_sessions (From 004_prompt_engine.sql)
ALTER TABLE generation_sessions
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS creative_request JSONB,
    ADD COLUMN IF NOT EXISTS brand_brain_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);

-- generation_prompts (From 004_prompt_engine.sql)
ALTER TABLE generation_prompts
    ADD COLUMN IF NOT EXISTS structured_prompt JSONB;

-- ==========================================
-- 5. APPLY TRIGGERS SAFELY
-- ==========================================
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_core_identity_updated_at ON brand_core_identity;
CREATE TRIGGER update_brand_core_identity_updated_at BEFORE UPDATE ON brand_core_identity FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_brand_core_identity_history ON brand_core_identity;
CREATE TRIGGER trigger_brand_core_identity_history BEFORE UPDATE ON brand_core_identity FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE PROCEDURE save_brand_core_identity_history_and_increment();

DROP TRIGGER IF EXISTS update_brand_visual_dna_updated_at ON brand_visual_dna;
CREATE TRIGGER update_brand_visual_dna_updated_at BEFORE UPDATE ON brand_visual_dna FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_brand_visual_dna_history ON brand_visual_dna;
CREATE TRIGGER trigger_brand_visual_dna_history BEFORE UPDATE ON brand_visual_dna FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE PROCEDURE save_brand_visual_dna_history_and_increment();

DROP TRIGGER IF EXISTS update_brand_products_updated_at ON brand_products;
CREATE TRIGGER update_brand_products_updated_at BEFORE UPDATE ON brand_products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_raw_sources_modtime ON brand_raw_sources;
CREATE TRIGGER update_brand_raw_sources_modtime BEFORE UPDATE ON brand_raw_sources FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- ==========================================
-- 6. INDEXES (IF NOT EXISTS)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_brand_core_identity_business_id ON brand_core_identity(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_identity_history_business_id ON brand_identity_history(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_visual_dna_business_id ON brand_visual_dna(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_visual_dna_history_business_id ON brand_visual_dna_history(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_asset_library_business_id ON brand_asset_library(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_audience_profiles_business_id ON brand_audience_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_memory_business_id ON brand_memory(business_id);
CREATE INDEX IF NOT EXISTS idx_brand_products_business_id ON brand_products(business_id);
CREATE INDEX IF NOT EXISTS idx_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_prompts_session_id ON generation_prompts(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_session_id ON generated_assets(session_id);
CREATE INDEX IF NOT EXISTS idx_brand_raw_sources_business_id ON brand_raw_sources(business_id);

-- From 005_generation_engine.sql
CREATE INDEX IF NOT EXISTS idx_generation_assets_manifest ON generation_assets(manifest_id);
CREATE INDEX IF NOT EXISTS idx_generation_events_session ON generation_events(session_id);
CREATE INDEX IF NOT EXISTS idx_generation_manifests_hash ON generation_manifests(generation_hash);


-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_core_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_identity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_visual_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_visual_dna_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_asset_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_audience_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_raw_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_events ENABLE ROW LEVEL SECURITY;

-- Idempotently recreate policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    
    DROP POLICY IF EXISTS "Users can manage own brand identity" ON brand_core_identity;
    DROP POLICY IF EXISTS "Users can view and insert own identity history" ON brand_identity_history;
    DROP POLICY IF EXISTS "Users can insert own identity history" ON brand_identity_history;
    
    DROP POLICY IF EXISTS "Users can manage own visual dna" ON brand_visual_dna;
    DROP POLICY IF EXISTS "Users can view and insert own visual dna history" ON brand_visual_dna_history;
    DROP POLICY IF EXISTS "Users can insert own visual dna history" ON brand_visual_dna_history;
    
    DROP POLICY IF EXISTS "Users can manage own asset library" ON brand_asset_library;
    DROP POLICY IF EXISTS "Users can manage own audience profiles" ON brand_audience_profiles;
    DROP POLICY IF EXISTS "Users can view own memory" ON brand_memory;
    DROP POLICY IF EXISTS "Users can insert own memory" ON brand_memory;
    
    DROP POLICY IF EXISTS "Users can manage own products" ON brand_products;
    
    DROP POLICY IF EXISTS "Users can manage own generation sessions" ON generation_sessions;
    DROP POLICY IF EXISTS "Users can manage prompts for own sessions" ON generation_prompts;
    DROP POLICY IF EXISTS "Users can manage generated assets for own sessions" ON generated_assets;

    DROP POLICY IF EXISTS "Users can manage their own business raw sources" ON brand_raw_sources;

    DROP POLICY IF EXISTS "Users can manage jobs for own sessions" ON generation_jobs;
    DROP POLICY IF EXISTS "Users can manage manifests for own sessions" ON generation_manifests;
    DROP POLICY IF EXISTS "Users can manage generation assets for own sessions" ON generation_assets;
    DROP POLICY IF EXISTS "Users can manage events for own sessions" ON generation_events;
END $$;

-- Apply user_profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Apply business_id isolation policies
CREATE POLICY "Users can manage own brand identity" ON brand_core_identity FOR ALL USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());
CREATE POLICY "Users can view and insert own identity history" ON brand_identity_history FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert own identity history" ON brand_identity_history FOR INSERT WITH CHECK (business_id = auth.uid());

CREATE POLICY "Users can manage own visual dna" ON brand_visual_dna FOR ALL USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());
CREATE POLICY "Users can view and insert own visual dna history" ON brand_visual_dna_history FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert own visual dna history" ON brand_visual_dna_history FOR INSERT WITH CHECK (business_id = auth.uid());

CREATE POLICY "Users can manage own asset library" ON brand_asset_library FOR ALL USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());
CREATE POLICY "Users can manage own audience profiles" ON brand_audience_profiles FOR ALL USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());
CREATE POLICY "Users can view own memory" ON brand_memory FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert own memory" ON brand_memory FOR INSERT WITH CHECK (business_id = auth.uid());

CREATE POLICY "Users can manage own products" ON brand_products FOR ALL USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());

CREATE POLICY "Users can manage their own business raw sources" ON brand_raw_sources FOR ALL USING (business_id = auth.uid()) WITH CHECK (business_id = auth.uid());

-- Apply generation isolation policies
CREATE POLICY "Users can manage own generation sessions" ON generation_sessions FOR ALL USING (user_id = auth.uid() AND business_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND business_id = auth.uid());


CREATE POLICY "Users can manage prompts for own sessions" ON generation_prompts FOR ALL USING (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
) WITH CHECK (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage generated assets for own sessions" ON generated_assets FOR ALL USING (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
) WITH CHECK (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage jobs for own sessions" ON generation_jobs FOR ALL USING (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
) WITH CHECK (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage manifests for own sessions" ON generation_manifests FOR ALL USING (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
) WITH CHECK (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage generation assets for own sessions" ON generation_assets FOR ALL USING (
    manifest_id IN (SELECT manifest_id FROM generation_manifests WHERE session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid()))
) WITH CHECK (
    manifest_id IN (SELECT manifest_id FROM generation_manifests WHERE session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can manage events for own sessions" ON generation_events FOR ALL USING (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
) WITH CHECK (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
);


-- Note: 'product-images' storage bucket setup is INTENTIONALLY EXCLUDED 
-- as per the reconciliation requirements (Module 3.1).

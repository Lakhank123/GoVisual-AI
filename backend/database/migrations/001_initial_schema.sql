-- ==========================================
-- Phase 1: Brand Intelligence Engine Schema
-- ==========================================

-- 1. ENUMs
CREATE TYPE asset_type_enum AS ENUM ('logo', 'product_image', 'store_photo', 'brand_guideline', 'other');
CREATE TYPE event_type_enum AS ENUM ('creative_generated', 'creative_approved', 'creative_rejected', 'creative_published', 'photoshoot_generated', 'video_generated', 'website_updated', 'caption_edited', 'color_overridden', 'festival_used', 'instagram_posted', 'engagement_received');

-- 2. TRIGGER FUNCTIONS

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to record history for brand_core_identity
CREATE OR REPLACE FUNCTION save_brand_core_identity_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_identity_history (business_id, version, archived_at)
    VALUES (OLD.business_id, OLD.version, now());
    -- Note: Data payload could be added here if JSONB columns are used to store snapshots
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to record history for brand_visual_dna
CREATE OR REPLACE FUNCTION save_brand_visual_dna_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_visual_dna_history (business_id, version, archived_at)
    VALUES (OLD.business_id, OLD.version, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. TABLES

-- user_profiles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Linked to auth.users in Supabase
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
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- brand_core_identity
CREATE TABLE brand_core_identity (
    business_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    sub_category VARCHAR(255),
    primary_color VARCHAR(50),
    secondary_color VARCHAR(50),
    accent_color VARCHAR(50),
    brand_tone VARCHAR(100),
    primary_language VARCHAR(50),
    brand_brief TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_core_identity_updated_at BEFORE UPDATE ON brand_core_identity FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trigger_brand_core_identity_history AFTER UPDATE ON brand_core_identity FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE PROCEDURE save_brand_core_identity_history();

-- brand_identity_history
CREATE TABLE brand_identity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    version INT NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_identity_history_updated_at BEFORE UPDATE ON brand_identity_history FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- brand_visual_dna
CREATE TABLE brand_visual_dna (
    business_id UUID PRIMARY KEY REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    primary_fonts JSONB,
    secondary_fonts JSONB,
    layout_constraints JSONB,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_visual_dna_updated_at BEFORE UPDATE ON brand_visual_dna FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trigger_brand_visual_dna_history AFTER UPDATE ON brand_visual_dna FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE PROCEDURE save_brand_visual_dna_history();

-- brand_visual_dna_history
CREATE TABLE brand_visual_dna_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_visual_dna(business_id) ON DELETE CASCADE,
    version INT NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_visual_dna_history_updated_at BEFORE UPDATE ON brand_visual_dna_history FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- brand_asset_library
CREATE TABLE brand_asset_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    asset_type asset_type_enum NOT NULL,
    asset_url TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT false, -- Soft delete flag
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_asset_library_updated_at BEFORE UPDATE ON brand_asset_library FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- brand_audience_profiles
CREATE TABLE brand_audience_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    segments JSONB,
    primary_segment VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_audience_profiles_updated_at BEFORE UPDATE ON brand_audience_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- brand_memory
CREATE TABLE brand_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    event_type event_type_enum NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_memory_updated_at BEFORE UPDATE ON brand_memory FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- brand_products
CREATE TABLE brand_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES brand_core_identity(business_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_positioning VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_brand_products_updated_at BEFORE UPDATE ON brand_products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- generation_sessions
CREATE TABLE generation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    module_type VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_generation_sessions_updated_at BEFORE UPDATE ON generation_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- generation_prompts
CREATE TABLE generation_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES generation_sessions(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    prompt_version VARCHAR(50),
    prompt_engine_version VARCHAR(50),
    t5_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_generation_prompts_updated_at BEFORE UPDATE ON generation_prompts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- generated_assets
CREATE TABLE generated_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES generation_sessions(id) ON DELETE CASCADE,
    asset_url TEXT NOT NULL,
    format VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER update_generated_assets_updated_at BEFORE UPDATE ON generated_assets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 4. INDEXES
CREATE INDEX idx_brand_core_identity_business_id ON brand_core_identity(business_id);
CREATE INDEX idx_brand_identity_history_business_id ON brand_identity_history(business_id);
CREATE INDEX idx_brand_visual_dna_business_id ON brand_visual_dna(business_id);
CREATE INDEX idx_brand_visual_dna_history_business_id ON brand_visual_dna_history(business_id);
CREATE INDEX idx_brand_asset_library_business_id ON brand_asset_library(business_id);
CREATE INDEX idx_brand_audience_profiles_business_id ON brand_audience_profiles(business_id);
CREATE INDEX idx_brand_memory_business_id ON brand_memory(business_id);
CREATE INDEX idx_brand_products_business_id ON brand_products(business_id);

CREATE INDEX idx_generation_sessions_user_id ON generation_sessions(user_id);
CREATE INDEX idx_generation_prompts_session_id ON generation_prompts(session_id);
CREATE INDEX idx_generated_assets_session_id ON generated_assets(session_id);

CREATE INDEX idx_brand_asset_library_asset_type ON brand_asset_library(asset_type);
CREATE INDEX idx_brand_memory_event_type ON brand_memory(event_type);

CREATE INDEX idx_generation_sessions_created_at ON generation_sessions(created_at);
CREATE INDEX idx_generated_assets_created_at ON generated_assets(created_at);


-- 5. ROW LEVEL SECURITY (RLS) POLICIES

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

-- Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (id = auth.uid());

-- Policies for brand_core_identity
CREATE POLICY "Users can manage own brand identity" ON brand_core_identity FOR ALL USING (business_id = auth.uid());

-- Policies for brand_identity_history
CREATE POLICY "Users can view and insert own identity history" ON brand_identity_history FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert own identity history" ON brand_identity_history FOR INSERT WITH CHECK (business_id = auth.uid());

-- Policies for brand_visual_dna
CREATE POLICY "Users can manage own visual dna" ON brand_visual_dna FOR ALL USING (business_id = auth.uid());

-- Policies for brand_visual_dna_history
CREATE POLICY "Users can view and insert own visual dna history" ON brand_visual_dna_history FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert own visual dna history" ON brand_visual_dna_history FOR INSERT WITH CHECK (business_id = auth.uid());

-- Policies for brand_asset_library
CREATE POLICY "Users can manage own asset library" ON brand_asset_library FOR ALL USING (business_id = auth.uid());

-- Policies for brand_audience_profiles
CREATE POLICY "Users can manage own audience profiles" ON brand_audience_profiles FOR ALL USING (business_id = auth.uid());

-- Policies for brand_memory
CREATE POLICY "Users can view own memory" ON brand_memory FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert own memory" ON brand_memory FOR INSERT WITH CHECK (business_id = auth.uid());

-- Policies for brand_products
CREATE POLICY "Users can manage own products" ON brand_products FOR ALL USING (business_id = auth.uid());

-- Policies for generation_sessions
CREATE POLICY "Users can manage own generation sessions" ON generation_sessions FOR ALL USING (user_id = auth.uid());

-- Policies for generation_prompts
CREATE POLICY "Users can manage prompts for own sessions" ON generation_prompts FOR ALL USING (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
);

-- Policies for generated_assets
CREATE POLICY "Users can manage generated assets for own sessions" ON generated_assets FOR ALL USING (
    session_id IN (SELECT id FROM generation_sessions WHERE user_id = auth.uid())
);

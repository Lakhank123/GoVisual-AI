-- =========================================================================
-- Phase 1 Architecture Extensions (Migration 002)
-- Extends the initial schema to fully match the Brand Intelligence Engine
-- Document: Phase 1 Final Architecture (Layers 1-6)
-- Incorporating Production Quality Improvements
-- =========================================================================

-- 1. Create New ENUM Types
CREATE TYPE onboarding_method_enum AS ENUM ('google', 'instagram', 'website', 'manual', 'assets');
CREATE TYPE business_category_enum AS ENUM ('electronics', 'clothing', 'food', 'jewellery', 'pharmacy', 'home_decor', 'salon', 'furniture');
CREATE TYPE logo_bg_type_enum AS ENUM ('light', 'dark', 'transparent');
CREATE TYPE visual_style_enum AS ENUM ('premium', 'friendly', 'festive', 'minimal', 'bold');
CREATE TYPE preferred_background_enum AS ENUM ('dark', 'light', 'gradient', 'contextual', 'outdoor');
CREATE TYPE font_personality_enum AS ENUM ('modern', 'traditional', 'playful', 'elegant', 'bold');
CREATE TYPE primary_language_enum AS ENUM ('english', 'hindi', 'marathi', 'hinglish');
CREATE TYPE brand_tone_enum AS ENUM ('formal', 'casual', 'energetic', 'warm', 'festive');
CREATE TYPE price_positioning_enum AS ENUM ('budget', 'mid', 'premium', 'luxury');
CREATE TYPE memory_module_enum AS ENUM ('creative', 'photoshoot', 'video', 'website', 'caption', 'campaign', 'social');
CREATE TYPE outcome_enum AS ENUM ('approved', 'rejected', 'published', 'ignored', 'edited', 'shared');
CREATE TYPE audience_segment_enum AS ENUM ('youth_18_25', 'young_professionals', 'families', 'parents', 'children', 'senior_citizens', 'tourists', 'students', 'corporate', 'local_neighbourhood', 'high_income', 'budget_conscious');

-- New Production ENUMs for Visual DNA and Assets
CREATE TYPE photography_style_enum AS ENUM ('lifestyle', 'studio', 'candid', 'flat_lay', 'macro');
CREATE TYPE lighting_enum AS ENUM ('natural', 'studio', 'dramatic', 'soft', 'neon');
CREATE TYPE composition_enum AS ENUM ('rule_of_thirds', 'centered', 'minimalist', 'dynamic', 'symmetrical');
CREATE TYPE image_mood_enum AS ENUM ('vibrant', 'dark', 'light', 'moody', 'airy', 'vintage');
CREATE TYPE color_grading_enum AS ENUM ('warm', 'cool', 'high_contrast', 'pastel', 'cinematic');
CREATE TYPE asset_source_enum AS ENUM ('google', 'instagram', 'website', 'upload', 'generated');


-- 2. Modify Trigger Functions to Auto-Increment Version
-- We drop the old AFTER UPDATE triggers from Migration 001 and replace them with BEFORE UPDATE triggers
-- so they can auto-increment the version of the NEW record while archiving the OLD record.

DROP TRIGGER IF EXISTS trigger_brand_core_identity_history ON brand_core_identity;
DROP TRIGGER IF EXISTS trigger_brand_visual_dna_history ON brand_visual_dna;

CREATE OR REPLACE FUNCTION save_brand_core_identity_history_and_increment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_identity_history (business_id, version, archived_at)
    VALUES (OLD.business_id, OLD.version, now());
    
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_brand_core_identity_history 
    BEFORE UPDATE ON brand_core_identity 
    FOR EACH ROW 
    WHEN (OLD.* IS DISTINCT FROM NEW.*) 
    EXECUTE PROCEDURE save_brand_core_identity_history_and_increment();

CREATE OR REPLACE FUNCTION save_brand_visual_dna_history_and_increment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_visual_dna_history (business_id, version, archived_at)
    VALUES (OLD.business_id, OLD.version, now());
    
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_brand_visual_dna_history 
    BEFORE UPDATE ON brand_visual_dna 
    FOR EACH ROW 
    WHEN (OLD.* IS DISTINCT FROM NEW.*) 
    EXECUTE PROCEDURE save_brand_visual_dna_history_and_increment();


-- 3. ALTER brand_core_identity (Layer 1)
ALTER TABLE brand_core_identity
    ADD COLUMN onboarding_complete BOOLEAN DEFAULT false,
    ADD COLUMN onboarding_method onboarding_method_enum,
    ADD COLUMN legal_name VARCHAR(255),
    ADD COLUMN city VARCHAR(255),
    ADD COLUMN locality VARCHAR(255),
    ADD COLUMN google_place_id VARCHAR(255),
    ADD COLUMN google_rating FLOAT,
    ADD COLUMN business_hours VARCHAR(255),
    ADD COLUMN address TEXT,
    ADD COLUMN established_year INT,
    ADD COLUMN logo_url TEXT,
    ADD COLUMN logo_bg_type logo_bg_type_enum,
    ADD COLUMN full_color_palette JSONB,
    ADD COLUMN visual_style visual_style_enum,
    ADD COLUMN preferred_background preferred_background_enum,
    ADD COLUMN font_personality font_personality_enum,
    ADD COLUMN secondary_languages primary_language_enum[], -- PostgreSQL Array
    ADD COLUMN tagline VARCHAR(255),
    ADD COLUMN unique_selling_point TEXT,
    ADD COLUMN brand_personality_tags VARCHAR(255)[],       -- PostgreSQL Array
    ADD COLUMN flagship_products JSONB,
    ADD COLUMN price_positioning price_positioning_enum,
    ADD COLUMN seasonal_products BOOLEAN DEFAULT false,
    ADD COLUMN average_transaction_value VARCHAR(100),
    ADD COLUMN instagram_handle VARCHAR(255),
    ADD COLUMN instagram_connected BOOLEAN DEFAULT false,
    ADD COLUMN instagram_access_token TEXT,
    ADD COLUMN whatsapp_number VARCHAR(50),
    ADD COLUMN website_url TEXT,
    ADD COLUMN upi_id VARCHAR(100),
    ADD COLUMN google_maps_url TEXT;

ALTER TABLE brand_core_identity 
    ALTER COLUMN category TYPE business_category_enum USING category::business_category_enum,
    ALTER COLUMN primary_language TYPE primary_language_enum USING primary_language::primary_language_enum,
    ALTER COLUMN brand_tone TYPE brand_tone_enum USING brand_tone::brand_tone_enum;


-- 4. ALTER brand_visual_dna (Layer 2)
ALTER TABLE brand_visual_dna
    ADD COLUMN photography_style photography_style_enum,
    ADD COLUMN lighting lighting_enum,
    ADD COLUMN composition composition_enum,
    ADD COLUMN image_mood image_mood_enum,
    ADD COLUMN preferred_background preferred_background_enum,
    ADD COLUMN depth_of_field VARCHAR(255),
    ADD COLUMN color_grading color_grading_enum,
    ADD COLUMN logo_preferred_position VARCHAR(100),
    ADD COLUMN logo_safe_zone VARCHAR(100),
    ADD COLUMN watermark_opacity NUMERIC(3,2),
    ADD COLUMN logo_minimum_size INT,
    ADD COLUMN preferred_logo_variant asset_type_enum;


-- 5. ALTER brand_asset_library (Layer 3)
ALTER TABLE brand_asset_library
    ADD COLUMN thumbnail_url TEXT,
    ADD COLUMN mime_type VARCHAR(100),
    ADD COLUMN width_px INT,
    ADD COLUMN height_px INT,
    ADD COLUMN file_size_bytes BIGINT,
    ADD COLUMN tags JSONB,
    ADD COLUMN source asset_source_enum;


-- 6. ALTER brand_audience_profiles (Layer 4)
ALTER TABLE brand_audience_profiles
    ADD COLUMN segments audience_segment_enum[], -- PostgreSQL Array
    ADD COLUMN primary_segment audience_segment_enum,
    ADD COLUMN hyper_local BOOLEAN DEFAULT false,
    ADD COLUMN city_wide BOOLEAN DEFAULT false,
    ADD COLUMN tourist_facing BOOLEAN DEFAULT false,
    ADD COLUMN segment_language_map JSONB,
    ADD COLUMN festivals_relevant VARCHAR(255)[], -- PostgreSQL Array
    ADD COLUMN cricket_relevant BOOLEAN DEFAULT false,
    ADD COLUMN price_visible_in_creatives BOOLEAN DEFAULT false,
    ADD COLUMN offer_driven_audience BOOLEAN DEFAULT false;


-- 7. ALTER brand_memory (Layer 5)
ALTER TABLE brand_memory
    ADD COLUMN module memory_module_enum,
    ADD COLUMN generation_prompt_id UUID REFERENCES generation_prompts(id),
    ADD COLUMN style_used VARCHAR(255),
    ADD COLUMN colors_used VARCHAR(50)[], -- PostgreSQL Array
    ADD COLUMN format_used VARCHAR(100),
    ADD COLUMN festival_context VARCHAR(255),
    ADD COLUMN outcome outcome_enum,
    ADD COLUMN edit_delta JSONB,
    ADD COLUMN engagement_data JSONB,
    ADD COLUMN inferred_preference TEXT,
    ADD COLUMN confidence_score NUMERIC(3,2);

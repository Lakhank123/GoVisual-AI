-- =========================================================================
-- Phase 1 Architecture Extensions (Migration 003)
-- Adds brand_raw_sources table to isolate raw extracted data
-- from the brand_memory (behavioural) table.
-- =========================================================================

CREATE TABLE brand_raw_sources (
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

-- Index for fast lookup by business_id
CREATE INDEX idx_brand_raw_sources_business_id ON brand_raw_sources(business_id);

-- Update trigger for updated_at
CREATE TRIGGER update_brand_raw_sources_modtime 
    BEFORE UPDATE ON brand_raw_sources 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_modified_column();

-- Enable RLS
ALTER TABLE brand_raw_sources ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow read/write by authenticated user mapping to business_id (using existing policy pattern)
CREATE POLICY "Users can manage their own business raw sources" 
    ON brand_raw_sources FOR ALL 
    TO authenticated
    USING (business_id IN (
        SELECT business_id FROM user_profiles WHERE user_id = auth.uid()
    ))
    WITH CHECK (business_id IN (
        SELECT business_id FROM user_profiles WHERE user_id = auth.uid()
    ));

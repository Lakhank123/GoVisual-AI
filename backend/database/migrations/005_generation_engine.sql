-- 005_generation_engine.sql
-- New tables for Module 4: Generation Engine

CREATE TABLE IF NOT EXISTS generation_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES generation_sessions(session_id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generation_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES generation_sessions(session_id),
    generation_hash VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    processing_history JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS generation_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES generation_sessions(session_id),
    event_name VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for quick lookups
CREATE INDEX idx_generation_assets_manifest ON generation_assets(manifest_id);
CREATE INDEX idx_generation_events_session ON generation_events(session_id);
CREATE INDEX idx_generation_manifests_hash ON generation_manifests(generation_hash);

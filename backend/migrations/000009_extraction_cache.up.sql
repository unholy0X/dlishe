-- Extraction cache for deduplicating recipe extractions across users
-- Migration: 000009_extraction_cache

CREATE TABLE extraction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url_hash VARCHAR(64) NOT NULL UNIQUE,      -- SHA256 of normalized URL
    normalized_url TEXT NOT NULL,               -- For debugging/inspection
    extraction_result JSONB NOT NULL,           -- Full recipe + enrichment data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,            -- TTL: created_at + 30 days
    hit_count INT DEFAULT 0                     -- Track cache usage
);

-- Index for fast cache lookups by hash
CREATE INDEX idx_extraction_cache_hash ON extraction_cache(url_hash);

-- Index for cleanup job (delete expired entries)
CREATE INDEX idx_extraction_cache_expires ON extraction_cache(expires_at);

COMMENT ON TABLE extraction_cache IS 'Caches extraction results to avoid redundant AI calls when multiple users extract the same URL';
COMMENT ON COLUMN extraction_cache.url_hash IS 'SHA256 hash of normalized URL for fast lookups';
COMMENT ON COLUMN extraction_cache.normalized_url IS 'Normalized URL (lowercase, tracking params removed, standardized hosts)';
COMMENT ON COLUMN extraction_cache.extraction_result IS 'Full extraction + enrichment result as JSON';
COMMENT ON COLUMN extraction_cache.expires_at IS 'Cache expiration (30 days from creation)';
COMMENT ON COLUMN extraction_cache.hit_count IS 'Number of times this cache entry was used';

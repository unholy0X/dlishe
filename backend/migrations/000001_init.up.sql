-- DishFlow Initial Schema
-- Migration: 000001_init

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_device ON users(device_id) WHERE is_anonymous = TRUE;

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;

-- Recipes
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    servings INTEGER,
    prep_time INTEGER,
    cook_time INTEGER,
    difficulty VARCHAR(20),
    cuisine VARCHAR(100),
    thumbnail_url TEXT,
    source_type VARCHAR(20) DEFAULT 'manual',
    source_url TEXT,
    source_metadata JSONB,
    tags TEXT[],
    is_favorite BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_recipes_user ON recipes(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_updated ON recipes(user_id, updated_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_recipes_favorite ON recipes(user_id, is_favorite) WHERE deleted_at IS NULL AND is_favorite = TRUE;
CREATE INDEX idx_recipes_search ON recipes USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Recipe ingredients
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3),
    unit VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    is_optional BOOLEAN DEFAULT FALSE,
    notes TEXT,
    video_timestamp INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- Recipe steps
CREATE TABLE recipe_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    duration_seconds INTEGER,
    technique VARCHAR(100),
    temperature VARCHAR(50),
    video_timestamp_start INTEGER,
    video_timestamp_end INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);

-- Recipe shares
CREATE TABLE recipe_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(recipe_id, recipient_id)
);

CREATE INDEX idx_recipe_shares_recipient ON recipe_shares(recipient_id);
CREATE INDEX idx_recipe_shares_email ON recipe_shares(recipient_email) WHERE recipient_id IS NULL;

-- Video processing jobs
CREATE TABLE video_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'auto',
    detail_level VARCHAR(20) DEFAULT 'detailed',
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    status_message TEXT,
    result_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    idempotency_key VARCHAR(255),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_jobs_user ON video_jobs(user_id);
CREATE INDEX idx_video_jobs_idempotency ON video_jobs(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_video_jobs_status ON video_jobs(status) WHERE status IN ('pending', 'downloading', 'processing', 'extracting');

-- Pantry items
CREATE TABLE pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 3),
    unit VARCHAR(50),
    expiration_date DATE,
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pantry_items_user ON pantry_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pantry_items_sync ON pantry_items(user_id, updated_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_pantry_items_expiring ON pantry_items(user_id, expiration_date) WHERE deleted_at IS NULL AND expiration_date IS NOT NULL;

-- Shopping lists
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_template BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_shopping_lists_user ON shopping_lists(user_id) WHERE deleted_at IS NULL;

-- Shopping items
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 3),
    unit VARCHAR(50),
    category VARCHAR(50),
    is_checked BOOLEAN DEFAULT FALSE,
    recipe_name VARCHAR(255),
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_shopping_items_list ON shopping_items(list_id) WHERE deleted_at IS NULL;

-- Usage quotas
CREATE TABLE usage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quota_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    used INTEGER DEFAULT 0,
    limit_value INTEGER NOT NULL,
    entitlement VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usage_quotas_unique ON usage_quotas(user_id, quota_type, period_start);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pantry_items_updated_at BEFORE UPDATE ON pantry_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shopping_items_updated_at BEFORE UPDATE ON shopping_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

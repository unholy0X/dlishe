-- DishFlow Subscription Tables
-- Migration: 000002_subscriptions

-- User subscription status (cached from RevenueCat)
CREATE TABLE user_subscriptions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Current status
    entitlement VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT TRUE,

    -- Subscription details
    product_id VARCHAR(100),
    period_type VARCHAR(20),
    store VARCHAR(20),

    -- Dates
    purchased_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Flags
    will_renew BOOLEAN DEFAULT TRUE,
    has_billing_issue BOOLEAN DEFAULT FALSE,
    is_sandbox BOOLEAN DEFAULT FALSE,

    -- Sync tracking
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    revenuecat_updated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_expires ON user_subscriptions(expires_at);
CREATE INDEX idx_user_subscriptions_entitlement ON user_subscriptions(entitlement);
CREATE INDEX idx_user_subscriptions_needs_sync ON user_subscriptions(last_synced_at)
    WHERE entitlement = 'pro';

-- Webhook event log (for idempotency)
CREATE TABLE revenuecat_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    app_user_id VARCHAR(255) NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revenuecat_events_user ON revenuecat_events(app_user_id);
CREATE INDEX idx_revenuecat_events_type ON revenuecat_events(event_type);

-- Apply updated_at trigger
CREATE TRIGGER user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

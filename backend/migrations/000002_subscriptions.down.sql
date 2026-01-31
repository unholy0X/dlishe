-- DishFlow Subscription Tables Rollback
-- Migration: 000002_subscriptions (down)

-- Drop trigger
DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;

-- Drop tables
DROP TABLE IF EXISTS revenuecat_events;
DROP TABLE IF EXISTS user_subscriptions;

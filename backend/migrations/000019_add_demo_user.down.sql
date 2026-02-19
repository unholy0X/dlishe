-- Rollback: remove all demo seed data
-- Migration: 000019_add_demo_user (down)
--
-- Deleting the user cascades to: recipes, recipe_ingredients, recipe_steps,
-- pantry_items, shopping_lists (→ shopping_items), meal_plans (→ meal_plan_entries),
-- user_subscriptions, and usage_quotas.

DELETE FROM users WHERE id = 'd15e0000-0000-0000-0000-000000000001';

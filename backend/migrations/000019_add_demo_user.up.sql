-- Demo user seed data for Apple App Review and always-on test accounts.
-- Migration: 000019_add_demo_user
--
-- Credentials (set matching env vars on the backend and mobile):
--   Email:     appreviewer@dlishe.com
--   Password:  DlisheReview2026!          (only used by the mobile app, not stored here)
--   Demo token: dlishe_demo_7f3a9c2e8b5d1f4a6c0e3b7d9f2a5c8e1b4d7f0a3c6e9b2
--
-- Backend env vars:
--   DEMO_TOKEN=dlishe_demo_7f3a9c2e8b5d1f4a6c0e3b7d9f2a5c8e1b4d7f0a3c6e9b2
--   DEMO_USER_EMAIL=appreviewer@dlishe.com
--
-- All UUIDs are in the d15e0000-xxxx namespace so they're easy to identify.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Demo user
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (id, email, name, clerk_id, preferred_unit_system, created_at, updated_at)
VALUES (
    'd15e0000-0000-0000-0000-000000000001',
    'appreviewer@dlishe.com',
    'Demo Chef',
    'demo_static_dlishe_2026',
    'metric',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Pro subscription (lifetime, no expiry)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO user_subscriptions (
    user_id, entitlement, is_active, product_id, period_type, store, will_renew, last_synced_at
)
VALUES (
    'd15e0000-0000-0000-0000-000000000001',
    'pro', TRUE, 'dlishe_demo_pro', 'lifetime', 'promotional', FALSE, NOW()
)
ON CONFLICT (user_id) DO UPDATE
    SET entitlement = 'pro',
        is_active   = TRUE,
        updated_at  = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Demo recipes
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO recipes (id, user_id, title, description, servings, prep_time, cook_time, difficulty, cuisine, source_type, tags, is_favorite)
VALUES
    ('d15e0000-0000-0000-0000-000000000101',
     'd15e0000-0000-0000-0000-000000000001',
     'Classic Spaghetti Carbonara',
     'A silky Roman pasta made with eggs, guanciale and Pecorino Romano — no cream needed.',
     2, 10, 20, 'easy', 'Italian', 'manual',
     ARRAY['pasta','italian','quick','classic'], TRUE),

    ('d15e0000-0000-0000-0000-000000000102',
     'd15e0000-0000-0000-0000-000000000001',
     'Chicken Tikka Masala',
     'Tender marinated chicken in a rich, spiced tomato-cream sauce. Serve with basmati rice.',
     4, 30, 40, 'medium', 'Indian', 'manual',
     ARRAY['chicken','indian','curry','spicy'], FALSE),

    ('d15e0000-0000-0000-0000-000000000103',
     'd15e0000-0000-0000-0000-000000000001',
     'Avocado Toast with Poached Eggs',
     'Creamy avocado on crusty sourdough topped with perfectly poached eggs and chilli flakes.',
     1, 5, 10, 'easy', 'Fusion', 'manual',
     ARRAY['breakfast','vegetarian','quick','healthy'], FALSE),

    ('d15e0000-0000-0000-0000-000000000104',
     'd15e0000-0000-0000-0000-000000000001',
     'Crispy Beef Tacos',
     'Seasoned ground beef in crispy taco shells with fresh salsa, sour cream and guacamole.',
     4, 15, 20, 'easy', 'Mexican', 'manual',
     ARRAY['tacos','mexican','beef','dinner'], FALSE),

    ('d15e0000-0000-0000-0000-000000000105',
     'd15e0000-0000-0000-0000-000000000001',
     'Garlic Vegetable Stir-Fry',
     'A colourful mix of seasonal vegetables tossed in a savoury garlic-soy sauce. Ready in 15 minutes.',
     2, 10, 15, 'easy', 'Asian', 'manual',
     ARRAY['vegetarian','vegan','quick','healthy'], FALSE),

    ('d15e0000-0000-0000-0000-000000000106',
     'd15e0000-0000-0000-0000-000000000001',
     'Chocolate Lava Cake',
     'Individual dark-chocolate cakes with a warm molten centre. Serve with vanilla ice cream.',
     4, 15, 12, 'medium', 'French', 'manual',
     ARRAY['dessert','chocolate','baking','dinner-party'], FALSE)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Recipe ingredients
-- ─────────────────────────────────────────────────────────────────────────────

-- Carbonara
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, category, sort_order) VALUES
    ('d15e0000-0000-0000-0000-000000000101', 'spaghetti',          200, 'g',    'Grains',     0),
    ('d15e0000-0000-0000-0000-000000000101', 'guanciale',          100, 'g',    'Proteins',   1),
    ('d15e0000-0000-0000-0000-000000000101', 'egg yolks',            4, NULL,   'Dairy',      2),
    ('d15e0000-0000-0000-0000-000000000101', 'Pecorino Romano',     60, 'g',    'Dairy',      3),
    ('d15e0000-0000-0000-0000-000000000101', 'black pepper',      NULL, NULL,   'Condiments', 4);

-- Chicken Tikka Masala
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, category, sort_order) VALUES
    ('d15e0000-0000-0000-0000-000000000102', 'chicken breast',     600, 'g',    'Proteins',   0),
    ('d15e0000-0000-0000-0000-000000000102', 'Greek yogurt',       150, 'ml',   'Dairy',      1),
    ('d15e0000-0000-0000-0000-000000000102', 'garam masala',         2, 'tsp',  'Condiments', 2),
    ('d15e0000-0000-0000-0000-000000000102', 'canned tomatoes',    400, 'g',    'Produce',    3),
    ('d15e0000-0000-0000-0000-000000000102', 'heavy cream',        100, 'ml',   'Dairy',      4),
    ('d15e0000-0000-0000-0000-000000000102', 'basmati rice',       300, 'g',    'Grains',     5);

-- Avocado Toast
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, category, sort_order) VALUES
    ('d15e0000-0000-0000-0000-000000000103', 'sourdough bread',      2, 'slices','Grains',    0),
    ('d15e0000-0000-0000-0000-000000000103', 'ripe avocado',         1, NULL,    'Produce',   1),
    ('d15e0000-0000-0000-0000-000000000103', 'eggs',                 2, NULL,    'Dairy',     2),
    ('d15e0000-0000-0000-0000-000000000103', 'lemon juice',          1, 'tsp',   'Produce',   3),
    ('d15e0000-0000-0000-0000-000000000103', 'chilli flakes',     NULL, NULL,    'Condiments',4);

-- Beef Tacos
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, category, sort_order) VALUES
    ('d15e0000-0000-0000-0000-000000000104', 'ground beef',        400, 'g',    'Proteins',   0),
    ('d15e0000-0000-0000-0000-000000000104', 'taco shells',          8, NULL,   'Grains',     1),
    ('d15e0000-0000-0000-0000-000000000104', 'tomatoes',             2, NULL,   'Produce',    2),
    ('d15e0000-0000-0000-0000-000000000104', 'sour cream',          60, 'ml',   'Dairy',      3),
    ('d15e0000-0000-0000-0000-000000000104', 'taco seasoning',       1, 'tbsp', 'Condiments', 4);

-- Stir-Fry
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, category, sort_order) VALUES
    ('d15e0000-0000-0000-0000-000000000105', 'broccoli',           200, 'g',    'Produce',    0),
    ('d15e0000-0000-0000-0000-000000000105', 'bell peppers',         2, NULL,   'Produce',    1),
    ('d15e0000-0000-0000-0000-000000000105', 'garlic',               4, 'cloves','Produce',   2),
    ('d15e0000-0000-0000-0000-000000000105', 'soy sauce',            3, 'tbsp', 'Condiments', 3),
    ('d15e0000-0000-0000-0000-000000000105', 'sesame oil',           1, 'tbsp', 'Condiments', 4),
    ('d15e0000-0000-0000-0000-000000000105', 'snap peas',          150, 'g',    'Produce',    5);

-- Chocolate Lava Cake
INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, category, sort_order) VALUES
    ('d15e0000-0000-0000-0000-000000000106', 'dark chocolate (70%)', 200, 'g',  'Pantry',     0),
    ('d15e0000-0000-0000-0000-000000000106', 'butter',              100, 'g',   'Dairy',      1),
    ('d15e0000-0000-0000-0000-000000000106', 'eggs',                  4, NULL,  'Dairy',      2),
    ('d15e0000-0000-0000-0000-000000000106', 'caster sugar',         80, 'g',   'Pantry',     3),
    ('d15e0000-0000-0000-0000-000000000106', 'plain flour',          40, 'g',   'Grains',     4);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Recipe steps
-- ─────────────────────────────────────────────────────────────────────────────

-- Carbonara
INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    ('d15e0000-0000-0000-0000-000000000101', 1, 'Cook spaghetti in well-salted boiling water until al dente. Reserve 1 cup of pasta water.'),
    ('d15e0000-0000-0000-0000-000000000101', 2, 'Fry guanciale in a cold pan over medium heat until crispy. Remove from heat and set aside.'),
    ('d15e0000-0000-0000-0000-000000000101', 3, 'Whisk egg yolks with grated Pecorino Romano and a generous amount of cracked black pepper.'),
    ('d15e0000-0000-0000-0000-000000000101', 4, 'Add hot pasta to the guanciale pan off the heat. Quickly mix in the egg mixture, adding pasta water a splash at a time until silky. Serve immediately.');

-- Tikka Masala
INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    ('d15e0000-0000-0000-0000-000000000102', 1, 'Marinate chicken in yogurt, half the garam masala and a pinch of salt for at least 30 minutes.'),
    ('d15e0000-0000-0000-0000-000000000102', 2, 'Grill or pan-fry the marinated chicken until charred at the edges. Set aside.'),
    ('d15e0000-0000-0000-0000-000000000102', 3, 'Sauté onions and garlic until golden. Add remaining spices and cook for 1 minute. Add canned tomatoes and simmer 15 minutes.'),
    ('d15e0000-0000-0000-0000-000000000102', 4, 'Blend the sauce until smooth. Return to pan, add cream and chicken. Simmer 10 minutes. Serve over basmati rice.');

-- Avocado Toast
INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    ('d15e0000-0000-0000-0000-000000000103', 1, 'Toast the sourdough slices until golden and crisp.'),
    ('d15e0000-0000-0000-0000-000000000103', 2, 'Mash avocado with lemon juice, salt and pepper.'),
    ('d15e0000-0000-0000-0000-000000000103', 3, 'Poach eggs in barely simmering water with a splash of vinegar for 3 minutes.'),
    ('d15e0000-0000-0000-0000-000000000103', 4, 'Spread avocado on toast, top with poached eggs and sprinkle with chilli flakes.');

-- Beef Tacos
INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    ('d15e0000-0000-0000-0000-000000000104', 1, 'Brown ground beef in a hot pan. Drain excess fat.'),
    ('d15e0000-0000-0000-0000-000000000104', 2, 'Add taco seasoning and a splash of water. Cook 2 minutes until fragrant.'),
    ('d15e0000-0000-0000-0000-000000000104', 3, 'Warm taco shells in the oven at 180°C for 5 minutes.'),
    ('d15e0000-0000-0000-0000-000000000104', 4, 'Fill shells with beef, diced tomatoes, sour cream and your favourite toppings.');

-- Stir-Fry
INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    ('d15e0000-0000-0000-0000-000000000105', 1, 'Heat a wok or large pan over high heat until smoking.'),
    ('d15e0000-0000-0000-0000-000000000105', 2, 'Add sesame oil, then garlic. Stir-fry 30 seconds.'),
    ('d15e0000-0000-0000-0000-000000000105', 3, 'Add broccoli and peppers. Stir-fry 3–4 minutes until tender-crisp.'),
    ('d15e0000-0000-0000-0000-000000000105', 4, 'Add snap peas and soy sauce. Toss for 1 minute. Serve immediately.');

-- Lava Cake
INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    ('d15e0000-0000-0000-0000-000000000106', 1, 'Preheat oven to 200°C. Butter and flour 4 ramekins.'),
    ('d15e0000-0000-0000-0000-000000000106', 2, 'Melt chocolate and butter together over a bain-marie. Let cool slightly.'),
    ('d15e0000-0000-0000-0000-000000000106', 3, 'Whisk eggs and sugar until pale. Fold in chocolate mixture, then flour.'),
    ('d15e0000-0000-0000-0000-000000000106', 4, 'Pour into ramekins and bake 10–12 minutes. The edges should be set but the centre still soft. Turn out and serve immediately.');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Pantry items
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO pantry_items (id, user_id, name, category, quantity, unit)
VALUES
    ('d15e0000-0000-0000-0000-000000000201', 'd15e0000-0000-0000-0000-000000000001', 'Spaghetti',       'Grains',     500,  'g'),
    ('d15e0000-0000-0000-0000-000000000202', 'd15e0000-0000-0000-0000-000000000001', 'Eggs',            'Dairy',        6,  NULL),
    ('d15e0000-0000-0000-0000-000000000203', 'd15e0000-0000-0000-0000-000000000001', 'Parmesan cheese', 'Dairy',      100,  'g'),
    ('d15e0000-0000-0000-0000-000000000204', 'd15e0000-0000-0000-0000-000000000001', 'Olive oil',       'Condiments', 250,  'ml'),
    ('d15e0000-0000-0000-0000-000000000205', 'd15e0000-0000-0000-0000-000000000001', 'Garlic',          'Produce',      1,  'head'),
    ('d15e0000-0000-0000-0000-000000000206', 'd15e0000-0000-0000-0000-000000000001', 'Chicken breast',  'Proteins',   400,  'g'),
    ('d15e0000-0000-0000-0000-000000000207', 'd15e0000-0000-0000-0000-000000000001', 'Basmati rice',    'Grains',     500,  'g'),
    ('d15e0000-0000-0000-0000-000000000208', 'd15e0000-0000-0000-0000-000000000001', 'Avocado',         'Produce',      2,  NULL)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Shopping list + items
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO shopping_lists (id, user_id, name, description)
VALUES (
    'd15e0000-0000-0000-0000-000000000301',
    'd15e0000-0000-0000-0000-000000000001',
    'This week''s groceries',
    'Ingredients for Carbonara and Tikka Masala'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shopping_items (id, list_id, name, quantity, unit, category)
VALUES
    ('d15e0000-0000-0000-0000-000000000311', 'd15e0000-0000-0000-0000-000000000301', 'Guanciale',      150, 'g',   'Proteins'),
    ('d15e0000-0000-0000-0000-000000000312', 'd15e0000-0000-0000-0000-000000000301', 'Pecorino Romano', 80, 'g',   'Dairy'),
    ('d15e0000-0000-0000-0000-000000000313', 'd15e0000-0000-0000-0000-000000000301', 'Canned tomatoes',400, 'g',   'Produce'),
    ('d15e0000-0000-0000-0000-000000000314', 'd15e0000-0000-0000-0000-000000000301', 'Greek yogurt',   150, 'ml',  'Dairy'),
    ('d15e0000-0000-0000-0000-000000000315', 'd15e0000-0000-0000-0000-000000000301', 'Garam masala',     1, 'jar', 'Condiments')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Meal plan (current week)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO meal_plans (id, user_id, week_start, title)
VALUES (
    'd15e0000-0000-0000-0000-000000000401',
    'd15e0000-0000-0000-0000-000000000001',
    date_trunc('week', CURRENT_DATE)::date,
    'Demo week'
)
ON CONFLICT (user_id, week_start) DO NOTHING;

INSERT INTO meal_plan_entries (id, plan_id, recipe_id, day_index, meal_type, sort_order)
VALUES
    ('d15e0000-0000-0000-0000-000000000411',
     'd15e0000-0000-0000-0000-000000000401',
     'd15e0000-0000-0000-0000-000000000103', 0, 'breakfast', 0),  -- Mon breakfast: Avocado Toast
    ('d15e0000-0000-0000-0000-000000000412',
     'd15e0000-0000-0000-0000-000000000401',
     'd15e0000-0000-0000-0000-000000000101', 1, 'dinner',    0),  -- Tue dinner: Carbonara
    ('d15e0000-0000-0000-0000-000000000413',
     'd15e0000-0000-0000-0000-000000000401',
     'd15e0000-0000-0000-0000-000000000102', 2, 'dinner',    0),  -- Wed dinner: Tikka Masala
    ('d15e0000-0000-0000-0000-000000000414',
     'd15e0000-0000-0000-0000-000000000401',
     'd15e0000-0000-0000-0000-000000000104', 4, 'lunch',     0)   -- Fri lunch: Beef Tacos
ON CONFLICT (id) DO NOTHING;

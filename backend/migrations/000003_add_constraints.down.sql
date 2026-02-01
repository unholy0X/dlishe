-- Rollback constraints added in 000003_add_constraints.up.sql

ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS check_ingredient_name;
ALTER TABLE shopping_items DROP CONSTRAINT IF EXISTS check_shopping_name;
ALTER TABLE pantry_items DROP CONSTRAINT IF EXISTS check_pantry_name;
ALTER TABLE shopping_lists DROP CONSTRAINT IF EXISTS check_list_name;

ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS check_ingredient_quantity;
ALTER TABLE shopping_items DROP CONSTRAINT IF EXISTS check_shopping_quantity;
ALTER TABLE pantry_items DROP CONSTRAINT IF EXISTS check_pantry_quantity;

ALTER TABLE pantry_items DROP CONSTRAINT IF EXISTS unique_pantry_item;

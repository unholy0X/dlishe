-- Add database constraints for fault tolerance
-- This migration adds constraints to prevent data inconsistencies

-- 1. Pantry item uniqueness (prevent duplicates when completing shopping lists)
ALTER TABLE pantry_items 
ADD CONSTRAINT unique_pantry_item UNIQUE (user_id, name, category);

-- 2. Quantity validation (no negatives)
ALTER TABLE pantry_items
ADD CONSTRAINT check_pantry_quantity CHECK (quantity IS NULL OR quantity >= 0);

ALTER TABLE shopping_items
ADD CONSTRAINT check_shopping_quantity CHECK (quantity IS NULL OR quantity >= 0);

ALTER TABLE recipe_ingredients
ADD CONSTRAINT check_ingredient_quantity CHECK (quantity IS NULL OR quantity >= 0);

-- 3. Non-empty names
ALTER TABLE shopping_lists
ADD CONSTRAINT check_list_name CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE pantry_items
ADD CONSTRAINT check_pantry_name CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE shopping_items
ADD CONSTRAINT check_shopping_name CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE recipe_ingredients
ADD CONSTRAINT check_ingredient_name CHECK (LENGTH(TRIM(name)) > 0);

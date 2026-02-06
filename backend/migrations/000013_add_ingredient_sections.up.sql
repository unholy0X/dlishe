-- Add section grouping to ingredients
-- Migration: 000013_add_ingredient_sections

ALTER TABLE recipe_ingredients ADD COLUMN section VARCHAR(100) DEFAULT 'Main';

-- Index for faster filtering by section if needed
CREATE INDEX idx_recipe_ingredients_section ON recipe_ingredients(section);

-- Revert add section grouping
-- Migration: 000013_add_ingredient_sections

ALTER TABLE recipe_ingredients DROP COLUMN section;

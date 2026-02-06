-- Remove expiration_date from pantry (adds complexity with no real value)
ALTER TABLE pantry_items DROP COLUMN IF EXISTS expiration_date;

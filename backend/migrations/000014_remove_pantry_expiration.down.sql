-- Re-add expiration_date to pantry
ALTER TABLE pantry_items ADD COLUMN expiration_date TIMESTAMPTZ;

-- No schema changes needed: access checks in Go code now allow featured recipes
-- to be viewed and cloned without requiring is_public = true.
-- This empty migration exists to keep the migration sequence consistent.
SELECT 1;

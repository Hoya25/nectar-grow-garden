-- Remove old sample brands from database
DELETE FROM brands WHERE loyalize_id LIKE 'sample-%' OR name LIKE '%Sample%';
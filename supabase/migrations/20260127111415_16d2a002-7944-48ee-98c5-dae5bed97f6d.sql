-- Restore all brands with real Loyalize API connections (numeric IDs indicate real API imports)
-- Keep deactivated: manual entries (gc-*, *-001, fallback*) and Amazon gift cards

UPDATE brands 
SET is_active = true, updated_at = now() 
WHERE 
  -- Has a numeric Loyalize ID (real API import)
  loyalize_id ~ '^[0-9]+$'
  -- Exclude Amazon gift cards (no commission)
  AND name NOT ILIKE '%amazon%gift%';
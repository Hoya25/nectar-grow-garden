-- Deactivate all fake/manual/placeholder brand entries that lack real affiliate data
-- This keeps only authentic Loyalize-imported brands with real commissions

UPDATE brands 
SET is_active = false, updated_at = now() 
WHERE 
  -- Manual gift card entries
  loyalize_id LIKE 'gc-%'
  -- Manual brand entries
  OR loyalize_id LIKE '%-001'
  -- Fallback/placeholder entries
  OR loyalize_id LIKE 'fallback%'
  -- Entries with no logo (likely incomplete imports)
  OR logo_url IS NULL
  -- Entries with placeholder logos
  OR logo_url LIKE '%placeholder%';
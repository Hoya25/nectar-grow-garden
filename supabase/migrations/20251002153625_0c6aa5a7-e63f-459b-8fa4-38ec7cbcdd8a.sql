-- Deactivate duplicate Fanatics opportunity (older one from Sept 21)
-- Keep only the newer one from Oct 1
UPDATE earning_opportunities 
SET is_active = false 
WHERE id = '8847db62-4a02-4d04-b1f6-e213835c6481'
  AND partner_name = 'Fanatics'
  AND title = 'Shop with Fanatics';
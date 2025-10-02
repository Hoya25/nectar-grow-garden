-- Update Fanatics affiliate link to use direct Fanatics.com URL
-- The Impact.com tracking link appears to be invalid, so we'll use the direct URL
-- and let the Impact.com integration handle tracking when available

UPDATE earning_opportunities 
SET affiliate_link = 'https://www.fanatics.com'
WHERE id = 'e58b75c2-cb06-42a4-a903-810c96ca8e73'
  AND partner_name = 'Fanatics'
  AND title = 'Shop with Fanatics';
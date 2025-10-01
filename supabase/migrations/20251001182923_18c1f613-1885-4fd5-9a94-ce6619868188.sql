-- Fix Uber Gift Card opportunity to properly link to brands table
-- This enables webhook purchase tracking for Uber purchases

UPDATE earning_opportunities
SET 
  brand_id = 'd8b29d2d-28e8-4886-a8a8-4aa02b7196d7', -- Link to Uber Gift Card brand
  affiliate_link = 'https://link.loyalize.com/stores/44820?user_tracking_id={{TRACKING_ID}}'
WHERE id = 'f69f4c47-a748-43d3-9802-823f1b17d9eb';

-- Verify the update
SELECT 
  id,
  title,
  partner_name,
  brand_id,
  affiliate_link
FROM earning_opportunities
WHERE id = 'f69f4c47-a748-43d3-9802-823f1b17d9eb';
-- Fix Loyalize tracking URLs to use correct parameter names
-- Loyalize API requires 'cid' (client ID) parameter, not 'cp'

UPDATE earning_opportunities
SET affiliate_link = 'https://api.loyalize.com/v1/stores/30095/tracking?pid=thegarden.nctr.live&cid={{USER_ID}}&sid={{TRACKING_ID}}'
WHERE partner_name = 'Nobull' 
  AND brand_id = '77cffb93-a540-4f2f-8432-c5e5613e6f4b';

UPDATE earning_opportunities  
SET affiliate_link = 'https://api.loyalize.com/v1/stores/44820/tracking?pid=thegarden.nctr.live&cid={{USER_ID}}&sid={{TRACKING_ID}}'
WHERE partner_name = 'Uber Gift Card'
  AND brand_id = 'd8b29d2d-28e8-4886-a8a8-4aa02b7196d7';
-- Fix Loyalize tracking URLs to use API format instead of link.loyalize.com
-- This fixes SSL certificate issues

UPDATE earning_opportunities
SET affiliate_link = 'https://api.loyalize.com/v1/stores/30095/tracking?pid=thegarden.nctr.live&cp={{USER_ID}}&sid={{TRACKING_ID}}'
WHERE partner_name = 'Nobull' 
  AND affiliate_link LIKE '%link.loyalize.com/stores/30095%';

UPDATE earning_opportunities  
SET affiliate_link = 'https://api.loyalize.com/v1/stores/44820/tracking?pid=thegarden.nctr.live&cp={{USER_ID}}&sid={{TRACKING_ID}}'
WHERE partner_name = 'Uber Gift Card'
  AND affiliate_link LIKE '%link.loyalize.com/stores/44820%';
-- Update Loyalize affiliate links to use our redirect endpoint
-- This fixes 401 authentication errors by routing through our edge function

UPDATE earning_opportunities
SET affiliate_link = 'https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=30095&user={{USER_ID}}&tracking={{TRACKING_ID}}'
WHERE partner_name = 'Nobull' 
  AND brand_id = '77cffb93-a540-4f2f-8432-c5e5613e6f4b';

UPDATE earning_opportunities  
SET affiliate_link = 'https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=44820&user={{USER_ID}}&tracking={{TRACKING_ID}}'
WHERE partner_name = 'Uber Gift Card'
  AND brand_id = 'd8b29d2d-28e8-4886-a8a8-4aa02b7196d7';
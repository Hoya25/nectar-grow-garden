-- Fix the Uber Gift Card opportunity link to use correct Loyalize format
UPDATE earning_opportunities
SET affiliate_link = 'https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=44820&user={{USER_ID}}&tracking={{TRACKING_ID}}'
WHERE id = 'f69f4c47-a748-43d3-9802-823f1b17d9eb';
-- Fix Fanatics Impact.com link to use correct two-segment format
-- Remove the middle segment (9663) and keep proper accountSid/campaignId structure
UPDATE public.earning_opportunities
SET affiliate_link = 'https://go.impact.com/campaign-promo/IRg7DmdWemry3036244GbZRuH5babW59Q1?url=https%3A%2F%2Fwww.fanatics.com',
    updated_at = now()
WHERE title = 'Shop with Fanatics'
  AND partner_name = 'Fanatics';
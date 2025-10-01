-- Fix Fanatics affiliate link to point to actual Fanatics website
UPDATE public.earning_opportunities
SET affiliate_link = 'https://go.impact.com/campaign-promo/IRg7DmdWemry3036244GbZRuH5babW59Q1/9663?url=https%3A%2F%2Fwww.fanatics.com',
    updated_at = now()
WHERE title = 'Shop with Fanatics'
  AND partner_name = 'Fanatics';
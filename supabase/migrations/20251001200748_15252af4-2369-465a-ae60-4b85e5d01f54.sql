-- Use Impact.com's proper deep link format without the url parameter
-- This should redirect through their tracking system to the advertiser's site
UPDATE public.earning_opportunities
SET affiliate_link = 'https://go.impact.com/campaign-promo/IRg7DmdWemry3036244GbZRuH5babW59Q1/9663',
    updated_at = now()
WHERE title = 'Shop with Fanatics'
  AND partner_name = 'Fanatics';
-- Fix Fanatics link - restore the required 3-segment Impact.com format
-- Format: https://go.impact.com/campaign-promo/{accountSid}/{campaignId}?url={destination}
UPDATE public.earning_opportunities
SET affiliate_link = 'https://go.impact.com/campaign-promo/IRg7DmdWemry3036244GbZRuH5babW59Q1/9663?url=https%3A%2F%2Fwww.fanatics.com',
    updated_at = now()
WHERE title = 'Shop with Fanatics'
  AND partner_name = 'Fanatics';
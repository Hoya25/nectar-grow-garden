-- Update Fanatics link with correct Account SID
UPDATE public.earning_opportunities
SET affiliate_link = 'https://app.impact.com/campaign-promo-redirect/3/3036244/9663',
    updated_at = now()
WHERE title = 'Shop with Fanatics'
  AND partner_name = 'Fanatics';
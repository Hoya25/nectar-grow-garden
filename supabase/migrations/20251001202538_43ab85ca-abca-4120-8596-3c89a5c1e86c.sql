-- Temporarily remove the Fanatics link so admin can re-add it properly via Impact Brand Search
UPDATE public.earning_opportunities
SET affiliate_link = NULL,
    partner_logo_url = NULL,
    updated_at = now()
WHERE title = 'Shop with Fanatics'
  AND partner_name = 'Fanatics';
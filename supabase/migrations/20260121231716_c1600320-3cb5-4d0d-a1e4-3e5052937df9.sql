-- Fix Security Definer View warning by recreating as SECURITY INVOKER

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.public_brands_safe;

CREATE VIEW public.public_brands_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  description,
  logo_url,
  website_url,
  category,
  featured,
  is_active
FROM public.brands
WHERE is_active = true;

-- Re-grant permissions
GRANT SELECT ON public.public_brands_safe TO anon;
GRANT SELECT ON public.public_brands_safe TO authenticated;

COMMENT ON VIEW public.public_brands_safe IS 'Safe public view of brands without sensitive commission data - uses security invoker';
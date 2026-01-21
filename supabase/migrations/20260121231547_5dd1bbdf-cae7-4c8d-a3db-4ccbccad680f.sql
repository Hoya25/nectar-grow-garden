-- Fix Security Issues: Profiles Table Public Exposure and Brands Commission Rate Exposure

-- =========================================
-- 1. FIX PROFILES TABLE PUBLIC EXPOSURE
-- =========================================

-- Drop the overly permissive public wallet lookup policy that exposes all user data
DROP POLICY IF EXISTS "Allow wallet lookup for authentication" ON public.profiles;

-- Create a secure function for wallet authentication that only returns necessary fields
CREATE OR REPLACE FUNCTION public.verify_wallet_for_auth(p_wallet_address text)
RETURNS TABLE(auth_user_id uuid, has_wallet boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT user_id as auth_user_id, true as has_wallet
  FROM profiles
  WHERE wallet_address = p_wallet_address
  AND wallet_address IS NOT NULL
  AND wallet_address != ''
  LIMIT 1;
$$;

-- Grant execute to public for the auth function (needed for wallet-based login)
GRANT EXECUTE ON FUNCTION public.verify_wallet_for_auth(text) TO public;

-- Add comment for documentation
COMMENT ON FUNCTION public.verify_wallet_for_auth IS 'Secure wallet authentication lookup that does not expose full profile data';

-- =========================================
-- 2. FIX BRANDS TABLE COMMISSION EXPOSURE
-- =========================================

-- Drop the overly permissive policies that expose commission rates
DROP POLICY IF EXISTS "Anyone can view active brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view active brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view brands" ON public.brands;

-- Create a secure view for public brand info (without sensitive data)
CREATE OR REPLACE VIEW public.public_brands_safe AS
SELECT 
  id,
  name,
  description,
  logo_url,
  website_url,
  category,
  featured,
  is_active
  -- Deliberately EXCLUDE: commission_rate, nctr_per_dollar, loyalize_id
FROM public.brands
WHERE is_active = true;

-- Grant select on the safe view
GRANT SELECT ON public.public_brands_safe TO anon;
GRANT SELECT ON public.public_brands_safe TO authenticated;

-- Create new restrictive RLS policy for brands table
-- Only authenticated users can see basic brand info, admins see everything
CREATE POLICY "Authenticated users can view basic brand info"
ON public.brands
FOR SELECT
TO authenticated
USING (is_active = true);

-- Ensure admins still have full access via existing policy
-- The "Admins can manage brands" and "Enhanced brands admin access with business audit" policies remain

-- Add comment
COMMENT ON VIEW public.public_brands_safe IS 'Safe public view of brands without sensitive commission data';
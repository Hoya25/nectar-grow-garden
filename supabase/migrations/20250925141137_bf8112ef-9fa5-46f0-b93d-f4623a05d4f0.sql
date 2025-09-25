-- Create a secure function that returns only safe profile fields for referral relationships
CREATE OR REPLACE FUNCTION public.get_safe_referral_profile(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone
) AS $$
BEGIN
  -- Only return safe, non-sensitive profile fields for referral display
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a function to check if two users have a referral relationship
CREATE OR REPLACE FUNCTION public.has_referral_relationship(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE (r.referrer_user_id = user1_id AND r.referred_user_id = user2_id)
       OR (r.referrer_user_id = user2_id AND r.referred_user_id = user1_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop the problematic policy that exposes sensitive data
DROP POLICY IF EXISTS "Users can view referral-related profiles" ON public.profiles;

-- Create a new, more restrictive policy for referral profile access
-- This policy will be used by the new secure functions only, not direct table access
CREATE POLICY "Restricted referral profile access"
ON public.profiles
FOR SELECT
USING (
  -- Users can only see their own full profile
  auth.uid() = user_id
  -- Admin access remains the same for administrative purposes
  OR (get_admin_financial_access_secure() AND (( SELECT log_sensitive_access('admin_profile_access'::text, 'profiles'::text, profiles.id, 'high'::text) AS log_sensitive_access) IS NULL))
);
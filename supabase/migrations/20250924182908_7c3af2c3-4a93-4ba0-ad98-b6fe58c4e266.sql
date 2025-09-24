-- Fix referral display issue - Simple approach
-- Add a permissive RLS policy to allow users to see profiles of people in their referral network

-- Add policy to allow users to see profiles of people they have referral relationships with
CREATE POLICY "Users can view referral-related profiles"
ON public.profiles
FOR SELECT
USING (
  -- Users can see profiles of people they referred or who referred them
  EXISTS (
    SELECT 1 FROM referrals r 
    WHERE (r.referrer_user_id = auth.uid() AND r.referred_user_id = profiles.user_id)
    OR (r.referred_user_id = auth.uid() AND r.referrer_user_id = profiles.user_id)
  )
);

-- Create a helper function to get referral data with names (simpler approach)
CREATE OR REPLACE FUNCTION public.get_user_referrals_with_names(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  referrer_user_id uuid,
  referred_user_id uuid,
  referral_code text,
  status text,
  reward_credited boolean,
  created_at timestamp with time zone,
  rewarded_at timestamp with time zone,
  referrer_name text,
  referrer_email text,
  referee_name text,
  referee_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.referrer_user_id,
    r.referred_user_id,
    r.referral_code,
    r.status,
    r.reward_credited,
    r.created_at,
    r.rewarded_at,
    referrer_profile.full_name as referrer_name,
    referrer_profile.email as referrer_email,
    referee_profile.full_name as referee_name,
    referee_profile.email as referee_email
  FROM referrals r
  LEFT JOIN profiles referrer_profile ON r.referrer_user_id = referrer_profile.user_id
  LEFT JOIN profiles referee_profile ON r.referred_user_id = referee_profile.user_id
  WHERE r.referrer_user_id = p_user_id OR r.referred_user_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_user_referrals_with_names IS 'Get referral data with participant names for a specific user';
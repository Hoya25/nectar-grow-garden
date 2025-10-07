-- Create function to get referral verification data
CREATE OR REPLACE FUNCTION public.get_referral_verification_data()
RETURNS TABLE (
  referral_id uuid,
  referrer_user_id uuid,
  referred_user_id uuid,
  referral_code text,
  status text,
  reward_credited boolean,
  created_at timestamptz,
  rewarded_at timestamptz,
  referrer_name text,
  referrer_email text,
  referee_name text,
  referee_email text,
  referee_profile_complete boolean,
  referee_has_transactions boolean,
  referee_transaction_count bigint,
  referee_nctr_earned numeric,
  referee_account_age_days integer,
  referee_wallet_connected boolean,
  same_day_signup boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as referral_id,
    r.referrer_user_id,
    r.referred_user_id,
    r.referral_code,
    r.status,
    r.reward_credited,
    r.created_at,
    r.rewarded_at,
    referrer_p.full_name as referrer_name,
    referrer_p.email as referrer_email,
    referee_p.full_name as referee_name,
    referee_p.email as referee_email,
    -- Profile completeness check
    CASE 
      WHEN referee_p.full_name IS NOT NULL 
        AND referee_p.email IS NOT NULL 
      THEN true 
      ELSE false 
    END as referee_profile_complete,
    -- Has any transactions
    EXISTS(
      SELECT 1 FROM nctr_transactions t 
      WHERE t.user_id = r.referred_user_id
    ) as referee_has_transactions,
    -- Transaction count
    COALESCE((
      SELECT COUNT(*) FROM nctr_transactions t 
      WHERE t.user_id = r.referred_user_id
    ), 0) as referee_transaction_count,
    -- Total NCTR earned
    COALESCE((
      SELECT SUM(nctr_amount) FROM nctr_transactions t 
      WHERE t.user_id = r.referred_user_id
    ), 0) as referee_nctr_earned,
    -- Account age in days
    EXTRACT(DAY FROM (NOW() - referee_p.created_at))::integer as referee_account_age_days,
    -- Wallet connected
    CASE 
      WHEN referee_p.wallet_address IS NOT NULL 
      THEN true 
      ELSE false 
    END as referee_wallet_connected,
    -- Same day signup (potential bot pattern)
    DATE(r.created_at) = DATE(referee_p.created_at) as same_day_signup
  FROM referrals r
  LEFT JOIN profiles referrer_p ON r.referrer_user_id = referrer_p.user_id
  LEFT JOIN profiles referee_p ON r.referred_user_id = referee_p.user_id
  ORDER BY r.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users with admin role
GRANT EXECUTE ON FUNCTION public.get_referral_verification_data() TO authenticated;
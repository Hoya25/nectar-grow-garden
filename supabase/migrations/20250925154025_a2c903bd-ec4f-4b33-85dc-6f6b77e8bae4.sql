-- Remove overly restrictive referral rate limits for legitimate community building
-- while maintaining protection against actual abuse patterns

-- Update the referral security function to be less restrictive for normal usage
CREATE OR REPLACE FUNCTION public.validate_referral_request(
  p_referrer_id uuid,
  p_referee_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referral_count_today integer;
  referral_count_hour integer;
  suspicious_activity boolean := false;
BEGIN
  -- More generous daily limit for community building (50 instead of 10)
  SELECT COUNT(*) INTO referral_count_today
  FROM referrals 
  WHERE referrer_user_id = p_referrer_id 
    AND created_at >= CURRENT_DATE;
  
  -- Hourly limit to prevent automated spam (10 per hour instead of 3)
  SELECT COUNT(*) INTO referral_count_hour
  FROM referrals 
  WHERE referrer_user_id = p_referrer_id 
    AND created_at >= now() - interval '1 hour';
  
  -- Check for suspicious patterns (same IP, rapid identical patterns)
  SELECT EXISTS(
    SELECT 1 FROM security_audit_log 
    WHERE user_id = p_referrer_id 
      AND action_type LIKE '%referral%'
      AND risk_level IN ('high', 'critical')
      AND created_at >= now() - interval '24 hours'
  ) INTO suspicious_activity;
  
  -- Allow generous limits for legitimate community building
  IF referral_count_today >= 50 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily referral limit reached (50). This helps prevent spam while allowing community growth.'
    );
  END IF;
  
  IF referral_count_hour >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'Please wait a few minutes between invites to prevent spam detection.'
    );
  END IF;
  
  IF suspicious_activity THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Unusual activity detected. Please contact support if you believe this is an error.'
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Create a function to whitelist power users for unlimited referrals
CREATE OR REPLACE FUNCTION public.is_referral_power_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM nctr_portfolio 
    WHERE user_id = p_user_id 
      AND opportunity_status IN ('premium', 'vip', 'platinum')
  ) OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = p_user_id
  );
$$;

-- Update validation to exempt power users from most limits
CREATE OR REPLACE FUNCTION public.validate_referral_request_enhanced(
  p_referrer_id uuid,
  p_referee_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_power_user boolean;
  referral_count_today integer;
  referral_count_hour integer;
  suspicious_activity boolean := false;
BEGIN
  -- Check if user is a power user (premium+ status or admin)
  SELECT public.is_referral_power_user(p_referrer_id) INTO is_power_user;
  
  -- Power users get much higher limits
  IF is_power_user THEN
    -- Only check for extreme abuse patterns for power users
    SELECT COUNT(*) INTO referral_count_hour
    FROM referrals 
    WHERE referrer_user_id = p_referrer_id 
      AND created_at >= now() - interval '1 hour';
    
    IF referral_count_hour >= 100 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Even power users need a short break! Please wait a few minutes.'
      );
    END IF;
    
    RETURN jsonb_build_object('allowed', true, 'power_user', true);
  END IF;
  
  -- Regular users get standard community-friendly limits
  SELECT COUNT(*) INTO referral_count_today
  FROM referrals 
  WHERE referrer_user_id = p_referrer_id 
    AND created_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO referral_count_hour
  FROM referrals 
  WHERE referrer_user_id = p_referrer_id 
    AND created_at >= now() - interval '1 hour';
  
  -- Community-friendly limits (50/day, 10/hour)
  IF referral_count_today >= 50 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily limit reached. Upgrade to Premium+ for unlimited invites!'
    );
  END IF;
  
  IF referral_count_hour >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'Please wait between invites to help us prevent spam.'
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;
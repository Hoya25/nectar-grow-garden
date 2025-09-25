-- Fix Warning 1: Move extensions from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Enable required extensions in the extensions schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Fix Warning 3: Strengthen business strategy data protection
-- Create enhanced rate limiting for business data access

CREATE OR REPLACE FUNCTION public.check_business_data_rate_limit(p_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count INTEGER;
  time_window INTERVAL := '1 hour';
  max_requests INTEGER := 20; -- Strict limit for business data
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Skip rate limiting for authenticated admins
  IF public.get_admin_financial_access_secure() THEN
    RETURN true;
  END IF;
  
  -- Count recent accesses by this user to business data
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_log
  WHERE user_id = current_user_id
    AND resource_table = p_table_name
    AND created_at > (now() - time_window);
  
  -- If too many requests, log as suspicious and deny
  IF access_count > max_requests THEN
    PERFORM public.log_sensitive_access(
      'business_data_rate_limit_exceeded',
      p_table_name,
      current_user_id,
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Log access attempt
  PERFORM public.log_sensitive_access(
    'business_data_access',
    p_table_name,
    current_user_id,
    'medium'
  );
  
  RETURN true;
END;
$$;

-- Fix Warning 4: Strengthen referral system against abuse
-- Add comprehensive referral abuse prevention

CREATE OR REPLACE FUNCTION public.validate_referral_integrity(p_referral_code text, p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id uuid;
  recent_referrals_count integer;
  same_ip_referrals integer;
  current_ip inet;
BEGIN
  current_ip := inet_client_addr();
  
  -- Find referrer by username or email
  SELECT user_id INTO referrer_user_id
  FROM public.profiles
  WHERE username = p_referral_code OR email = p_referral_code;
  
  IF referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid referral code');
  END IF;
  
  -- Check if user is trying to refer themselves
  IF referrer_user_id = p_referred_user_id THEN
    PERFORM public.log_sensitive_access(
      'self_referral_attempt',
      'referrals',
      p_referred_user_id,
      'high'
    );
    RETURN jsonb_build_object('valid', false, 'reason', 'Self-referral not allowed');
  END IF;
  
  -- Check recent referral frequency (max 5 per day per referrer - stricter limit)
  SELECT COUNT(*) INTO recent_referrals_count
  FROM public.referrals
  WHERE referrer_user_id = referrer_user_id
    AND created_at > (now() - interval '24 hours');
  
  IF recent_referrals_count >= 5 THEN
    PERFORM public.log_sensitive_access(
      'referral_abuse_attempt',
      'referrals',
      referrer_user_id,
      'high'
    );
    RETURN jsonb_build_object('valid', false, 'reason', 'Daily referral limit exceeded');
  END IF;
  
  -- Check for IP-based abuse (max 2 referrals per IP per day - stricter)
  IF current_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO same_ip_referrals
    FROM public.security_audit_log
    WHERE ip_address = current_ip
      AND action_type = 'referral_created'
      AND created_at > (now() - interval '24 hours');
    
    IF same_ip_referrals >= 2 THEN
      PERFORM public.log_sensitive_access(
        'ip_referral_abuse',
        'referrals',
        p_referred_user_id,
        'critical'
      );
      RETURN jsonb_build_object('valid', false, 'reason', 'IP-based referral limit exceeded');
    END IF;
  END IF;
  
  -- Check if referred user already has a referral
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = p_referred_user_id) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'User already referred');
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'referrer_user_id', referrer_user_id);
END;
$$;

-- Enhanced referral creation function with abuse prevention
CREATE OR REPLACE FUNCTION public.create_secure_referral(p_referral_code text, p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validation_result jsonb;
  referrer_user_id uuid;
  new_referral_id uuid;
BEGIN
  -- Validate referral integrity
  SELECT public.validate_referral_integrity(p_referral_code, p_referred_user_id) 
  INTO validation_result;
  
  IF NOT (validation_result->>'valid')::boolean THEN
    RETURN validation_result;
  END IF;
  
  referrer_user_id := (validation_result->>'referrer_user_id')::uuid;
  
  -- Create referral with security logging
  INSERT INTO public.referrals (
    referrer_user_id,
    referred_user_id,
    referral_code,
    status
  ) VALUES (
    referrer_user_id,
    p_referred_user_id,
    p_referral_code,
    'pending'
  ) RETURNING id INTO new_referral_id;
  
  -- Log referral creation for monitoring
  PERFORM public.log_sensitive_access(
    'referral_created',
    'referrals',
    new_referral_id,
    'medium'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'referral_id', new_referral_id,
    'referrer_user_id', referrer_user_id
  );
END;
$$;

-- Add referral monitoring trigger (fixed - after operations, not before select)
CREATE OR REPLACE FUNCTION public.monitor_referral_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all referral operations for pattern analysis
  PERFORM public.log_sensitive_access(
    TG_OP::text || '_referral',
    'referrals',
    COALESCE(NEW.id, OLD.id),
    'medium'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply monitoring trigger correctly
DROP TRIGGER IF EXISTS referral_monitoring ON public.referrals;
CREATE TRIGGER referral_monitoring
  AFTER INSERT OR UPDATE OR DELETE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.monitor_referral_patterns();

-- Strengthen admin access validation with session verification
CREATE OR REPLACE FUNCTION public.ultra_secure_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_valid boolean := false;
  last_activity timestamp with time zone;
BEGIN
  -- Get current session info
  SELECT u.last_sign_in_at INTO last_activity
  FROM auth.users u
  WHERE u.id = auth.uid();
  
  -- Verify recent activity (within last 2 hours for sensitive operations)
  IF last_activity IS NULL OR last_activity < (now() - interval '2 hours') THEN
    PERFORM public.log_sensitive_access(
      'stale_admin_session',
      'admin_users',
      auth.uid(),
      'critical'
    );
    RETURN false;
  END IF;
  
  -- Check if user is the designated super admin with all security checks
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level IN ('full_access', 'management')
    AND u.email_confirmed_at IS NOT NULL
    AND u.created_at IS NOT NULL
  ) INTO session_valid;
  
  IF session_valid THEN
    -- Log successful admin access
    PERFORM public.log_sensitive_access(
      'admin_access_granted',
      'admin_users',
      auth.uid(),
      'low'
    );
  ELSE
    -- Log failed admin access attempt
    PERFORM public.log_sensitive_access(
      'unauthorized_admin_attempt',
      'admin_users',
      auth.uid(),
      'critical'
    );
  END IF;
  
  RETURN session_valid;
END;
$$;

-- Update existing admin function to use enhanced security
CREATE OR REPLACE FUNCTION public.get_admin_financial_access_secure()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ultra_secure_admin_check();
$$;

-- Enhanced price access rate limiting
CREATE OR REPLACE FUNCTION public.enhanced_price_access_control()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_ip inet;
  current_user_id uuid;
  hourly_limit integer := 50;
  daily_limit integer := 200;
  hourly_count integer;
  daily_count integer;
BEGIN
  current_ip := inet_client_addr();
  current_user_id := auth.uid();
  
  -- Skip rate limiting for admins
  IF public.get_admin_financial_access_secure() THEN
    RETURN true;
  END IF;
  
  -- Check hourly limit
  SELECT COALESCE(SUM(access_count), 0) INTO hourly_count
  FROM public.price_access_log
  WHERE (ip_address = current_ip OR user_id = current_user_id)
    AND window_start > (now() - interval '1 hour');
  
  -- Check daily limit
  SELECT COALESCE(SUM(access_count), 0) INTO daily_count
  FROM public.price_access_log
  WHERE (ip_address = current_ip OR user_id = current_user_id)
    AND window_start > (now() - interval '24 hours');
  
  -- Deny if over limits
  IF hourly_count >= hourly_limit OR daily_count >= daily_limit THEN
    PERFORM public.log_sensitive_access(
      'price_rate_limit_exceeded',
      'nctr_price_cache',
      current_user_id,
      'high'
    );
    RETURN false;
  END IF;
  
  -- Log access
  INSERT INTO public.price_access_log (user_id, ip_address)
  VALUES (current_user_id, current_ip)
  ON CONFLICT (user_id, ip_address, window_start) 
  DO UPDATE SET access_count = price_access_log.access_count + 1;
  
  RETURN true;
END;
$$;

-- Add comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.detect_suspicious_patterns()
RETURNS TABLE(
  user_id uuid,
  risk_score integer,
  suspicious_activities text[],
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_activity AS (
    SELECT 
      sal.user_id,
      COUNT(*) as total_activities,
      COUNT(CASE WHEN sal.risk_level = 'critical' THEN 1 END) as critical_activities,
      COUNT(CASE WHEN sal.risk_level = 'high' THEN 1 END) as high_activities,
      array_agg(DISTINCT sal.action_type) as activity_types,
      MAX(sal.created_at) as last_activity_time
    FROM public.security_audit_log sal
    WHERE sal.created_at > (now() - interval '24 hours')
    GROUP BY sal.user_id
  )
  SELECT 
    ua.user_id,
    (ua.critical_activities * 10 + ua.high_activities * 5 + 
     CASE WHEN ua.total_activities > 100 THEN 5 ELSE 0 END) as risk_score,
    ua.activity_types as suspicious_activities,
    ua.last_activity_time
  FROM user_activity ua
  WHERE (ua.critical_activities > 0 OR ua.high_activities > 2 OR ua.total_activities > 50)
  ORDER BY risk_score DESC;
END;
$$;
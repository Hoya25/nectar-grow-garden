-- Final security fixes - simplified approach

-- Move any remaining extensions from public schema to extensions schema
-- This addresses the "Extension in Public" warning
DO $$
BEGIN
  -- Create extensions schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Move extensions that might still be in public schema
  -- We'll handle errors gracefully to avoid issues
  
  BEGIN
    -- Check and move uuid-ossp extension
    IF EXISTS (
      SELECT 1 FROM pg_extension e 
      JOIN pg_namespace n ON e.extnamespace = n.oid 
      WHERE e.extname = 'uuid-ossp' AND n.nspname = 'public'
    ) THEN
      ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue if there's an issue
    NULL;
  END;
  
  BEGIN
    -- Check and move pgcrypto extension
    IF EXISTS (
      SELECT 1 FROM pg_extension e 
      JOIN pg_namespace n ON e.extnamespace = n.oid 
      WHERE e.extname = 'pgcrypto' AND n.nspname = 'public'
    ) THEN
      ALTER EXTENSION pgcrypto SET SCHEMA extensions;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    -- Check and move http extension if it exists
    IF EXISTS (
      SELECT 1 FROM pg_extension e 
      JOIN pg_namespace n ON e.extnamespace = n.oid 
      WHERE e.extname = 'http' AND n.nspname = 'public'
    ) THEN
      ALTER EXTENSION http SET SCHEMA extensions;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

END $$;

-- Create new security functions with proper search paths
-- These are additional monitoring functions that don't conflict with existing ones

CREATE OR REPLACE FUNCTION public.get_security_alerts()
RETURNS TABLE(
  alert_type text,
  severity text,
  message text,
  count bigint,
  first_seen timestamp with time zone,
  last_seen timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow super admin access
  IF NOT public.ultra_secure_admin_check() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  RETURN QUERY
  WITH security_events AS (
    SELECT 
      action_type as alert_type,
      risk_level as severity,
      'Detected ' || action_type || ' activity' as message,
      COUNT(*) as count,
      MIN(created_at) as first_seen,
      MAX(created_at) as last_seen
    FROM public.security_audit_log
    WHERE created_at > (now() - interval '24 hours')
      AND risk_level IN ('high', 'critical')
    GROUP BY action_type, risk_level
  )
  SELECT * FROM security_events
  ORDER BY 
    CASE severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      ELSE 3 
    END,
    count DESC;
END;
$$;

-- Enhanced business data protection function
CREATE OR REPLACE FUNCTION public.secure_business_access_check(p_table_name text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
  recent_access_count integer := 0;
  rate_limit integer := 10; -- Conservative limit for business data
BEGIN
  -- Check if user is admin (admins have higher limits)
  SELECT public.get_admin_financial_access_secure() INTO is_admin;
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Count recent accesses to business data
  SELECT COUNT(*) INTO recent_access_count
  FROM public.security_audit_log
  WHERE user_id = p_user_id
    AND resource_table = p_table_name
    AND created_at > (now() - interval '1 hour');
  
  -- Apply rate limiting
  IF recent_access_count >= rate_limit THEN
    -- Log the rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, action_type, resource_table, risk_level, ip_address
    ) VALUES (
      p_user_id, 'business_data_rate_limit_exceeded', p_table_name, 'high', inet_client_addr()
    );
    
    RETURN false;
  END IF;
  
  -- Log legitimate access
  INSERT INTO public.security_audit_log (
    user_id, action_type, resource_table, risk_level, ip_address
  ) VALUES (
    p_user_id, 'business_data_access', p_table_name, 'low', inet_client_addr()
  );
  
  RETURN true;
END;
$$;

-- Referral system integrity checker
CREATE OR REPLACE FUNCTION public.validate_referral_request(
  p_referrer_code text, 
  p_referred_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  referral_count_today integer;
  ip_referral_count integer;
  current_ip inet;
BEGIN
  current_ip := inet_client_addr();
  
  -- Find referrer
  SELECT user_id INTO referrer_id
  FROM public.profiles
  WHERE username = p_referrer_code OR email = p_referrer_code;
  
  IF referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'Invalid referral code',
      'risk_level', 'low'
    );
  END IF;
  
  -- Prevent self-referral
  IF referrer_id = p_referred_user_id THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, resource_table, risk_level, ip_address
    ) VALUES (
      p_referred_user_id, 'self_referral_attempt', 'referrals', 'high', current_ip
    );
    
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'Self-referral not allowed',
      'risk_level', 'high'
    );
  END IF;
  
  -- Check daily referral limit (strict: max 3 per day)
  SELECT COUNT(*) INTO referral_count_today
  FROM public.referrals
  WHERE referrer_user_id = referrer_id
    AND created_at > (CURRENT_DATE);
  
  IF referral_count_today >= 3 THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, resource_table, risk_level, ip_address
    ) VALUES (
      referrer_id, 'referral_daily_limit_exceeded', 'referrals', 'high', current_ip
    );
    
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'Daily referral limit exceeded (max 3)',
      'risk_level', 'high'
    );
  END IF;
  
  -- Check IP-based abuse (max 1 referral per IP per day)
  SELECT COUNT(*) INTO ip_referral_count
  FROM public.security_audit_log
  WHERE ip_address = current_ip
    AND action_type = 'referral_validated'
    AND created_at > (CURRENT_DATE);
  
  IF ip_referral_count >= 1 THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, resource_table, risk_level, ip_address
    ) VALUES (
      p_referred_user_id, 'ip_referral_limit_exceeded', 'referrals', 'critical', current_ip
    );
    
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'IP-based referral limit exceeded',
      'risk_level', 'critical'
    );
  END IF;
  
  -- Check if user already has a referral
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = p_referred_user_id) THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'User already has a referral',
      'risk_level', 'medium'
    );
  END IF;
  
  -- Log successful validation
  INSERT INTO public.security_audit_log (
    user_id, action_type, resource_table, risk_level, ip_address
  ) VALUES (
    p_referred_user_id, 'referral_validated', 'referrals', 'low', current_ip
  );
  
  RETURN jsonb_build_object(
    'valid', true,
    'referrer_id', referrer_id,
    'risk_level', 'low'
  );
END;
$$;

-- Comment explaining the password protection setting
-- Note: The "Leaked Password Protection Disabled" warning needs to be addressed 
-- in the Supabase Dashboard under Authentication > Settings
-- This cannot be fixed via SQL migration
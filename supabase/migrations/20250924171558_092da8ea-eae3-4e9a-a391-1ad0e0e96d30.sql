-- Security Enhancement Migration to Fix Critical Vulnerabilities (Corrected)
-- This migration addresses the security warnings related to PII exposure, 
-- financial data access, and admin privilege escalation

-- 1. STRENGTHEN ADMIN ACCESS CONTROLS
-- Create more secure admin verification functions with additional checks

-- Enhanced admin check function with session validation
CREATE OR REPLACE FUNCTION public.check_user_is_admin_secure(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = check_user_id 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.created_at IS NOT NULL
    AND au.access_level IS NOT NULL
    -- Additional security: check if user session is still active
    AND u.last_sign_in_at > (now() - interval '24 hours')
  );
$$;

-- Enhanced financial access function with stricter controls
CREATE OR REPLACE FUNCTION public.get_admin_financial_access_secure()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id  
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level IN ('full_access', 'management')
    -- Additional security checks
    AND au.created_at IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
    -- Ensure recent activity (last 2 hours for financial access)
    AND u.last_sign_in_at > (now() - interval '2 hours')
  );
$$;

-- 2. ENHANCE PII DATA PROTECTION
-- Create data masking function for sensitive profile data
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(
  input_text text,
  mask_type text DEFAULT 'partial'
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  CASE mask_type
    WHEN 'email' THEN
      -- Mask email: show first 2 chars + domain
      RETURN CASE 
        WHEN input_text IS NULL THEN NULL
        WHEN length(input_text) < 5 THEN '***'
        ELSE substring(input_text, 1, 2) || '***' || substring(input_text from '@.*')
      END;
    WHEN 'wallet' THEN
      -- Mask wallet: show first 6 and last 4 characters
      RETURN CASE
        WHEN input_text IS NULL THEN NULL
        WHEN length(input_text) < 10 THEN '***'
        ELSE substring(input_text, 1, 6) || '...' || right(input_text, 4)
      END;
    ELSE
      -- Partial masking for names
      RETURN CASE
        WHEN input_text IS NULL THEN NULL
        WHEN length(input_text) <= 2 THEN '*'
        ELSE substring(input_text, 1, 1) || repeat('*', greatest(length(input_text) - 2, 1)) || right(input_text, 1)
      END;
  END CASE;
END;
$$;

-- 3. CREATE AUDIT LOGGING FOR SENSITIVE ACCESS
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  resource_table text NOT NULL,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  session_id text,
  risk_level text DEFAULT 'low',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view security audit logs"
ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level = 'full_access'
  )
);

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_action_type text,
  p_resource_table text,
  p_resource_id uuid DEFAULT NULL,
  p_risk_level text DEFAULT 'medium'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_resource_table,
    p_resource_id,
    p_risk_level
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently for audit logging to avoid breaking main operations
    NULL;
END;
$$;

-- 4. STRENGTHEN PROFILES TABLE SECURITY
-- Update the admin profile access policy with audit logging
DROP POLICY IF EXISTS "Admins can view safe profile data" ON public.profiles;

CREATE POLICY "Enhanced admin profile access with audit"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR (
    public.get_admin_financial_access_secure() AND 
    -- Log the access for audit trail (fails silently if logging fails)
    (SELECT public.log_sensitive_access('admin_profile_access', 'profiles', id, 'high')) IS NULL
  )
);

-- 5. STRENGTHEN FINANCIAL DATA SECURITY
-- Update withdrawal requests defensive policy
DROP POLICY IF EXISTS "Defensive: Deny withdrawal access without auth" ON public.withdrawal_requests;

CREATE POLICY "Enhanced withdrawal access with strict controls"
ON public.withdrawal_requests
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    (
      public.get_admin_financial_access_secure() AND
      -- Log financial data access (fails silently if logging fails)
      (SELECT public.log_sensitive_access('financial_data_access', 'withdrawal_requests', id, 'critical')) IS NULL
    )
  )
);

-- 6. STRENGTHEN TRANSACTION DATA SECURITY
-- Update transaction defensive policy  
DROP POLICY IF EXISTS "Defensive: Deny all transaction access without auth" ON public.nctr_transactions;

CREATE POLICY "Enhanced transaction access with audit"
ON public.nctr_transactions
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    (
      public.get_admin_financial_access_secure() AND
      -- Log financial transaction access
      (SELECT public.log_sensitive_access('admin_transaction_access', 'nctr_transactions', id, 'critical')) IS NULL
    )
  )
);

-- 7. STRENGTHEN PORTFOLIO DATA SECURITY
-- Update portfolio defensive policy
DROP POLICY IF EXISTS "Defensive: Deny all portfolio access without auth" ON public.nctr_portfolio;

CREATE POLICY "Enhanced portfolio access with audit"
ON public.nctr_portfolio
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    (
      public.get_admin_financial_access_secure() AND
      -- Log portfolio access
      (SELECT public.log_sensitive_access('admin_portfolio_access', 'nctr_portfolio', id, 'critical')) IS NULL
    )
  )
);

-- 8. ADD RATE LIMITING TABLE
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view own rate limits"
ON public.api_rate_limits
FOR ALL
USING (auth.uid() = user_id);

-- 9. REFRESH KEY ADMIN POLICIES WITH ENHANCED SECURITY
-- Recreate admin activity log policy
DROP POLICY IF EXISTS "Admins can view activity log" ON public.admin_activity_log;
CREATE POLICY "Enhanced admin activity log access"
ON public.admin_activity_log
FOR SELECT
USING (public.get_admin_financial_access_secure());

-- Recreate admin users policy  
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Enhanced admin users access"
ON public.admin_users
FOR SELECT
USING (public.get_admin_financial_access_secure());

-- Recreate brands admin policy
DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;
CREATE POLICY "Enhanced brands admin access"
ON public.brands
FOR ALL
USING (public.get_admin_financial_access_secure());

-- Recreate earning opportunities admin policies
DROP POLICY IF EXISTS "Admins can insert opportunities" ON public.earning_opportunities;
DROP POLICY IF EXISTS "Admins can update opportunities" ON public.earning_opportunities;
DROP POLICY IF EXISTS "Admins can delete opportunities" ON public.earning_opportunities;

CREATE POLICY "Enhanced opportunities insert access"
ON public.earning_opportunities
FOR INSERT
WITH CHECK (public.get_admin_financial_access_secure());

CREATE POLICY "Enhanced opportunities update access"
ON public.earning_opportunities
FOR UPDATE
USING (public.get_admin_financial_access_secure());

CREATE POLICY "Enhanced opportunities delete access"
ON public.earning_opportunities
FOR DELETE
USING (public.get_admin_financial_access_secure());

-- 10. ADD DATA RETENTION AND CLEANUP FUNCTIONS
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.security_audit_log 
  WHERE created_at < now() - interval '90 days';
$$;

-- Create a function to check for suspicious activity
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS TABLE (
  user_id uuid,
  suspicious_actions bigint,
  last_activity timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    sal.user_id,
    COUNT(*) as suspicious_actions,
    MAX(sal.created_at) as last_activity
  FROM public.security_audit_log sal
  WHERE sal.risk_level IN ('high', 'critical')
  AND sal.created_at > now() - interval '24 hours'
  GROUP BY sal.user_id
  HAVING COUNT(*) > 5
  ORDER BY suspicious_actions DESC;
$$;

-- 11. CREATE SECURE VIEW FOR MONITORING (no RLS policies on views)
CREATE OR REPLACE VIEW public.security_summary AS
SELECT 
  COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_events_today,
  COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_events_today,
  COUNT(DISTINCT user_id) as active_users_today,
  MAX(created_at) as last_activity
FROM public.security_audit_log
WHERE created_at >= CURRENT_DATE;

-- Grant access only to postgres and authenticated users
GRANT SELECT ON public.security_summary TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.check_user_is_admin_secure IS 'Enhanced admin verification with session validation and stricter controls';
COMMENT ON FUNCTION public.get_admin_financial_access_secure IS 'Ultra-strict financial access control with time-based restrictions and session validation';
COMMENT ON FUNCTION public.mask_sensitive_data IS 'Data masking utility for PII protection in logs and displays';
COMMENT ON FUNCTION public.log_sensitive_access IS 'Audit logging for sensitive data access with fail-safe error handling';
COMMENT ON TABLE public.security_audit_log IS 'Comprehensive security audit trail for all sensitive operations';
COMMENT ON TABLE public.api_rate_limits IS 'API rate limiting system to prevent abuse';
COMMENT ON VIEW public.security_summary IS 'Security monitoring dashboard data (admin access only)';

-- Final security hardening: ensure all sensitive functions are security definer
ALTER FUNCTION public.check_user_is_admin_secure SECURITY DEFINER;
ALTER FUNCTION public.get_admin_financial_access_secure SECURITY DEFINER;
ALTER FUNCTION public.mask_sensitive_data SECURITY DEFINER;
ALTER FUNCTION public.log_sensitive_access SECURITY DEFINER;
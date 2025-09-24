-- Final Security Fix Migration (Simplified)
-- Addresses the critical security linter warnings

-- 1. FIX SECURITY DEFINER VIEW ISSUE
-- Replace the security_summary view with a SECURITY INVOKER version
DROP VIEW IF EXISTS public.security_summary;

-- Recreate view with SECURITY INVOKER to respect RLS policies
CREATE VIEW public.security_summary 
WITH (security_invoker=on) AS
SELECT 
  COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_events_today,
  COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_events_today,
  COUNT(DISTINCT user_id) as active_users_today,
  MAX(created_at) as last_activity
FROM public.security_audit_log
WHERE created_at >= CURRENT_DATE;

-- Grant access to authenticated users (RLS will control actual access)
GRANT SELECT ON public.security_summary TO authenticated;

-- 2. CREATE SECURE ADMIN DASHBOARD FUNCTION (Better than view)
CREATE OR REPLACE FUNCTION public.get_security_dashboard_data()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN auth.users u ON u.id = au.user_id
      WHERE au.user_id = auth.uid() 
      AND u.email = 'anderson@projectbutterfly.io'
      AND au.access_level = 'full_access'
    ) THEN 
      jsonb_build_object(
        'critical_events_today', COUNT(CASE WHEN risk_level = 'critical' THEN 1 END),
        'high_risk_events_today', COUNT(CASE WHEN risk_level = 'high' THEN 1 END),
        'active_users_today', COUNT(DISTINCT user_id),
        'last_activity', MAX(created_at)
      )
    ELSE 
      jsonb_build_object('error', 'Access denied')
  END
  FROM public.security_audit_log
  WHERE created_at >= CURRENT_DATE;
$$;

-- 3. CREATE EMERGENCY ADMIN ACCESS REVOCATION FUNCTION
CREATE OR REPLACE FUNCTION public.emergency_revoke_admin_access(p_user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  revoked_count integer := 0;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = p_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Only the super admin can revoke admin access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid()
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level = 'full_access'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Revoke admin access
  DELETE FROM public.admin_users WHERE user_id = target_user_id;
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Log the revocation
  PERFORM public.log_sensitive_access(
    'admin_access_revoked',
    'admin_users',
    target_user_id,
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'revoked_count', revoked_count,
    'revoked_user', p_user_email
  );
END;
$$;

-- 4. FINAL DOCUMENTATION
COMMENT ON FUNCTION public.get_security_dashboard_data IS 'Secure admin dashboard function with access validation';
COMMENT ON FUNCTION public.emergency_revoke_admin_access IS 'Emergency function to revoke compromised admin access';
COMMENT ON VIEW public.security_summary IS 'Security monitoring view with SECURITY INVOKER for proper RLS enforcement';

-- Log the completion of security hardening
SELECT public.log_sensitive_access('security_hardening_completed', 'system', auth.uid(), 'high');
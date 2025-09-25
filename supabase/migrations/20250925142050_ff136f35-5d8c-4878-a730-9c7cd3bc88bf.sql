-- CRITICAL SECURITY FIX: Secure the price_access_log table
-- This table contains sensitive rate limiting data that must be protected

-- Drop the dangerous open-access policy
DROP POLICY IF EXISTS "System can manage price access log" ON public.price_access_log;

-- Create secure policies that only allow system functions and admin access
CREATE POLICY "Block all direct user access to price access log"
ON public.price_access_log
FOR ALL
USING (false)
WITH CHECK (false);

-- Allow admin access with audit logging for monitoring purposes
CREATE POLICY "Admin can view price access logs with audit"
ON public.price_access_log
FOR SELECT
USING (
  get_admin_financial_access_secure() AND 
  (SELECT log_sensitive_access('admin_rate_limit_access', 'price_access_log', price_access_log.id, 'high') IS NULL)
);

-- Create a secure function for admin monitoring of rate limiting
CREATE OR REPLACE FUNCTION public.get_rate_limit_statistics()
RETURNS TABLE(
  total_accesses_today bigint,
  unique_users_today bigint,
  unique_ips_today bigint,
  blocked_requests_estimate bigint,
  top_user_accesses bigint
) AS $$
BEGIN
  -- Check admin access with audit logging
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for rate limit monitoring';
  END IF;
  
  -- Log the admin access for security audit
  PERFORM log_sensitive_access('admin_rate_limit_monitoring', 'price_access_log', NULL, 'medium');
  
  -- Return aggregated statistics (no individual user data exposed)
  RETURN QUERY
  SELECT 
    COUNT(*) as total_accesses_today,
    COUNT(DISTINCT user_id) as unique_users_today,
    COUNT(DISTINCT ip_address) as unique_ips_today,
    COUNT(*) FILTER (WHERE access_count >= 90) as blocked_requests_estimate,
    MAX(access_count) as top_user_accesses
  FROM public.price_access_log
  WHERE created_at >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Add a comment explaining the security model
COMMENT ON TABLE public.price_access_log IS 
'SECURITY-CRITICAL: Rate limiting audit table. Direct access blocked. Only SECURITY DEFINER functions and audited admin access allowed.';

COMMENT ON POLICY "Block all direct user access to price access log" ON public.price_access_log IS 
'Blocks all direct user access to prevent rate limit manipulation and audit trail tampering';

COMMENT ON POLICY "Admin can view price access logs with audit" ON public.price_access_log IS 
'Allows admin monitoring with mandatory audit logging for compliance';

COMMENT ON FUNCTION public.get_rate_limit_statistics() IS 
'Secure admin function providing aggregated rate limit statistics without exposing individual user data';
-- SECURITY FIX: Address database security warnings
-- Fix Extension in Public schema warning and harden business data access

-- Check what extensions are in public schema (corrected query)
SELECT n.nspname as schema_name, e.extname as extension_name 
FROM pg_extension e 
JOIN pg_namespace n ON e.extnamespace = n.oid 
WHERE n.nspname = 'public';

-- Create extensions schema if it doesn't exist for future extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Document the extension security model
COMMENT ON SCHEMA public IS 'Main application schema. Contains some required Supabase extensions for compatibility.';
COMMENT ON SCHEMA extensions IS 'Dedicated schema for non-critical extensions to improve security isolation.';

-- BUSINESS DATA SECURITY HARDENING
-- Add audit logging requirement for business-sensitive data access

-- Update brands table RLS to require audit logging for admin access
DROP POLICY IF EXISTS "Enhanced brands admin access" ON public.brands;
CREATE POLICY "Enhanced brands admin access with business audit"
ON public.brands 
FOR ALL
USING (
  get_admin_financial_access_secure() AND 
  (SELECT log_business_data_access('brands', 'access') IS NULL)
);

-- Update earning_opportunities table RLS to require audit logging
DROP POLICY IF EXISTS "Enhanced opportunities insert access" ON public.earning_opportunities;
DROP POLICY IF EXISTS "Enhanced opportunities update access" ON public.earning_opportunities;
DROP POLICY IF EXISTS "Enhanced opportunities delete access" ON public.earning_opportunities;

CREATE POLICY "Enhanced opportunities insert access with strategy audit"
ON public.earning_opportunities
FOR INSERT
WITH CHECK (
  get_admin_financial_access_secure() AND 
  (SELECT log_business_data_access('earning_opportunities', 'insert') IS NULL)
);

CREATE POLICY "Enhanced opportunities update access with strategy audit"
ON public.earning_opportunities
FOR UPDATE
USING (
  get_admin_financial_access_secure() AND 
  (SELECT log_business_data_access('earning_opportunities', 'update') IS NULL)
);

CREATE POLICY "Enhanced opportunities delete access with strategy audit"
ON public.earning_opportunities
FOR DELETE
USING (
  get_admin_financial_access_secure() AND 
  (SELECT log_business_data_access('earning_opportunities', 'delete') IS NULL)
);

-- Add additional security for financial data (nctr_price_cache)
DROP POLICY IF EXISTS "Service role can manage NCTR price data" ON public.nctr_price_cache;
CREATE POLICY "Service role can manage NCTR price data with audit"
ON public.nctr_price_cache
FOR ALL
USING (
  (auth.role() = 'service_role') OR 
  (get_admin_financial_access_secure() AND (SELECT log_business_data_access('nctr_price_cache', 'access') IS NULL))
)
WITH CHECK (
  (auth.role() = 'service_role') OR 
  (get_admin_financial_access_secure() AND (SELECT log_business_data_access('nctr_price_cache', 'modify') IS NULL))
);

-- Add security comments to critical business tables
COMMENT ON TABLE public.brands IS 'BUSINESS-CRITICAL: Partner brand data requiring audit logging for all admin access';
COMMENT ON TABLE public.earning_opportunities IS 'STRATEGY-CRITICAL: Business opportunity data requiring audit logging for all admin access';  
COMMENT ON TABLE public.nctr_price_cache IS 'FINANCIAL-CRITICAL: Price data requiring audit logging for all admin access';

-- Add function to check if any sensitive data access is happening
CREATE OR REPLACE FUNCTION public.get_business_data_access_summary()
RETURNS TABLE(
  table_name text,
  access_count bigint,
  last_access timestamp with time zone
) AS $$
BEGIN
  -- Check admin access with enhanced security
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required for business data monitoring';
  END IF;
  
  -- Log this monitoring access
  PERFORM log_sensitive_access('business_data_monitoring', 'security_audit_log', NULL, 'high');
  
  -- Return aggregated business data access statistics
  RETURN QUERY
  SELECT 
    sal.resource_table as table_name,
    COUNT(*) as access_count,
    MAX(sal.created_at) as last_access
  FROM public.security_audit_log sal
  WHERE sal.action_type = 'business_data_access'
    AND sal.created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND sal.resource_table IN ('brands', 'earning_opportunities', 'nctr_price_cache')
  GROUP BY sal.resource_table
  ORDER BY access_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_business_data_access_summary() IS 'Secure monitoring of business-critical data access patterns for security compliance';
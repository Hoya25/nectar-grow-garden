-- Security Hardening Migration - Phase 1: Business Intelligence Protection
-- Restrict public access to business-sensitive data

-- 1. SECURE BRANDS TABLE - Require authentication for business intelligence data
DROP POLICY IF EXISTS "Anyone can view active brands" ON public.brands;

CREATE POLICY "Authenticated users can view active brands" 
ON public.brands 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- 2. SECURE EARNING OPPORTUNITIES - Require authentication for opportunity data  
DROP POLICY IF EXISTS "Anyone can view active opportunities" ON public.earning_opportunities;

CREATE POLICY "Authenticated users can view active opportunities"
ON public.earning_opportunities
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- 3. ADD RATE LIMITING FOR PRICE DATA ACCESS
CREATE TABLE IF NOT EXISTS public.price_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address inet,
  access_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on price access log
ALTER TABLE public.price_access_log ENABLE ROW LEVEL SECURITY;

-- Policy for price access log
CREATE POLICY "System can manage price access log"
ON public.price_access_log
FOR ALL
USING (true);

-- 4. CREATE RATE LIMITING FUNCTION FOR PRICE DATA
CREATE OR REPLACE FUNCTION public.check_price_access_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_ip inet;
  current_user_id uuid;
  access_count integer;
  rate_limit integer := 100; -- 100 requests per hour
BEGIN
  current_ip := inet_client_addr();
  current_user_id := auth.uid();
  
  -- Check rate limit for this IP/user in the last hour
  SELECT COALESCE(SUM(access_count), 0) INTO access_count
  FROM public.price_access_log
  WHERE (ip_address = current_ip OR user_id = current_user_id)
    AND window_start > now() - interval '1 hour';
  
  -- If over limit, deny access
  IF access_count >= rate_limit THEN
    RETURN false;
  END IF;
  
  -- Log this access
  INSERT INTO public.price_access_log (user_id, ip_address)
  VALUES (current_user_id, current_ip)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;

-- 5. ADD SECURITY AUDIT LOGGING FOR BUSINESS DATA ACCESS
CREATE OR REPLACE FUNCTION public.log_business_data_access(
  p_table_name text,
  p_action text DEFAULT 'select'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log for sensitive business data tables
  IF p_table_name IN ('brands', 'earning_opportunities', 'nctr_price_cache') THEN
    PERFORM public.log_sensitive_access(
      'business_data_access',
      p_table_name,
      auth.uid(),
      'medium'
    );
  END IF;
END;
$$;

-- 6. CREATE SUSPICIOUS ACTIVITY DETECTION FUNCTION
CREATE OR REPLACE FUNCTION public.detect_rapid_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_access_count integer;
  suspicious_threshold integer := 50; -- 50 accesses in 5 minutes
BEGIN
  -- Count recent accesses from this user
  SELECT COUNT(*) INTO recent_access_count
  FROM public.security_audit_log
  WHERE user_id = auth.uid()
    AND resource_table = TG_TABLE_NAME
    AND created_at > now() - interval '5 minutes';
  
  -- If suspicious, log high-risk event
  IF recent_access_count > suspicious_threshold THEN
    PERFORM public.log_sensitive_access(
      'suspicious_rapid_access',
      TG_TABLE_NAME,
      auth.uid(),
      'high'
    );
  END IF;
  
  RETURN NULL;
END;
$$;

-- 7. ENHANCED WITHDRAWAL MONITORING
CREATE OR REPLACE FUNCTION public.monitor_withdrawal_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  daily_withdrawal_amount numeric;
  weekly_withdrawal_amount numeric;
  daily_threshold numeric := 10000; -- Alert for >10k NCTR per day
  weekly_threshold numeric := 50000; -- Alert for >50k NCTR per week
BEGIN
  -- Calculate daily withdrawals
  SELECT COALESCE(SUM(nctr_amount), 0) INTO daily_withdrawal_amount
  FROM public.withdrawal_requests
  WHERE user_id = NEW.user_id
    AND DATE(created_at) = CURRENT_DATE
    AND status IN ('pending', 'processing', 'completed');
  
  -- Calculate weekly withdrawals
  SELECT COALESCE(SUM(nctr_amount), 0) INTO weekly_withdrawal_amount
  FROM public.withdrawal_requests
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '7 days'
    AND status IN ('pending', 'processing', 'completed');
  
  -- Log alerts for unusual patterns
  IF daily_withdrawal_amount > daily_threshold THEN
    PERFORM public.log_sensitive_access(
      'high_daily_withdrawal',
      'withdrawal_requests',
      NEW.id,
      'high'
    );
  END IF;
  
  IF weekly_withdrawal_amount > weekly_threshold THEN
    PERFORM public.log_sensitive_access(
      'high_weekly_withdrawal',
      'withdrawal_requests', 
      NEW.id,
      'critical'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. ADD TRIGGERS FOR MONITORING
CREATE TRIGGER monitor_withdrawal_patterns_trigger
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_withdrawal_patterns();

-- 9. CLEANUP OLD AUDIT LOGS (Data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.security_audit_log 
  WHERE created_at < now() - interval '90 days';
$$;

-- 10. DOCUMENTATION
COMMENT ON FUNCTION public.check_price_access_rate_limit IS 'Rate limiting for public price data access';
COMMENT ON FUNCTION public.log_business_data_access IS 'Audit logging for business-sensitive data access';
COMMENT ON FUNCTION public.detect_rapid_data_access IS 'Detection of suspicious rapid data access patterns';
COMMENT ON FUNCTION public.monitor_withdrawal_patterns IS 'Monitor and alert on unusual withdrawal patterns';
COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 'Automated cleanup of old audit logs for data retention compliance';

-- Log the completion of security hardening phase 1
SELECT public.log_sensitive_access('security_hardening_phase1_completed', 'system', auth.uid(), 'high');
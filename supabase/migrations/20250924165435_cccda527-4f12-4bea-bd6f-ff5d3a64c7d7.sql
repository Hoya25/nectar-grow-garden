-- CRITICAL SECURITY FIX: Strengthen financial data protection (CORRECTED)
-- ISSUE: Financial records could be accessed by unauthorized users if RLS fails

-- 1. Add defensive constraints to prevent RLS bypass attacks
-- Ensure user_id cannot be NULL on financial tables (prevents policy bypass)
ALTER TABLE public.nctr_portfolio ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.nctr_transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.nctr_locks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.withdrawal_requests ALTER COLUMN user_id SET NOT NULL;

-- 2. Create security definer function for safe admin access to financial data
-- This prevents recursive RLS issues while allowing proper admin oversight
CREATE OR REPLACE FUNCTION public.get_admin_financial_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id  
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND au.access_level IN ('full_access', 'management')
  );
$$;

-- 3. Add defensive RLS policies with proper null handling
-- These policies ensure financial data is NEVER accessible without proper authentication

-- Portfolio defensive policies
DROP POLICY IF EXISTS "Defensive: Deny all portfolio access without auth" ON public.nctr_portfolio;
CREATE POLICY "Defensive: Deny all portfolio access without auth" 
ON public.nctr_portfolio 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Transactions defensive policies  
DROP POLICY IF EXISTS "Defensive: Deny all transaction access without auth" ON public.nctr_transactions;
CREATE POLICY "Defensive: Deny all transaction access without auth"
ON public.nctr_transactions
FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Locks defensive policies
DROP POLICY IF EXISTS "Defensive: Deny all locks access without auth" ON public.nctr_locks;
CREATE POLICY "Defensive: Deny all locks access without auth"
ON public.nctr_locks  
FOR ALL
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Withdrawal requests - keep existing admin access but add null protection
DROP POLICY IF EXISTS "Defensive: Deny withdrawal access without auth" ON public.withdrawal_requests;
CREATE POLICY "Defensive: Deny withdrawal access without auth"
ON public.withdrawal_requests
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    public.get_admin_financial_access()
  )
);

-- 4. Add audit logging trigger for financial table access
-- This creates an audit trail for security monitoring
CREATE OR REPLACE FUNCTION public.log_financial_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  table_name text := TG_TABLE_NAME;
  operation text := TG_OP;
  user_id_accessed uuid;
BEGIN
  -- Log access to financial data for security audit
  user_id_accessed := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Only log if it's not the user accessing their own data
  IF auth.uid() != user_id_accessed AND public.get_admin_financial_access() THEN
    INSERT INTO public.admin_activity_log (
      admin_user_id,
      action,
      resource_type, 
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'financial_data_access',
      table_name,
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object(
        'operation', operation,
        'accessed_user_id', user_id_accessed,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to all financial tables
DROP TRIGGER IF EXISTS financial_access_audit_portfolio ON public.nctr_portfolio;
CREATE TRIGGER financial_access_audit_portfolio
  AFTER INSERT OR UPDATE OR DELETE ON public.nctr_portfolio
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_access();

DROP TRIGGER IF EXISTS financial_access_audit_transactions ON public.nctr_transactions;  
CREATE TRIGGER financial_access_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.nctr_transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_access();

DROP TRIGGER IF EXISTS financial_access_audit_locks ON public.nctr_locks;
CREATE TRIGGER financial_access_audit_locks
  AFTER INSERT OR UPDATE OR DELETE ON public.nctr_locks  
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_access();

DROP TRIGGER IF EXISTS financial_access_audit_withdrawals ON public.withdrawal_requests;
CREATE TRIGGER financial_access_audit_withdrawals
  AFTER INSERT OR UPDATE OR DELETE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_financial_access();

-- 5. Create performance indexes for RLS policy efficiency (without CONCURRENTLY)
-- These indexes ensure RLS policies perform efficiently under load
CREATE INDEX IF NOT EXISTS idx_nctr_portfolio_user_id_security 
ON public.nctr_portfolio (user_id);

CREATE INDEX IF NOT EXISTS idx_nctr_transactions_user_id_security
ON public.nctr_transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_nctr_locks_user_id_security  
ON public.nctr_locks (user_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id_security
ON public.withdrawal_requests (user_id);
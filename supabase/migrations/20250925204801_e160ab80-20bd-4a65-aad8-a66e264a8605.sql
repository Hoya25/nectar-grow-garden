-- CRITICAL SECURITY FIX: Enhanced Financial Data Protection for withdrawal_requests

-- 1. First, remove duplicate and weak policies
DROP POLICY IF EXISTS "Users can create own withdrawal requests only" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own withdrawal requests only" ON public.withdrawal_requests; 
DROP POLICY IF EXISTS "Enhanced treasury admin view access with validation" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Enhanced treasury admin update access with validation" ON public.withdrawal_requests;

-- 2. Create enhanced audit logging function for financial data access
CREATE OR REPLACE FUNCTION public.log_financial_data_access(
  table_name text,
  record_id uuid,
  access_type text,
  accessed_fields text[] DEFAULT NULL,
  access_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_email text;
  session_info jsonb;
BEGIN
  -- Get user email for audit trail
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Collect session information
  session_info := jsonb_build_object(
    'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
    'ip_address', current_setting('request.headers', true)::jsonb->>'cf-connecting-ip',
    'timestamp', now(),
    'accessed_fields', accessed_fields,
    'access_reason', access_reason
  );

  -- Log to security audit table
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level,
    session_id,
    user_agent,
    ip_address
  ) VALUES (
    current_user_id,
    'financial_data_access_' || access_type,
    table_name,
    record_id,
    CASE 
      WHEN access_type = 'admin_full_access' THEN 'critical'
      WHEN access_type = 'user_own_data' THEN 'medium'
      ELSE 'high'
    END,
    session_info->>'session_id',
    session_info->>'user_agent',
    (session_info->>'ip_address')::inet
  );
END;
$$;

-- 3. Create secure withdrawal view with data masking for admins
CREATE OR REPLACE VIEW public.withdrawal_requests_admin_view AS
SELECT 
  wr.id,
  wr.user_id,
  -- Mask sensitive wallet address (show only first 6 and last 4 characters)
  CASE 
    WHEN get_admin_financial_access_secure() THEN 
      SUBSTRING(wr.wallet_address, 1, 6) || '...' || RIGHT(wr.wallet_address, 4)
    ELSE '***MASKED***'
  END as wallet_address_masked,
  wr.nctr_amount,
  wr.net_amount_nctr,
  wr.gas_fee_nctr,
  wr.status,
  wr.created_at,
  wr.processed_at,
  -- Mask failure reasons to prevent information leakage
  CASE 
    WHEN get_admin_financial_access_secure() AND wr.failure_reason IS NOT NULL THEN 
      'Error occurred - Contact support for details'
    ELSE NULL
  END as failure_reason_masked,
  wr.admin_notes,
  -- Add user profile info for context (non-sensitive)
  p.username,
  p.full_name,
  -- Mask email address
  CASE 
    WHEN get_admin_financial_access_secure() THEN 
      mask_sensitive_data(p.email, 'email')
    ELSE '***MASKED***'
  END as email_masked
FROM public.withdrawal_requests wr
LEFT JOIN public.profiles p ON p.user_id = wr.user_id
WHERE get_admin_financial_access_secure();

-- 4. Enhanced user access function with comprehensive validation
CREATE OR REPLACE FUNCTION public.validate_withdrawal_access(
  target_user_id uuid,
  access_type text,
  record_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  is_own_data boolean := false;
  is_admin boolean := false;
  session_age interval;
  result jsonb;
BEGIN
  -- Check authentication
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Authentication required',
      'risk_level', 'critical'
    );
  END IF;

  -- Check if user is accessing their own data
  is_own_data := (current_user_id = target_user_id);
  
  -- Check admin status with enhanced validation
  is_admin := get_admin_financial_access_secure();
  
  -- Validate session age for admin access
  IF is_admin AND NOT is_own_data THEN
    SELECT age(now(), last_sign_in_at) INTO session_age
    FROM auth.users 
    WHERE id = current_user_id;
    
    -- Require fresh session (max 6 hours) for admin financial access
    IF session_age > interval '6 hours' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Session too old for financial data access - please re-authenticate',
        'risk_level', 'critical'
      );
    END IF;
  END IF;

  -- Log the access attempt
  PERFORM log_financial_data_access(
    'withdrawal_requests',
    record_id,
    CASE 
      WHEN is_own_data THEN 'user_own_data'
      WHEN is_admin THEN 'admin_access'
      ELSE 'unauthorized_attempt'
    END,
    ARRAY[access_type],
    CASE 
      WHEN is_own_data THEN 'User viewing own withdrawal data'
      WHEN is_admin THEN 'Admin access for system management'
      ELSE 'Unauthorized access attempt'
    END
  );

  -- Determine access level
  IF is_own_data THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'access_level', 'own_data',
      'risk_level', 'low'
    );
  ELSIF is_admin THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'access_level', 'admin_masked',
      'risk_level', 'high'
    );
  ELSE
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Insufficient permissions for financial data access',
      'risk_level', 'critical'
    );
  END IF;
END;
$$;

-- 5. Create new secure RLS policies with comprehensive validation

-- User access policy (own data only)
CREATE POLICY "Secure user withdrawal access - own data only"
ON public.withdrawal_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id 
  AND (validate_withdrawal_access(user_id, 'select', id)->>'allowed')::boolean
);

-- User creation policy (own requests only)  
CREATE POLICY "Secure user withdrawal creation - own requests only"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND (validate_withdrawal_access(user_id, 'insert', NULL)->>'allowed')::boolean
);

-- Admin access policy with enhanced validation and logging
CREATE POLICY "Secure admin withdrawal access - enhanced validation"
ON public.withdrawal_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id OR
    (
      get_admin_financial_access_secure() 
      AND (validate_withdrawal_access(user_id, 'admin_select', id)->>'allowed')::boolean
    )
  )
);

-- Admin update policy with strict validation
CREATE POLICY "Secure admin withdrawal updates - strict validation"
ON public.withdrawal_requests
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND get_admin_financial_access_secure()
  AND is_treasury_admin(auth.uid())
  AND (validate_withdrawal_access(user_id, 'admin_update', id)->>'allowed')::boolean
);

-- 6. Create monitoring function for suspicious access patterns
CREATE OR REPLACE FUNCTION public.monitor_withdrawal_access_patterns()
RETURNS TABLE(
  user_id uuid,
  access_count bigint,
  last_access timestamp with time zone,
  risk_assessment text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sal.user_id,
    COUNT(*) as access_count,
    MAX(sal.created_at) as last_access,
    CASE 
      WHEN COUNT(*) > 50 THEN 'HIGH_RISK'
      WHEN COUNT(*) > 20 THEN 'MEDIUM_RISK'
      ELSE 'NORMAL'
    END as risk_assessment
  FROM public.security_audit_log sal
  WHERE sal.resource_table = 'withdrawal_requests'
    AND sal.created_at > now() - interval '24 hours'
    AND sal.action_type LIKE '%financial_data_access%'
  GROUP BY sal.user_id
  HAVING COUNT(*) > 5
  ORDER BY access_count DESC;
$$;
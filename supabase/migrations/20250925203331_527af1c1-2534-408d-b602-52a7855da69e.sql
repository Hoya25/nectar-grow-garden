-- Security Fix: Update policies and functions with CASCADE to resolve dependencies
-- First, drop the policies that depend on is_treasury_admin
DROP POLICY IF EXISTS "Treasury admins can view withdrawals with strict validation" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Treasury admins can update withdrawals with validation" ON public.withdrawal_requests;

-- Drop the function with CASCADE
DROP FUNCTION IF EXISTS public.is_treasury_admin(uuid) CASCADE;

-- Security Fix 1: Restrict public access to business-sensitive tables  
-- Update opportunity_status_levels to require authentication
DROP POLICY IF EXISTS "Authenticated users can view status levels" ON public.opportunity_status_levels;
CREATE POLICY "Authenticated users can view status levels" 
ON public.opportunity_status_levels 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update nctr_price_cache to add rate limiting and authentication
DROP POLICY IF EXISTS "Authenticated users can view NCTR price data" ON public.nctr_price_cache;
CREATE POLICY "Authenticated users can view NCTR price with rate limit" 
ON public.nctr_price_cache 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND check_price_access_rate_limit());

-- Update partner_campaigns to require authentication for viewing
DROP POLICY IF EXISTS "Authenticated users can view active campaigns" ON public.partner_campaigns;
CREATE POLICY "Authenticated users can view active campaigns" 
ON public.partner_campaigns 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Security Fix 2: Enhanced treasury admin validation (recreated)
CREATE OR REPLACE FUNCTION public.is_treasury_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.treasury_admin_roles tar
    JOIN public.admin_users au ON au.user_id = tar.user_id
    JOIN auth.users u ON u.id = au.user_id
    WHERE tar.user_id = check_user_id
      AND tar.is_active = true
      AND (tar.expires_at IS NULL OR tar.expires_at > now())
      AND u.email = 'anderson@projectbutterfly.io'
      AND au.access_level = 'full_access'
      AND u.last_sign_in_at > (now() - interval '24 hours')
  );
$$;

-- Security Fix 3: Add treasury operation validation function
CREATE OR REPLACE FUNCTION public.validate_treasury_operation(
  operation_type text,
  amount numeric DEFAULT NULL,
  user_id_param uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_limit numeric := 50000;
  max_single_withdrawal numeric := 100000;
  today_total numeric := 0;
BEGIN
  -- Check if treasury operations are enabled
  IF NOT EXISTS (
    SELECT 1 FROM treasury_config 
    WHERE setting_key = 'treasury_enabled' 
    AND (setting_value->>0)::boolean = true
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Treasury operations are currently disabled'
    );
  END IF;

  -- Validate withdrawal limits
  IF operation_type = 'withdrawal' AND amount IS NOT NULL THEN
    -- Check single withdrawal limit
    IF amount > max_single_withdrawal THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Amount exceeds maximum withdrawal limit'
      );
    END IF;

    -- Check daily limit
    SELECT COALESCE(SUM(nctr_amount), 0) INTO today_total
    FROM withdrawal_requests 
    WHERE user_id = user_id_param
      AND DATE(created_at) = CURRENT_DATE
      AND status IN ('pending', 'processing', 'completed');

    IF today_total + amount > daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Daily withdrawal limit would be exceeded'
      );
    END IF;
  END IF;

  -- Log security event
  PERFORM log_sensitive_access(
    operation_type || '_validation',
    'treasury_operations',
    user_id_param,
    'high'
  );

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Recreate enhanced withdrawal policies with better security
CREATE POLICY "Enhanced treasury admin view access with validation" 
ON public.withdrawal_requests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    (is_treasury_admin(auth.uid()) AND 
     (validate_financial_access('treasury_admin', 'read')->>'allowed')::boolean)
  )
);

CREATE POLICY "Enhanced treasury admin update access with validation" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (
  is_treasury_admin(auth.uid()) AND 
  (validate_financial_access('treasury_admin', 'update')->>'allowed')::boolean
);
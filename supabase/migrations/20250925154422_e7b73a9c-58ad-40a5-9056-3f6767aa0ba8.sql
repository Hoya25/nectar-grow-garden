-- CRITICAL SECURITY FIX: Implement strict financial data access controls
-- This addresses the security vulnerability where any admin could access all financial data

-- Step 1: Create dedicated financial admin roles and permissions
CREATE TABLE IF NOT EXISTS public.treasury_admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type text NOT NULL CHECK (role_type IN ('treasury_admin', 'withdrawal_approver', 'financial_auditor')),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  access_reason text,
  session_token text UNIQUE,
  last_access_at timestamp with time zone,
  UNIQUE(user_id, role_type)
);

-- Enable RLS on treasury admin roles
ALTER TABLE public.treasury_admin_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create secure financial access validation function
CREATE OR REPLACE FUNCTION public.validate_financial_access(
  required_role text DEFAULT 'treasury_admin',
  operation_type text DEFAULT 'read'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role record;
  access_granted boolean := false;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Must be authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Authentication required'
    );
  END IF;
  
  -- Check if user has required treasury role
  SELECT * INTO user_role
  FROM public.treasury_admin_roles
  WHERE user_id = current_user_id 
    AND role_type = required_role
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    -- Log unauthorized access attempt
    PERFORM public.log_sensitive_access(
      'unauthorized_financial_access_attempt',
      'withdrawal_requests',
      current_user_id,
      'critical'
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Treasury admin privileges required for financial operations'
    );
  END IF;
  
  -- Update last access time
  UPDATE public.treasury_admin_roles 
  SET last_access_at = now()
  WHERE id = user_role.id;
  
  -- Log legitimate access
  PERFORM public.log_sensitive_access(
    'authorized_financial_access',
    'withdrawal_requests',
    current_user_id,
    'high'
  );
  
  access_granted := true;
  
  RETURN jsonb_build_object(
    'allowed', access_granted,
    'role', user_role.role_type,
    'granted_by', user_role.granted_by,
    'reason', user_role.access_reason
  );
END;
$$;

-- Step 3: Create function to check if user is treasury admin
CREATE OR REPLACE FUNCTION public.is_treasury_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.treasury_admin_roles
    WHERE user_id = check_user_id
      AND role_type IN ('treasury_admin', 'withdrawal_approver')
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Step 4: Replace overly permissive withdrawal_requests policies with secure ones
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Enhanced withdrawal access with strict controls" ON public.withdrawal_requests;

-- New secure policies for withdrawal_requests
CREATE POLICY "Users can view own withdrawal requests only"
ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests only"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Treasury admins can view withdrawals with strict validation"
ON public.withdrawal_requests
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id  -- Users can see their own
    OR (
      public.is_treasury_admin(auth.uid())  -- Must be treasury admin
      AND (public.validate_financial_access('treasury_admin', 'read')->>'allowed')::boolean
    )
  )
);

CREATE POLICY "Treasury admins can update withdrawals with validation"
ON public.withdrawal_requests
FOR UPDATE
USING (
  public.is_treasury_admin(auth.uid())
  AND (public.validate_financial_access('treasury_admin', 'update')->>'allowed')::boolean
);

-- Step 5: Create secure treasury admin management functions
CREATE OR REPLACE FUNCTION public.grant_treasury_admin_access(
  target_user_id uuid,
  role_type text,
  access_reason text,
  expires_in_hours integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  granting_user_id uuid;
  expiry_time timestamp with time zone;
BEGIN
  granting_user_id := auth.uid();
  
  -- Only super admins can grant treasury access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = granting_user_id 
      AND access_level = 'full_access'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only super admins can grant treasury access'
    );
  END IF;
  
  -- Calculate expiry
  IF expires_in_hours IS NOT NULL THEN
    expiry_time := now() + (expires_in_hours || ' hours')::interval;
  END IF;
  
  -- Grant the role
  INSERT INTO public.treasury_admin_roles (
    user_id,
    role_type,
    granted_by,
    access_reason,
    expires_at
  ) VALUES (
    target_user_id,
    role_type,
    granting_user_id,
    access_reason,
    expiry_time
  )
  ON CONFLICT (user_id, role_type) 
  DO UPDATE SET
    granted_by = EXCLUDED.granted_by,
    granted_at = now(),
    access_reason = EXCLUDED.access_reason,
    expires_at = EXCLUDED.expires_at,
    is_active = true;
  
  -- Log the grant
  PERFORM public.log_sensitive_access(
    'treasury_admin_granted',
    'treasury_admin_roles',
    target_user_id,
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'role_granted', role_type,
    'expires_at', expiry_time
  );
END;
$$;

-- Step 6: Create policies for treasury admin roles table
CREATE POLICY "Super admins can manage treasury roles"
ON public.treasury_admin_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND access_level = 'full_access'
  )
);

CREATE POLICY "Treasury admins can view their own role"
ON public.treasury_admin_roles
FOR SELECT
USING (user_id = auth.uid());

-- Step 7: Create emergency revocation function
CREATE OR REPLACE FUNCTION public.revoke_treasury_access(
  target_user_id uuid,
  revocation_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only super admins can revoke treasury access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND access_level = 'full_access'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only super admins can revoke treasury access'
    );
  END IF;
  
  -- Revoke all treasury roles for the user
  UPDATE public.treasury_admin_roles
  SET is_active = false,
      expires_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the revocation
  PERFORM public.log_sensitive_access(
    'treasury_access_revoked',
    'treasury_admin_roles',
    target_user_id,
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'revocation_reason', revocation_reason
  );
END;
$$;
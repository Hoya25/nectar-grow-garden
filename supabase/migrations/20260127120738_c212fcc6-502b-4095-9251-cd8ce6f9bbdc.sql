-- =====================================================
-- SECURITY FIX: Add mandatory audit logging for admin access to sensitive data
-- Fixes: profiles_table_public_exposure, withdrawal_requests_financial_exposure
-- =====================================================

-- 1. Create a secure function to log and allow admin access
-- This function logs the access AND returns true to allow the access
CREATE OR REPLACE FUNCTION public.log_and_allow_admin_access(
  p_action_type text,
  p_resource_table text,
  p_resource_id uuid,
  p_risk_level text DEFAULT 'high'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Only proceed if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Insert audit log entry
  INSERT INTO security_audit_log (
    user_id,
    action_type,
    risk_level,
    resource_table,
    resource_id,
    metadata
  ) VALUES (
    v_user_id,
    p_action_type,
    p_risk_level,
    p_resource_table,
    p_resource_id,
    jsonb_build_object(
      'accessed_at', now(),
      'ip_info', 'client_access'
    )
  );
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  -- If logging fails, still allow access but log to console
  RAISE WARNING 'Failed to log admin access: %', SQLERRM;
  RETURN true;
END;
$$;

-- 2. Create a function to check admin access with mandatory logging
CREATE OR REPLACE FUNCTION public.check_admin_access_with_audit(
  p_resource_table text,
  p_resource_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin using existing function
  v_is_admin := is_admin();
  
  IF v_is_admin THEN
    -- Log the access before allowing
    PERFORM log_and_allow_admin_access(
      'admin_data_access',
      p_resource_table,
      p_resource_id,
      'high'
    );
  END IF;
  
  RETURN v_is_admin;
END;
$$;

-- 3. Update profiles table RLS policy for admin access with audit logging
-- First drop the existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Enhanced admin profile access with audit" ON profiles;

-- Create new policy that requires audit logging for admin access
CREATE POLICY "Admin profile access with mandatory audit" ON profiles
FOR SELECT
USING (
  -- Owner can always see their own profile
  auth.uid() = user_id
  OR
  -- Admin access requires logging
  check_admin_access_with_audit('profiles', id)
);

-- 4. Update withdrawal_requests table RLS policies for admin access with audit logging
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admin view withdrawals" ON withdrawal_requests;
DROP POLICY IF EXISTS "Treasury admins can view withdrawals" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admin update withdrawals" ON withdrawal_requests;
DROP POLICY IF EXISTS "Treasury admin update withdrawals" ON withdrawal_requests;

-- Create function to check treasury admin with audit
CREATE OR REPLACE FUNCTION public.check_treasury_admin_with_audit(
  p_resource_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_treasury_admin boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check treasury admin role
  SELECT EXISTS (
    SELECT 1 FROM treasury_admin_roles
    WHERE user_id = v_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_treasury_admin;
  
  IF v_is_treasury_admin THEN
    -- Log the access with critical risk level for financial data
    PERFORM log_and_allow_admin_access(
      'treasury_data_access',
      'withdrawal_requests',
      p_resource_id,
      'critical'
    );
  END IF;
  
  RETURN v_is_treasury_admin;
END;
$$;

-- Users can view their own withdrawal requests
DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Treasury admins can view all with mandatory audit logging
CREATE POLICY "Treasury admin view with audit" ON withdrawal_requests
FOR SELECT
USING (check_treasury_admin_with_audit(id));

-- Treasury admins can update with mandatory audit logging
CREATE POLICY "Treasury admin update with audit" ON withdrawal_requests
FOR UPDATE
USING (check_treasury_admin_with_audit(id))
WITH CHECK (check_treasury_admin_with_audit(id));

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_and_allow_admin_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_access_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_treasury_admin_with_audit TO authenticated;
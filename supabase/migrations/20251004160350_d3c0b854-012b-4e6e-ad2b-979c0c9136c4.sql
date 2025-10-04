-- Fix admin_activity_log RLS policy to allow proper INSERT operations
-- The current policy uses get_admin_financial_access_secure() which is failing
-- We'll update the INSERT policy to match the working SELECT policy approach

DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.admin_activity_log;

-- Create new INSERT policy that properly validates admin access
CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid()
    AND u.email IS NOT NULL
    AND au.created_at IS NOT NULL
    AND au.access_level IS NOT NULL
    AND u.last_sign_in_at > (now() - interval '24 hours')
  )
);

-- Add explicit DELETE protection on security_audit_log to prevent log tampering
DROP POLICY IF EXISTS "Deny all deletes on security_audit_log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Deny all updates on security_audit_log" ON public.security_audit_log;

CREATE POLICY "Deny all deletes on security_audit_log"
ON public.security_audit_log
FOR DELETE
USING (false);

CREATE POLICY "Deny all updates on security_audit_log"
ON public.security_audit_log
FOR UPDATE
USING (false);

-- Add authorization check to emergency_revoke_admin_access function
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
  -- CRITICAL: Verify caller is super admin
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Get the user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_user_email
    );
  END IF;

  -- Delete all admin roles for this user
  DELETE FROM public.admin_users
  WHERE user_id = target_user_id;

  GET DIAGNOSTICS revoked_count = ROW_COUNT;

  -- Log the emergency action
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'emergency_revoke_admin',
    'admin_users',
    target_user_id,
    'critical'
  );

  RETURN jsonb_build_object(
    'success', true,
    'revoked_count', revoked_count,
    'target_email', p_user_email,
    'message', 'Emergency admin access revocation completed'
  );
END;
$$;
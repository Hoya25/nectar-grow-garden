-- Security Enhancement: Create secure admin management functions
-- This addresses the "Admin Role Assignment Lacks Server Validation" security finding

-- 1. Create secure function to create admin users with proper validation
CREATE OR REPLACE FUNCTION public.create_admin_user_secure(
  p_user_id uuid,
  p_access_level text,
  p_access_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
  caller_email text;
BEGIN
  -- CRITICAL: Verify caller is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Verify target user exists in auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Validate access level
  IF p_access_level NOT IN ('basic_admin', 'management', 'full_access') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid access level. Must be: basic_admin, management, or full_access'
    );
  END IF;
  
  -- Prevent self-elevation to full_access without explicit super admin check
  IF p_user_id = auth.uid() AND p_access_level = 'full_access' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot self-promote to full_access without explicit authorization'
    );
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already an admin'
    );
  END IF;
  
  -- Create admin user
  INSERT INTO public.admin_users (
    user_id,
    access_level,
    created_by,
    permissions
  ) VALUES (
    p_user_id,
    p_access_level,
    auth.uid(),
    CASE p_access_level
      WHEN 'full_access' THEN ARRAY['manage_opportunities', 'manage_users', 'manage_brands', 'manage_system', 'manage_treasury']
      WHEN 'management' THEN ARRAY['manage_opportunities', 'manage_users', 'manage_brands']
      ELSE ARRAY['manage_opportunities']
    END
  );
  
  -- Get caller email for audit log
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  
  -- Log the admin creation with high risk level
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'create_admin_user',
    'admin_users',
    p_user_id,
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_email', user_email,
    'access_level', p_access_level,
    'created_by', caller_email,
    'message', 'Admin user created successfully'
  );
END;
$$;

-- 2. Create secure function to update admin access level
CREATE OR REPLACE FUNCTION public.update_admin_access_secure(
  p_user_id uuid,
  p_new_access_level text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_level text;
  user_email text;
BEGIN
  -- CRITICAL: Verify caller is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Get current access level
  SELECT access_level INTO current_level
  FROM public.admin_users
  WHERE user_id = p_user_id;
  
  IF current_level IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not an admin'
    );
  END IF;
  
  -- Validate new access level
  IF p_new_access_level NOT IN ('basic_admin', 'management', 'full_access') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid access level'
    );
  END IF;
  
  -- Prevent self-demotion from full_access
  IF p_user_id = auth.uid() AND current_level = 'full_access' AND p_new_access_level != 'full_access' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot self-demote from full_access'
    );
  END IF;
  
  -- Update admin access level
  UPDATE public.admin_users
  SET 
    access_level = p_new_access_level,
    permissions = CASE p_new_access_level
      WHEN 'full_access' THEN ARRAY['manage_opportunities', 'manage_users', 'manage_brands', 'manage_system', 'manage_treasury']
      WHEN 'management' THEN ARRAY['manage_opportunities', 'manage_users', 'manage_brands']
      ELSE ARRAY['manage_opportunities']
    END
  WHERE user_id = p_user_id;
  
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
  
  -- Log the access level change
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'update_admin_access',
    'admin_users',
    p_user_id,
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_email', user_email,
    'old_level', current_level,
    'new_level', p_new_access_level,
    'message', 'Admin access level updated successfully'
  );
END;
$$;

-- 3. Create secure function to revoke admin access
CREATE OR REPLACE FUNCTION public.revoke_admin_access_secure(
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email text;
  revoked_level text;
BEGIN
  -- CRITICAL: Verify caller is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;
  
  -- Prevent self-revocation
  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot revoke your own admin access'
    );
  END IF;
  
  -- Get admin details before deletion
  SELECT au.access_level, u.email
  INTO revoked_level, user_email
  FROM public.admin_users au
  JOIN auth.users u ON u.id = au.user_id
  WHERE au.user_id = p_user_id;
  
  IF revoked_level IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not an admin'
    );
  END IF;
  
  -- Delete admin record
  DELETE FROM public.admin_users
  WHERE user_id = p_user_id;
  
  -- Log the revocation
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'revoke_admin_access',
    'admin_users',
    p_user_id,
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_email', user_email,
    'revoked_level', revoked_level,
    'message', 'Admin access revoked successfully'
  );
END;
$$;

-- 4. Add comment documentation
COMMENT ON FUNCTION public.create_admin_user_secure IS 'Securely creates admin users with proper validation, audit logging, and permission assignment. Only callable by super admins.';
COMMENT ON FUNCTION public.update_admin_access_secure IS 'Securely updates admin access levels with validation and audit logging. Only callable by super admins.';
COMMENT ON FUNCTION public.revoke_admin_access_secure IS 'Securely revokes admin access with validation and audit logging. Only callable by super admins.';
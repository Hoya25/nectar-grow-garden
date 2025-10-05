-- Create role enum for proper role management
CREATE TYPE public.app_role AS ENUM (
  'user',
  'admin',
  'super_admin',
  'treasury_admin'
);

-- Create user_roles table (best practice separation)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Helper function to check if user is admin (any admin role)
CREATE OR REPLACE FUNCTION public.user_is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin', 'super_admin')
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.user_is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'super_admin')
$$;

-- Migrate existing admin_users to user_roles
INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
SELECT 
  user_id,
  CASE 
    WHEN access_level = 'full_access' THEN 'super_admin'::app_role
    WHEN access_level = 'management' THEN 'admin'::app_role
    ELSE 'admin'::app_role
  END,
  created_by,
  created_at
FROM public.admin_users
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS policies for user_roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Function to grant role (with audit logging)
CREATE OR REPLACE FUNCTION public.grant_user_role(
  p_user_id uuid,
  p_role public.app_role,
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role_id uuid;
BEGIN
  -- Only super admins can grant roles
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Cannot grant to yourself
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'Cannot grant roles to yourself';
  END IF;

  -- Insert the role
  INSERT INTO public.user_roles (user_id, role, granted_by, expires_at)
  VALUES (p_user_id, p_role, auth.uid(), p_expires_at)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    expires_at = p_expires_at,
    granted_at = now(),
    granted_by = auth.uid()
  RETURNING id INTO new_role_id;

  -- Log the action
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'grant_role',
    'user_roles',
    new_role_id,
    'high'
  );

  RETURN new_role_id;
END;
$$;

-- Function to revoke role (with audit logging)
CREATE OR REPLACE FUNCTION public.revoke_user_role(
  p_user_id uuid,
  p_role public.app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can revoke roles
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Cannot revoke from yourself
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'Cannot revoke your own roles';
  END IF;

  -- Delete the role
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND role = p_role;

  -- Log the action
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'revoke_role',
    'user_roles',
    p_user_id,
    'high'
  );

  RETURN true;
END;
$$;

-- Update existing is_admin() function to use new system
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_is_admin(auth.uid())
$$;

-- Update existing is_super_admin() function to use new system
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_is_super_admin(auth.uid())
$$;
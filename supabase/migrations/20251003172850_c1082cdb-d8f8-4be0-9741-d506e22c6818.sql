-- Add INSERT policy for security_audit_log to allow security monitoring
CREATE POLICY "System can log security events"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix make_user_admin_by_email to add explicit authorization check at function start
CREATE OR REPLACE FUNCTION public.make_user_admin_by_email(user_email text, admin_role text DEFAULT 'super_admin'::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
  result_message TEXT;
BEGIN
  -- CRITICAL SECURITY CHECK: Verify caller is super admin before any operations
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Only super admin can create admin users';
  END IF;
  
  -- Find user by email in auth.users
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email 
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN 'User with email ' || user_email || ' not found. Please ensure they have signed up first.';
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = target_user_id) THEN
    RETURN 'User ' || user_email || ' is already an admin.';
  END IF;
  
  -- Make user an admin
  INSERT INTO public.admin_users (user_id, role, permissions, created_by)
  VALUES (
    target_user_id, 
    admin_role, 
    ARRAY['manage_opportunities', 'manage_users', 'manage_brands', 'manage_system'],
    auth.uid()
  );
  
  RETURN 'Successfully made ' || user_email || ' a ' || admin_role || '.';
END;
$function$;
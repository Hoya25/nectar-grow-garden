-- Update admin system to restrict access to only anderson@projectbutterfly.io
-- First, remove any existing admin users that are not anderson@projectbutterfly.io
DELETE FROM public.admin_users 
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'anderson@projectbutterfly.io'
);

-- Update the check_user_is_admin function to also verify email
CREATE OR REPLACE FUNCTION public.check_user_is_admin(check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = check_user_id 
    AND u.email = 'anderson@projectbutterfly.io'
  );
$function$;

-- Update the check_admin_access_level function to also verify email
CREATE OR REPLACE FUNCTION public.check_admin_access_level(required_level text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND u.email = 'anderson@projectbutterfly.io'
    AND (
      au.access_level = required_level 
      OR (required_level = 'management' AND au.access_level = 'full_access')
      OR (required_level = 'basic_admin' AND au.access_level IN ('management', 'full_access'))
    )
  );
$function$;
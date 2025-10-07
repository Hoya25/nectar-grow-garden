-- Fix admin_activity_log foreign key issue by ensuring admin records exist
-- This migration addresses the constraint violation when admins try to log activities

-- First, let's make the logActivity safer by checking if admin record exists
-- Drop and recreate the admin_activity_log foreign key to be more permissive temporarily
ALTER TABLE public.admin_activity_log 
DROP CONSTRAINT IF EXISTS admin_activity_log_admin_user_id_fkey;

-- Recreate with ON DELETE SET NULL to handle missing admin records gracefully
ALTER TABLE public.admin_activity_log 
ADD CONSTRAINT admin_activity_log_admin_user_id_fkey 
FOREIGN KEY (admin_user_id) 
REFERENCES public.admin_users(id) 
ON DELETE SET NULL;

-- Create a trigger function to auto-create admin_users records for users with admin roles
CREATE OR REPLACE FUNCTION public.ensure_admin_user_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record_id uuid;
BEGIN
  -- Check if this is an admin/super_admin/treasury_admin role being granted
  IF NEW.role IN ('admin', 'super_admin', 'treasury_admin') THEN
    -- Check if admin_users record exists
    SELECT id INTO admin_record_id
    FROM public.admin_users
    WHERE user_id = NEW.user_id;
    
    -- If not, create one
    IF admin_record_id IS NULL THEN
      INSERT INTO public.admin_users (user_id, role, access_level, permissions)
      VALUES (
        NEW.user_id,
        NEW.role::text,
        CASE 
          WHEN NEW.role = 'super_admin' THEN 'full_access'
          WHEN NEW.role = 'treasury_admin' THEN 'management'
          ELSE 'basic_admin'
        END,
        ARRAY['manage_users', 'manage_opportunities']
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS ensure_admin_record_trigger ON public.user_roles;
CREATE TRIGGER ensure_admin_record_trigger
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_admin_user_record();

-- Backfill: Create admin_users records for existing user_roles
INSERT INTO public.admin_users (user_id, role, access_level, permissions)
SELECT DISTINCT
  ur.user_id,
  ur.role::text,
  CASE 
    WHEN ur.role = 'super_admin' THEN 'full_access'
    WHEN ur.role = 'treasury_admin' THEN 'management'
    ELSE 'basic_admin'
  END as access_level,
  ARRAY['manage_users', 'manage_opportunities'] as permissions
FROM public.user_roles ur
WHERE ur.role IN ('admin', 'super_admin', 'treasury_admin')
  AND (ur.expires_at IS NULL OR ur.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.user_id = ur.user_id
  )
ON CONFLICT (user_id) DO NOTHING;
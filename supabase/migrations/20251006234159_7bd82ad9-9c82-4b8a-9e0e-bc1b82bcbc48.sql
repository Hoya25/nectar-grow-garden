-- First make granted_by nullable  
ALTER TABLE public.treasury_admin_roles 
ALTER COLUMN granted_by DROP NOT NULL;

-- Ensure unique constraint exists on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'treasury_admin_roles_user_id_key'
  ) THEN
    ALTER TABLE public.treasury_admin_roles 
    ADD CONSTRAINT treasury_admin_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add the current super admin as treasury admin (using valid role_type: 'treasury_admin')
INSERT INTO public.treasury_admin_roles (user_id, role_type, is_active, granted_by)
VALUES ('fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff'::uuid, 'treasury_admin', true, NULL)
ON CONFLICT (user_id) DO UPDATE 
SET is_active = true, role_type = 'treasury_admin';
-- Make admin_activity_log.admin_user_id nullable to handle edge cases gracefully
-- This prevents foreign key violations when admin records are not properly synced

ALTER TABLE public.admin_activity_log 
ALTER COLUMN admin_user_id DROP NOT NULL;

-- Update any existing NULL admin_user_id entries to point to the correct admin record if possible
UPDATE public.admin_activity_log
SET admin_user_id = (
  SELECT au.id 
  FROM public.admin_users au
  WHERE au.user_id = admin_activity_log.admin_user_id
)
WHERE admin_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = admin_activity_log.admin_user_id
  );
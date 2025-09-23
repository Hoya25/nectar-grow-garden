-- Manually recalculate and update portfolio balances for the user
UPDATE public.nctr_portfolio 
SET 
  lock_90_nctr = (
    SELECT COALESCE(SUM(nctr_amount), 0) 
    FROM public.nctr_locks 
    WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff' 
      AND status = 'active' 
      AND lock_category = '90LOCK'
  ),
  lock_360_nctr = (
    SELECT COALESCE(SUM(nctr_amount), 0) 
    FROM public.nctr_locks 
    WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff' 
      AND status = 'active' 
      AND lock_category = '360LOCK'
  ),
  updated_at = now()
WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff';
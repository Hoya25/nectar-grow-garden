-- Manually recalculate and update all portfolio lock balances
-- This ensures existing locks are properly reflected in portfolios

DO $$
DECLARE
  user_record RECORD;
  lock_90_total NUMERIC;
  lock_360_total NUMERIC;
BEGIN
  -- Loop through all users who have locks
  FOR user_record IN 
    SELECT DISTINCT user_id FROM nctr_locks WHERE status = 'active'
  LOOP
    -- Calculate their lock balances
    SELECT 
      COALESCE(SUM(CASE WHEN lock_category = '90LOCK' THEN nctr_amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN lock_category = '360LOCK' THEN nctr_amount ELSE 0 END), 0)
    INTO lock_90_total, lock_360_total
    FROM nctr_locks 
    WHERE user_id = user_record.user_id 
      AND status = 'active';
    
    -- Update their portfolio
    UPDATE nctr_portfolio 
    SET 
      lock_90_nctr = lock_90_total,
      lock_360_nctr = lock_360_total,
      updated_at = now()
    WHERE user_id = user_record.user_id;
    
    RAISE NOTICE 'Updated user %: 90LOCK=%, 360LOCK=%', 
      user_record.user_id, lock_90_total, lock_360_total;
  END LOOP;
END $$;
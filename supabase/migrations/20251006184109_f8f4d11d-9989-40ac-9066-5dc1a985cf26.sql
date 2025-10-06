
-- Fix the portfolio sync issue for all users
-- First, let's manually sync Julia and any other users with mismatched data

-- Update nctr_portfolio to reflect actual lock amounts
UPDATE nctr_portfolio p
SET 
  lock_90_nctr = COALESCE((
    SELECT SUM(l.nctr_amount)
    FROM nctr_locks l
    WHERE l.user_id = p.user_id 
      AND l.status = 'active'
      AND l.lock_category = '90LOCK'
  ), 0),
  lock_360_nctr = COALESCE((
    SELECT SUM(l.nctr_amount)
    FROM nctr_locks l
    WHERE l.user_id = p.user_id 
      AND l.status = 'active'
      AND l.lock_category = '360LOCK'
  ), 0),
  updated_at = now()
WHERE user_id IN (
  SELECT DISTINCT p2.user_id
  FROM nctr_portfolio p2
  WHERE p2.lock_90_nctr != COALESCE((
      SELECT SUM(l.nctr_amount)
      FROM nctr_locks l
      WHERE l.user_id = p2.user_id AND l.status = 'active' AND l.lock_category = '90LOCK'
    ), 0)
    OR p2.lock_360_nctr != COALESCE((
      SELECT SUM(l.nctr_amount)
      FROM nctr_locks l
      WHERE l.user_id = p2.user_id AND l.status = 'active' AND l.lock_category = '360LOCK'
    ), 0)
);

-- Add a comment explaining the fix
COMMENT ON COLUMN nctr_portfolio.lock_90_nctr IS 'Synced with nctr_locks table via trigger';
COMMENT ON COLUMN nctr_portfolio.lock_360_nctr IS 'Synced with nctr_locks table via trigger';

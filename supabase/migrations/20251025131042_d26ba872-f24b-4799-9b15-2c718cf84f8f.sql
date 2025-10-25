-- Drop the incorrectly configured function
DROP FUNCTION IF EXISTS get_admin_user_portfolio(UUID);

-- Create secure admin function that uses the correct admin_users table
CREATE OR REPLACE FUNCTION get_admin_user_portfolio(target_user_id UUID)
RETURNS TABLE (
  available_nctr NUMERIC,
  pending_nctr NUMERIC,
  total_earned NUMERIC,
  lock_90_nctr NUMERIC,
  lock_360_nctr NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the calling user is an admin using admin_users table
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return portfolio data
  RETURN QUERY
  SELECT 
    p.available_nctr,
    p.pending_nctr,
    p.total_earned,
    p.lock_90_nctr,
    p.lock_360_nctr
  FROM nctr_portfolio p
  WHERE p.user_id = target_user_id;
END;
$$;
-- Create secure admin function to fetch user portfolio data
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
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
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
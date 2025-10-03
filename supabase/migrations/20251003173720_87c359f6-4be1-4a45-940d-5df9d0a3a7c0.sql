-- Create secure functions for opportunity delete and toggle operations
-- These bypass RLS to allow admin operations

-- Function to securely delete an opportunity (admin only)
CREATE OR REPLACE FUNCTION delete_opportunity_secure(
  opportunity_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  is_admin_user BOOLEAN;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = current_user_id
    AND u.email = 'anderson@projectbutterfly.io'
  ) INTO is_admin_user;
  
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete opportunities';
  END IF;
  
  -- Delete the opportunity
  DELETE FROM earning_opportunities
  WHERE id = opportunity_id;
  
  -- Return success
  RETURN TRUE;
END;
$$;

-- Function to securely toggle opportunity status (admin only)
CREATE OR REPLACE FUNCTION toggle_opportunity_status_secure(
  opportunity_id UUID
) RETURNS TABLE(
  id UUID,
  title TEXT,
  is_active BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  is_admin_user BOOLEAN;
  current_status BOOLEAN;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users au
    JOIN auth.users u ON u.id = au.user_id
    WHERE au.user_id = current_user_id
    AND u.email = 'anderson@projectbutterfly.io'
  ) INTO is_admin_user;
  
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can toggle opportunity status';
  END IF;
  
  -- Get current status
  SELECT eo.is_active INTO current_status
  FROM earning_opportunities eo
  WHERE eo.id = opportunity_id;
  
  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found';
  END IF;
  
  -- Toggle the status
  RETURN QUERY
  UPDATE earning_opportunities
  SET is_active = NOT current_status,
      updated_at = now()
  WHERE earning_opportunities.id = opportunity_id
  RETURNING 
    earning_opportunities.id,
    earning_opportunities.title,
    earning_opportunities.is_active,
    earning_opportunities.updated_at;
END;
$$;

COMMENT ON FUNCTION delete_opportunity_secure IS 'Securely delete an opportunity (admin only) - bypasses RLS';
COMMENT ON FUNCTION toggle_opportunity_status_secure IS 'Securely toggle opportunity active status (admin only) - bypasses RLS';
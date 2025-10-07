-- Add IP tracking to profiles for fraud detection
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signup_ip inet,
ADD COLUMN IF NOT EXISTS last_login_ip inet,
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned'));

-- Add IP to referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS referee_signup_ip inet;

-- Create function to detect duplicate IP addresses
CREATE OR REPLACE FUNCTION public.detect_duplicate_ips()
RETURNS TABLE (
  ip_address inet,
  account_count bigint,
  user_ids uuid[],
  emails text[],
  created_dates timestamptz[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    signup_ip as ip_address,
    COUNT(*) as account_count,
    array_agg(user_id) as user_ids,
    array_agg(email) as emails,
    array_agg(created_at) as created_dates
  FROM profiles
  WHERE signup_ip IS NOT NULL
  GROUP BY signup_ip
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
$$;

-- Create function to suspend user account
CREATE OR REPLACE FUNCTION public.suspend_user_account(
  p_user_id uuid,
  p_reason text DEFAULT 'Suspended by admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows integer := 0;
BEGIN
  -- Only admins can suspend accounts
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Update profile status
  UPDATE profiles
  SET account_status = 'suspended'
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Log the action
  INSERT INTO security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'suspend_account',
    'profiles',
    p_user_id,
    'high'
  );
  
  RETURN jsonb_build_object(
    'success', affected_rows > 0,
    'user_id', p_user_id,
    'reason', p_reason,
    'suspended_by', auth.uid(),
    'suspended_at', now()
  );
END;
$$;

-- Create function to revoke fraudulent NCTR
CREATE OR REPLACE FUNCTION public.revoke_fraudulent_nctr(
  p_user_id uuid,
  p_reason text DEFAULT 'Fraudulent activity detected'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_portfolio RECORD;
  total_revoked numeric := 0;
  transactions_affected integer := 0;
  locks_affected integer := 0;
BEGIN
  -- Only admins can revoke NCTR
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get current portfolio
  SELECT * INTO user_portfolio
  FROM nctr_portfolio
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User portfolio not found'
    );
  END IF;
  
  -- Calculate total NCTR to revoke
  total_revoked := COALESCE(user_portfolio.available_nctr, 0) + 
                   COALESCE(user_portfolio.lock_90_nctr, 0) + 
                   COALESCE(user_portfolio.lock_360_nctr, 0);
  
  -- Mark all transactions as revoked
  UPDATE nctr_transactions
  SET status = 'revoked',
      description = description || ' [REVOKED: ' || p_reason || ']'
  WHERE user_id = p_user_id
    AND status = 'completed';
  
  GET DIAGNOSTICS transactions_affected = ROW_COUNT;
  
  -- Deactivate all locks
  UPDATE nctr_locks
  SET status = 'revoked'
  WHERE user_id = p_user_id
    AND status = 'active';
  
  GET DIAGNOSTICS locks_affected = ROW_COUNT;
  
  -- Zero out portfolio
  UPDATE nctr_portfolio
  SET available_nctr = 0,
      lock_90_nctr = 0,
      lock_360_nctr = 0,
      total_earned = 0,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Mark referrals as fraudulent
  UPDATE referrals
  SET status = 'fraudulent',
      reward_credited = false
  WHERE referrer_user_id = p_user_id
    OR referred_user_id = p_user_id;
  
  -- Log the action
  INSERT INTO security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'revoke_nctr',
    'nctr_portfolio',
    p_user_id,
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'total_revoked', total_revoked,
    'transactions_affected', transactions_affected,
    'locks_affected', locks_affected,
    'reason', p_reason,
    'revoked_by', auth.uid(),
    'revoked_at', now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.detect_duplicate_ips() TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_user_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_fraudulent_nctr(uuid, text) TO authenticated;
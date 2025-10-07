-- Create function to suspend user accounts
CREATE OR REPLACE FUNCTION public.suspend_user_account(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Update profile to suspend the user
  UPDATE public.profiles
  SET 
    account_status = 'suspended',
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the action in security audit log
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_table,
    resource_id,
    risk_level
  ) VALUES (
    auth.uid(),
    'suspend_user',
    'profiles',
    p_user_id,
    'high'
  );

  result := jsonb_build_object(
    'success', true,
    'message', 'User suspended successfully',
    'user_id', p_user_id,
    'reason', p_reason
  );

  RETURN result;
END;
$$;

-- Create function to revoke fraudulent NCTR
CREATE OR REPLACE FUNCTION public.revoke_fraudulent_nctr(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portfolio_record record;
  v_total_revoked numeric := 0;
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get current portfolio
  SELECT * INTO v_portfolio_record
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portfolio not found for user';
  END IF;

  -- Calculate total to revoke
  v_total_revoked := COALESCE(v_portfolio_record.available_nctr, 0) + 
                     COALESCE(v_portfolio_record.lock_90_nctr, 0) + 
                     COALESCE(v_portfolio_record.lock_360_nctr, 0);

  -- Zero out all NCTR balances
  UPDATE public.nctr_portfolio
  SET 
    available_nctr = 0,
    lock_90_nctr = 0,
    lock_360_nctr = 0,
    pending_nctr = 0,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Deactivate all active locks
  UPDATE public.nctr_locks
  SET status = 'revoked'
  WHERE user_id = p_user_id 
    AND status = 'active';

  -- Record the revocation transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    status
  ) VALUES (
    p_user_id,
    'revoked',
    v_total_revoked,
    'NCTR revoked by admin: ' || p_reason,
    'completed'
  );

  -- Log the action
  INSERT INTO public.security_audit_log (
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

  result := jsonb_build_object(
    'success', true,
    'message', 'NCTR revoked successfully',
    'user_id', p_user_id,
    'total_revoked', v_total_revoked,
    'reason', p_reason
  );

  RETURN result;
END;
$$;
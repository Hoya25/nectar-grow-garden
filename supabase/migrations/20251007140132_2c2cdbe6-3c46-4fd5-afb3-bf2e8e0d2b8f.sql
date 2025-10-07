-- Fix revoke_fraudulent_nctr to use 'withdrawn' status which is allowed by check constraint
-- Allowed statuses are: 'active', 'completed', 'withdrawn', 'upgraded'

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
  v_available_nctr numeric;
  v_lock_90_nctr numeric;
  v_lock_360_nctr numeric;
  v_pending_nctr numeric;
  v_total_revoked numeric;
BEGIN
  -- Security check: Only admins can revoke NCTR
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get user's portfolio
  SELECT * INTO v_portfolio_record
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User portfolio not found'
    );
  END IF;

  -- Store current balances
  v_available_nctr := COALESCE(v_portfolio_record.available_nctr, 0);
  v_lock_90_nctr := COALESCE(v_portfolio_record.lock_90_nctr, 0);
  v_lock_360_nctr := COALESCE(v_portfolio_record.lock_360_nctr, 0);
  v_pending_nctr := COALESCE(v_portfolio_record.pending_nctr, 0);
  v_total_revoked := v_available_nctr + v_lock_90_nctr + v_lock_360_nctr + v_pending_nctr;

  -- Zero out all NCTR balances in portfolio
  UPDATE public.nctr_portfolio
  SET 
    available_nctr = 0,
    lock_90_nctr = 0,
    lock_360_nctr = 0,
    pending_nctr = 0,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Mark all active locks as withdrawn (allowed by check constraint)
  UPDATE public.nctr_locks
  SET status = 'withdrawn'
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
    -v_total_revoked,
    'NCTR revoked by admin: ' || p_reason,
    'completed'
  );

  -- Log the action in security audit log
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
    v_portfolio_record.id,
    'critical'
  );

  RETURN jsonb_build_object(
    'success', true,
    'total_revoked', v_total_revoked,
    'reason', p_reason
  );
END;
$$;
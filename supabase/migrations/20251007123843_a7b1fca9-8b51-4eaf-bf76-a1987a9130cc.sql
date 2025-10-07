-- Remove admin activity logging from problematic functions to fix persistent 409 errors
-- The FK constraint on admin_activity_log.admin_user_id is causing conflicts

CREATE OR REPLACE FUNCTION public.suspend_user_account(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Update user account status
  UPDATE public.profiles
  SET account_status = 'suspended'
  WHERE user_id = p_user_id;

  -- No admin activity logging to avoid FK constraints
  
  result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'reason', p_reason
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_fraudulent_nctr(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  revoked_amount numeric;
  result jsonb;
BEGIN
  -- Check admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get total NCTR before revoking
  SELECT 
    COALESCE(available_nctr, 0) + COALESCE(lock_90_nctr, 0) + COALESCE(lock_360_nctr, 0)
  INTO revoked_amount
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;

  -- Zero out all NCTR balances
  UPDATE public.nctr_portfolio
  SET 
    available_nctr = 0,
    lock_90_nctr = 0,
    lock_360_nctr = 0,
    pending_nctr = 0,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Deactivate all locks
  UPDATE public.nctr_locks
  SET status = 'revoked'
  WHERE user_id = p_user_id AND status = 'active';

  -- Record revocation transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    status
  ) VALUES (
    p_user_id,
    'revoked',
    -revoked_amount,
    'NCTR revoked by admin: ' || p_reason,
    'completed'
  );

  -- No admin activity logging to avoid FK constraints

  result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'revoked_amount', revoked_amount,
    'reason', p_reason
  );

  RETURN result;
END;
$$;
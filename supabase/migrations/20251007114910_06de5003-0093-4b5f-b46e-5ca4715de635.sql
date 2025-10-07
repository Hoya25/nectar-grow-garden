-- Drop and recreate both functions with proper admin_users check

-- Drop revoke_fraudulent_nctr
DROP FUNCTION IF EXISTS public.revoke_fraudulent_nctr(uuid, text);

-- Drop suspend_user_account with its full signature
DROP FUNCTION IF EXISTS public.suspend_user_account(uuid, text);
DROP FUNCTION IF EXISTS public.suspend_user_account(uuid);

-- Recreate revoke_fraudulent_nctr with admin_users check
CREATE FUNCTION public.revoke_fraudulent_nctr(
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
  admin_exists boolean;
BEGIN
  -- Verify admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Check if current user exists in admin_users
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO admin_exists;
  
  -- Get current NCTR amounts
  SELECT 
    COALESCE(available_nctr, 0) + COALESCE(pending_nctr, 0) + COALESCE(lock_90_nctr, 0) + COALESCE(lock_360_nctr, 0)
  INTO revoked_amount
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;
  
  -- Revoke all NCTR by setting everything to 0
  UPDATE public.nctr_portfolio
  SET 
    available_nctr = 0,
    pending_nctr = 0,
    lock_90_nctr = 0,
    lock_360_nctr = 0,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Deactivate all locks
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
    -revoked_amount,
    'NCTR revoked by admin: ' || p_reason,
    'completed'
  );
  
  -- Log to admin_activity_log only if admin exists in admin_users table
  IF admin_exists THEN
    INSERT INTO public.admin_activity_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'revoked_nctr',
      'nctr_portfolio',
      p_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'revoked_amount', revoked_amount,
        'revoked_at', now()
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'revoked_amount', revoked_amount,
    'user_id', p_user_id,
    'reason', p_reason
  );
END;
$$;

-- Recreate suspend_user_account function with admin_users check
CREATE FUNCTION public.suspend_user_account(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_exists boolean;
BEGIN
  -- Verify admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Check if current user exists in admin_users
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) INTO admin_exists;
  
  -- Update profile account status to suspended
  UPDATE public.profiles
  SET 
    account_status = 'suspended',
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log to admin_activity_log only if admin exists in admin_users table
  IF admin_exists THEN
    INSERT INTO public.admin_activity_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'suspended_user',
      'profiles',
      p_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'suspended_at', now()
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'reason', p_reason
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.suspend_user_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_fraudulent_nctr(uuid, text) TO authenticated;
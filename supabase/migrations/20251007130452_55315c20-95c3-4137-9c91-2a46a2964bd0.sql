-- FINAL FIX: Drop and recreate all functions cleanly
-- Addresses: Revoke NCTR FK error + Suspend status not showing in UI

-- 1. Drop all problematic functions with CASCADE
DROP FUNCTION IF EXISTS public.revoke_fraudulent_nctr CASCADE;
DROP FUNCTION IF EXISTS public.revoke_fraudulent_nctr(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.suspend_user_account CASCADE;
DROP FUNCTION IF EXISTS public.suspend_user_account(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_user_list CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_user_list() CASCADE;

-- 2. Recreate suspend_user_account WITHOUT admin_activity_log
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
  result jsonb;
BEGIN
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE public.profiles
  SET account_status = 'suspended'
  WHERE user_id = p_user_id;

  result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'reason', p_reason,
    'new_status', 'suspended'
  );

  RETURN result;
END;
$$;

-- 3. Recreate revoke_fraudulent_nctr WITHOUT admin_activity_log  
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
  result jsonb;
BEGIN
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT 
    COALESCE(available_nctr, 0) + COALESCE(lock_90_nctr, 0) + COALESCE(lock_360_nctr, 0)
  INTO revoked_amount
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;

  UPDATE public.nctr_portfolio
  SET 
    available_nctr = 0,
    lock_90_nctr = 0,
    lock_360_nctr = 0,
    pending_nctr = 0,
    updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.nctr_locks
  SET status = 'revoked'
  WHERE user_id = p_user_id AND status = 'active';

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

  result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'revoked_amount', revoked_amount,
    'reason', p_reason
  );

  RETURN result;
END;
$$;

-- 4. Recreate get_admin_user_list WITH account_status field
CREATE FUNCTION public.get_admin_user_list()
RETURNS TABLE(
    id uuid,
    user_id uuid,
    username text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    wallet_address text,
    wallet_connected_at timestamp with time zone,
    account_status text,
    available_nctr numeric,
    pending_nctr numeric,
    total_earned numeric,
    lock_90_nctr numeric,
    lock_360_nctr numeric,
    opportunity_status text,
    is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NOT get_admin_financial_access_secure() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required for user list';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        p.created_at,
        p.updated_at,
        p.wallet_address,
        p.wallet_connected_at,
        COALESCE(p.account_status, 'active') as account_status,
        COALESCE(np.available_nctr, 0) as available_nctr,
        COALESCE(np.pending_nctr, 0) as pending_nctr,
        COALESCE(np.total_earned, 0) as total_earned,
        COALESCE(np.lock_90_nctr, 0) as lock_90_nctr,
        COALESCE(np.lock_360_nctr, 0) as lock_360_nctr,
        COALESCE(np.opportunity_status, 'starter') as opportunity_status,
        (au.user_id IS NOT NULL) as is_admin
    FROM public.profiles p
    LEFT JOIN public.nctr_portfolio np ON p.user_id = np.user_id
    LEFT JOIN public.admin_users au ON p.user_id = au.user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.suspend_user_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_fraudulent_nctr(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_list() TO authenticated;
-- Create secure admin-only functions for user data access
-- This ensures only verified admins can access sensitive user information

-- Function to get user activity data (transactions, locks, referrals) - ADMIN ONLY
CREATE OR REPLACE FUNCTION public.get_admin_user_activity(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    transactions_data jsonb;
    locks_data jsonb;
    referrals_data jsonb;
    result jsonb;
BEGIN
    -- Verify admin access with enhanced security
    IF NOT get_admin_financial_access_secure() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Get transactions (last 50)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'transaction_type', transaction_type,
            'nctr_amount', nctr_amount,
            'description', description,
            'earning_source', earning_source,
            'status', status,
            'created_at', created_at,
            'partner_name', partner_name
        )
    ) INTO transactions_data
    FROM (
        SELECT *
        FROM public.nctr_transactions
        WHERE user_id = target_user_id
        ORDER BY created_at DESC
        LIMIT 50
    ) t;
    
    -- Get locks
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'lock_type', lock_type,
            'lock_category', lock_category,
            'nctr_amount', nctr_amount,
            'lock_date', lock_date,
            'unlock_date', unlock_date,
            'status', status,
            'commitment_days', commitment_days,
            'created_at', created_at
        )
    ) INTO locks_data
    FROM public.nctr_locks
    WHERE user_id = target_user_id
    ORDER BY created_at DESC;
    
    -- Get referrals
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'referred_user_id', referred_user_id,
            'referral_code', referral_code,
            'status', status,
            'reward_credited', reward_credited,
            'created_at', created_at,
            'rewarded_at', rewarded_at
        )
    ) INTO referrals_data
    FROM public.referrals
    WHERE referrer_user_id = target_user_id
    ORDER BY created_at DESC;
    
    -- Build result
    result := jsonb_build_object(
        'transactions', COALESCE(transactions_data, '[]'::jsonb),
        'locks', COALESCE(locks_data, '[]'::jsonb),
        'referrals', COALESCE(referrals_data, '[]'::jsonb)
    );
    
    RETURN result;
END;
$$;

-- Function to get user statistics - ADMIN ONLY
CREATE OR REPLACE FUNCTION public.get_admin_user_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    total_transactions integer;
    total_referrals integer;
    successful_referrals integer;
    active_locks integer;
    last_activity timestamp with time zone;
    result jsonb;
BEGIN
    -- Verify admin access
    IF NOT get_admin_financial_access_secure() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Get transaction count
    SELECT COUNT(*) INTO total_transactions
    FROM public.nctr_transactions
    WHERE user_id = target_user_id;
    
    -- Get referral counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed' AND reward_credited = true)
    INTO total_referrals, successful_referrals
    FROM public.referrals
    WHERE referrer_user_id = target_user_id;
    
    -- Get active locks count
    SELECT COUNT(*) INTO active_locks
    FROM public.nctr_locks
    WHERE user_id = target_user_id AND status = 'active';
    
    -- Get last activity
    SELECT MAX(created_at) INTO last_activity
    FROM public.nctr_transactions
    WHERE user_id = target_user_id;
    
    -- Build result
    result := jsonb_build_object(
        'total_transactions', total_transactions,
        'total_referrals', total_referrals,
        'successful_referrals', successful_referrals,
        'active_locks', active_locks,
        'last_activity', last_activity
    );
    
    RETURN result;
END;
$$;

-- Function to safely get admin user list with enhanced security
CREATE OR REPLACE FUNCTION public.get_admin_user_list()
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
    -- Verify admin access with enhanced security
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
-- Create a secure function to get user status details
-- This approach is more explicit than relying on view RLS inheritance
CREATE OR REPLACE FUNCTION public.get_user_status_details(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
    user_id uuid,
    opportunity_status text,
    status_description text,
    status_benefits text[],
    reward_multiplier numeric,
    required_locked_nctr numeric,
    required_lock_duration integer,
    current_locked_nctr numeric,
    current_min_duration integer,
    next_status text,
    next_required_locked numeric,
    next_required_duration integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    query_user_id uuid;
BEGIN
    -- Determine which user's data to fetch
    query_user_id := COALESCE(target_user_id, auth.uid());
    
    -- Security check: users can only access their own data
    -- Admins could potentially access other users' data (future feature)
    IF query_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: You can only view your own status details';
    END IF;

    RETURN QUERY
    SELECT 
        p.user_id,
        p.opportunity_status,
        osl.description AS status_description,
        osl.benefits AS status_benefits,
        osl.reward_multiplier,
        osl.min_locked_nctr AS required_locked_nctr,
        osl.min_lock_duration AS required_lock_duration,
        COALESCE(locks.total_locked, 0::numeric) AS current_locked_nctr,
        COALESCE(locks.min_duration, 0) AS current_min_duration,
        next_level.status_name AS next_status,
        next_level.min_locked_nctr AS next_required_locked,
        next_level.min_lock_duration AS next_required_duration
    FROM nctr_portfolio p
    LEFT JOIN opportunity_status_levels osl ON (osl.status_name = p.opportunity_status)
    LEFT JOIN (
        SELECT 
            nl.user_id,
            sum(nl.nctr_amount) AS total_locked,
            min(EXTRACT(days FROM (nl.unlock_date - nl.lock_date))::integer) AS min_duration
        FROM nctr_locks nl
        WHERE nl.status = 'active'
        GROUP BY nl.user_id
    ) locks ON (locks.user_id = p.user_id)
    LEFT JOIN opportunity_status_levels next_level ON (
        next_level.min_locked_nctr > COALESCE(locks.total_locked, 0::numeric) OR 
        next_level.min_lock_duration > COALESCE(locks.min_duration, 0)
    )
    WHERE p.user_id = query_user_id
    ORDER BY next_level.min_locked_nctr
    LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_status_details TO authenticated;
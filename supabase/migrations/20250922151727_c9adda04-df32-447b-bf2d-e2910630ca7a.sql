-- Drop the existing view
DROP VIEW IF EXISTS public.user_status_details;

-- Recreate as a SECURITY INVOKER view (respects underlying table RLS)
CREATE VIEW public.user_status_details 
WITH (security_invoker = true) AS
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
        user_id,
        sum(nctr_amount) AS total_locked,
        min(EXTRACT(days FROM (unlock_date - lock_date))::integer) AS min_duration
    FROM nctr_locks
    WHERE status = 'active'
    GROUP BY user_id
) locks ON (locks.user_id = p.user_id)
LEFT JOIN opportunity_status_levels next_level ON (
    next_level.min_locked_nctr > COALESCE(locks.total_locked, 0::numeric) OR 
    next_level.min_lock_duration > COALESCE(locks.min_duration, 0)
)
ORDER BY p.user_id, next_level.min_locked_nctr;
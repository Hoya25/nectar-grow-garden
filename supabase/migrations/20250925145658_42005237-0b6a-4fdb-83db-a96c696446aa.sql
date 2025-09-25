-- Drop the existing security_summary view since it's not secure
DROP VIEW IF EXISTS public.security_summary;

-- Create a secure function to replace the view functionality
-- This follows the same pattern as get_security_dashboard_data() function
CREATE OR REPLACE FUNCTION public.get_security_summary()
RETURNS TABLE(
  critical_events_today bigint,
  high_risk_events_today bigint,
  active_users_today bigint,
  last_activity timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.admin_users au
        JOIN auth.users u ON u.id = au.user_id
        WHERE au.user_id = auth.uid() 
        AND u.email = 'anderson@projectbutterfly.io'
        AND au.access_level = 'full_access'
      ) THEN 
        -- If user is super admin, return actual data
        (SELECT count(
          CASE
            WHEN (risk_level = 'critical'::text) THEN 1
            ELSE NULL::integer
          END) 
         FROM security_audit_log
         WHERE (created_at >= CURRENT_DATE))
      ELSE 
        -- If not authorized, return 0
        0::bigint
    END AS critical_events_today,
    
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.admin_users au
        JOIN auth.users u ON u.id = au.user_id
        WHERE au.user_id = auth.uid() 
        AND u.email = 'anderson@projectbutterfly.io'
        AND au.access_level = 'full_access'
      ) THEN 
        (SELECT count(
          CASE
            WHEN (risk_level = 'high'::text) THEN 1
            ELSE NULL::integer
          END)
         FROM security_audit_log
         WHERE (created_at >= CURRENT_DATE))
      ELSE 
        0::bigint
    END AS high_risk_events_today,
    
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.admin_users au
        JOIN auth.users u ON u.id = au.user_id
        WHERE au.user_id = auth.uid() 
        AND u.email = 'anderson@projectbutterfly.io'
        AND au.access_level = 'full_access'
      ) THEN 
        (SELECT count(DISTINCT user_id)
         FROM security_audit_log
         WHERE (created_at >= CURRENT_DATE))
      ELSE 
        0::bigint
    END AS active_users_today,
    
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.admin_users au
        JOIN auth.users u ON u.id = au.user_id
        WHERE au.user_id = auth.uid() 
        AND u.email = 'anderson@projectbutterfly.io'
        AND au.access_level = 'full_access'
      ) THEN 
        (SELECT max(created_at)
         FROM security_audit_log
         WHERE (created_at >= CURRENT_DATE))
      ELSE 
        NULL::timestamp with time zone
    END AS last_activity;
$$;
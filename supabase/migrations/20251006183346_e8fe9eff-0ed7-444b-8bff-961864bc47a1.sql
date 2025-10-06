
-- Fix the get_admin_user_activity function - SQL error with GROUP BY clause
DROP FUNCTION IF EXISTS get_admin_user_activity(uuid);

CREATE OR REPLACE FUNCTION get_admin_user_activity(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_data jsonb;
BEGIN
  -- Check admin access
  IF NOT (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get user activity data
  SELECT jsonb_build_object(
    'transactions', (
      SELECT COALESCE(jsonb_agg(t.*), '[]'::jsonb)
      FROM (
        SELECT id, user_id, transaction_type, nctr_amount, description, earning_source, status, created_at
        FROM nctr_transactions
        WHERE user_id = target_user_id
        ORDER BY created_at DESC
        LIMIT 50
      ) t
    ),
    'locks', (
      SELECT COALESCE(jsonb_agg(l.*), '[]'::jsonb)
      FROM (
        SELECT id, user_id, nctr_amount, lock_type, lock_category, unlock_date, status, created_at
        FROM nctr_locks
        WHERE user_id = target_user_id
        ORDER BY created_at DESC
      ) l
    ),
    'referrals', (
      SELECT COALESCE(jsonb_agg(r.*), '[]'::jsonb)
      FROM (
        SELECT id, referrer_user_id, referred_user_id, referral_code, status, reward_credited, created_at
        FROM referrals
        WHERE referrer_user_id = target_user_id OR referred_user_id = target_user_id
        ORDER BY created_at DESC
      ) r
    )
  ) INTO activity_data;

  RETURN activity_data;
END;
$$;

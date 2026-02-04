-- Create secure admin function to get comprehensive user behavior data
CREATE OR REPLACE FUNCTION public.get_admin_user_behavior(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  is_admin boolean;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Build comprehensive behavior data
  SELECT jsonb_build_object(
    'checkin_streak', (
      SELECT jsonb_build_object(
        'current_streak', COALESCE(current_streak, 0),
        'longest_streak', COALESCE(longest_streak, 0),
        'total_checkins', COALESCE(total_checkins, 0),
        'last_checkin_date', last_checkin_date,
        'streak_bonuses_earned', COALESCE(streak_bonuses_earned, 0)
      )
      FROM daily_checkin_streaks
      WHERE user_id = target_user_id
    ),
    'learning_progress', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'module_id', lp.module_id,
          'module_title', lm.title,
          'status', lp.status,
          'content_viewed', lp.content_viewed,
          'quiz_passed', lp.quiz_passed,
          'quiz_score', lp.quiz_score,
          'reward_claimed', lp.reward_claimed,
          'reward_amount', lp.reward_amount,
          'started_at', lp.started_at,
          'completed_at', lp.completed_at
        ) ORDER BY lp.created_at DESC
      ), '[]'::jsonb)
      FROM learning_progress lp
      LEFT JOIN learning_modules lm ON lm.id = lp.module_id
      WHERE lp.user_id = target_user_id
    ),
    'affiliate_clicks', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', alc.id,
          'platform_name', ial.platform_name,
          'clicked_at', alc.clicked_at,
          'referrer', alc.referrer
        ) ORDER BY alc.clicked_at DESC
      ), '[]'::jsonb)
      FROM affiliate_link_clicks alc
      LEFT JOIN independent_affiliate_links ial ON ial.id = alc.link_id
      WHERE alc.user_id = target_user_id
      LIMIT 50
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'platform', platform,
          'action_type', action_type,
          'action_data', action_data,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ), '[]'::jsonb)
      FROM cross_platform_activity_log
      WHERE user_id = target_user_id
      LIMIT 100
    ),
    'session_info', (
      SELECT jsonb_build_object(
        'signup_ip', p.signup_ip::text,
        'last_login_ip', p.last_login_ip::text,
        'nctr_live_verified', p.nctr_live_verified,
        'nctr_live_email', p.nctr_live_email,
        'account_status', p.account_status
      )
      FROM profiles p
      WHERE p.user_id = target_user_id
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_admin_user_behavior(uuid) TO authenticated;
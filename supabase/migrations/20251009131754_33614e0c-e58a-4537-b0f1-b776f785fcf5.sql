
-- Update referral system to credit BOTH referrer and referred user
-- Referrer gets 500 NCTR, Referred user gets 500 NCTR welcome bonus

CREATE OR REPLACE FUNCTION public.process_completed_referral(p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_referral RECORD;
  v_invite_opportunity RECORD;
  v_referrer_lock_id uuid;
  v_referee_lock_id uuid;
  v_reward_amount numeric;
BEGIN
  -- Get the referral record
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_user_id = p_referred_user_id
    AND status = 'completed'
    AND reward_credited = false
  LIMIT 1;

  -- If no uncredited referral found, return
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No uncredited referral found for this user'
    );
  END IF;

  -- Get the invite opportunity configuration
  SELECT * INTO v_invite_opportunity
  FROM public.earning_opportunities
  WHERE opportunity_type = 'invite'
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active invite opportunity configured'
    );
  END IF;

  -- Determine reward amount (prioritize lock_360, then lock_90, then available)
  v_reward_amount := COALESCE(
    v_invite_opportunity.lock_360_nctr_reward,
    v_invite_opportunity.lock_90_nctr_reward,
    v_invite_opportunity.available_nctr_reward,
    500  -- Default fallback
  );

  IF v_reward_amount <= 0 THEN
    v_reward_amount := 500;  -- Ensure minimum reward
  END IF;

  -- Credit the REFERRER (person who invited)
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + v_reward_amount,
      updated_at = now()
  WHERE user_id = v_referral.referrer_user_id;

  -- Auto-lock referrer's reward in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    v_referral.referrer_user_id,
    v_reward_amount,
    'invite',
    'invite'
  ) INTO v_referrer_lock_id;

  -- Record referrer transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    v_referral.referrer_user_id,
    'earned',
    v_reward_amount,
    'Referral bonus: Invited ' || (SELECT full_name FROM profiles WHERE user_id = p_referred_user_id),
    'invite',
    'completed'
  );

  -- NEW: Also credit the REFERRED USER with a welcome bonus
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + v_reward_amount,
      updated_at = now()
  WHERE user_id = p_referred_user_id;

  -- Auto-lock referee's welcome bonus in 360LOCK  
  SELECT public.auto_lock_earned_nctr(
    p_referred_user_id,
    v_reward_amount,
    'invite',
    'invite'
  ) INTO v_referee_lock_id;

  -- Record referee welcome bonus transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    p_referred_user_id,
    'earned',
    v_reward_amount,
    'Welcome bonus: Referred by ' || (SELECT full_name FROM profiles WHERE user_id = v_referral.referrer_user_id),
    'invite',
    'completed'
  );

  -- Mark referral as credited
  UPDATE public.referrals
  SET reward_credited = true,
      rewarded_at = now()
  WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_user_id', v_referral.referrer_user_id,
    'referred_user_id', p_referred_user_id,
    'reward_amount', v_reward_amount,
    'referrer_lock_id', v_referrer_lock_id,
    'referee_lock_id', v_referee_lock_id
  );
END;
$$;

-- Now process any existing completed referrals that haven't been fully credited
-- This will credit the referred users (Lee Rosen, etc.) with their welcome bonuses
DO $$
DECLARE
  v_result jsonb;
  v_user record;
BEGIN
  -- Find all users who were referred and completed their profiles but haven't received their welcome bonus
  FOR v_user IN
    SELECT DISTINCT
      r.referred_user_id,
      p.full_name
    FROM referrals r
    JOIN profiles p ON r.referred_user_id = p.user_id
    WHERE r.status = 'completed'
    AND r.reward_credited = true  -- These were already marked as credited (referrer got paid)
    AND p.full_name IS NOT NULL
    AND p.email IS NOT NULL
    -- But check if the referred user has already received their welcome bonus
    AND NOT EXISTS (
      SELECT 1 FROM nctr_transactions
      WHERE user_id = r.referred_user_id
      AND earning_source = 'invite'
      AND description LIKE 'Welcome bonus:%'
    )
  LOOP
    BEGIN
      -- Get referral details
      DECLARE
        v_referral RECORD;
        v_reward_amount numeric := 500;
        v_referee_lock_id uuid;
      BEGIN
        SELECT * INTO v_referral
        FROM referrals
        WHERE referred_user_id = v_user.referred_user_id
        AND status = 'completed'
        LIMIT 1;

        -- Credit the referred user with welcome bonus
        UPDATE public.nctr_portfolio
        SET total_earned = total_earned + v_reward_amount,
            updated_at = now()
        WHERE user_id = v_user.referred_user_id;

        -- Auto-lock in 360LOCK
        SELECT public.auto_lock_earned_nctr(
          v_user.referred_user_id,
          v_reward_amount,
          'invite',
          'invite'
        ) INTO v_referee_lock_id;

        -- Record transaction
        INSERT INTO public.nctr_transactions (
          user_id,
          transaction_type,
          nctr_amount,
          description,
          earning_source,
          status
        ) VALUES (
          v_user.referred_user_id,
          'earned',
          v_reward_amount,
          'Welcome bonus: Referred by ' || (SELECT full_name FROM profiles WHERE user_id = v_referral.referrer_user_id),
          'invite',
          'completed'
        );

        RAISE NOTICE 'Credited welcome bonus to % (user_id: %)', 
          v_user.full_name, 
          v_user.referred_user_id;
      END;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error crediting welcome bonus to %: %', v_user.full_name, SQLERRM;
    END;
  END LOOP;
END $$;

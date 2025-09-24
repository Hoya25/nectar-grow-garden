-- Fix referral rewards: only referrer gets multiplier, referee always gets base amount
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referral_record RECORD;
  referrer_profile RECORD;
  referee_profile RECORD;
  base_referrer_reward NUMERIC := 1000.00; -- Base 1000 NCTR reward for referrer
  base_referee_reward NUMERIC := 1000.00;  -- Fixed 1000 NCTR reward for new user (no multiplier)
  final_referrer_reward NUMERIC;
  final_referee_reward NUMERIC := 1000.00; -- New users always get exactly 1000 NCTR
  referrer_lock_id UUID;
  referee_lock_id UUID;
  referee_display_name TEXT;
  referrer_display_name TEXT;
BEGIN
  -- Get referral details
  SELECT * INTO referral_record
  FROM public.referrals
  WHERE id = p_referral_id AND status = 'completed' AND reward_credited = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral not found or already processed');
  END IF;
  
  -- Get referrer profile info
  SELECT full_name, username, email INTO referrer_profile
  FROM public.profiles
  WHERE user_id = referral_record.referrer_user_id;
  
  -- Get referee profile info  
  SELECT full_name, username, email INTO referee_profile
  FROM public.profiles
  WHERE user_id = referral_record.referred_user_id;
  
  -- Apply reward multiplier ONLY to referrer (Wings member)
  SELECT public.apply_reward_multiplier(referral_record.referrer_user_id, base_referrer_reward) INTO final_referrer_reward;
  
  -- Determine display names
  referee_display_name := COALESCE(
    NULLIF(referee_profile.full_name, ''),
    NULLIF(referee_profile.username, ''),
    SPLIT_PART(referee_profile.email, '@', 1)
  );
  
  referrer_display_name := COALESCE(
    NULLIF(referrer_profile.full_name, ''),
    NULLIF(referrer_profile.username, ''),
    SPLIT_PART(referrer_profile.email, '@', 1)
  );
  
  -- Update total_earned for referrer with multiplied amount
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + final_referrer_reward,
      updated_at = now()
  WHERE user_id = referral_record.referrer_user_id;
  
  -- Update total_earned for referee with base amount (no multiplier)
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + final_referee_reward,
      updated_at = now()
  WHERE user_id = referral_record.referred_user_id;
  
  -- Auto-lock referrer's reward in 360LOCK (using base amount since auto_lock applies multiplier)
  SELECT public.auto_lock_earned_nctr(
    referral_record.referrer_user_id,
    base_referrer_reward, -- Pass base amount, auto_lock will apply multiplier
    'referral',
    'invite'
  ) INTO referrer_lock_id;
  
  -- Auto-lock referee's reward in 360LOCK (using base amount, no multiplier applied)
  INSERT INTO public.nctr_locks (
    user_id,
    nctr_amount,
    lock_type,
    lock_category,
    commitment_days,
    unlock_date,
    can_upgrade,
    original_lock_type
  ) VALUES (
    referral_record.referred_user_id,
    final_referee_reward, -- Always 1000 NCTR for new users
    '360LOCK',
    '360LOCK',
    360,
    now() + '360 days'::interval,
    false,
    '360LOCK'
  ) RETURNING id INTO referee_lock_id;
  
  -- Record referrer transaction with multiplied amount
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    referral_record.referrer_user_id,
    'earned',
    final_referrer_reward,
    'Referral reward: ' || referee_display_name || ' joined The Garden! (' || final_referrer_reward || ' NCTR with ' || (final_referrer_reward / base_referrer_reward) || 'x Wings multiplier in 360LOCK)',
    'referral',
    'completed'
  );
  
  -- Record referee transaction with base amount (no multiplier)
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    referral_record.referred_user_id,
    'earned',
    final_referee_reward,
    'Welcome bonus: Invited by ' || referrer_display_name || ' (1000 NCTR welcome bonus in 360LOCK)',
    'referral_signup',
    'completed'
  );
  
  -- Mark referral as rewarded
  UPDATE public.referrals
  SET reward_credited = true,
      rewarded_at = now()
  WHERE id = p_referral_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'base_referrer_reward', base_referrer_reward,
    'final_referrer_reward', final_referrer_reward,
    'base_referee_reward', base_referee_reward, 
    'final_referee_reward', final_referee_reward,
    'referrer_multiplier', (final_referrer_reward / base_referrer_reward),
    'referee_multiplier', 1.0,
    'referrer_lock_id', referrer_lock_id,
    'referee_lock_id', referee_lock_id,
    'referee_name', referee_display_name,
    'referrer_name', referrer_display_name
  );
END;
$function$;
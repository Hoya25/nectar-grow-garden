-- Manually create referral record for bellanderson@gmail.com and credit rewards
DO $$
DECLARE
  new_referral_id UUID;
  referrer_id UUID := 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff';
  referred_id UUID := 'af2991cd-ab54-4bf4-b1c2-450762df0110';
  referrer_reward NUMERIC := 50.00;
  referee_reward NUMERIC := 50.00;
  referrer_lock_id UUID;
  referee_lock_id UUID;
BEGIN
  -- Create the referral record
  INSERT INTO public.referrals (
    referrer_user_id,
    referred_user_id,
    referral_code,
    status,
    reward_credited,
    rewarded_at
  ) VALUES (
    referrer_id,
    referred_id,
    'FB8C3F0C',
    'completed',
    true,
    now()
  ) RETURNING id INTO new_referral_id;
  
  -- Credit referrer with 50 NCTR
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr + referrer_reward,
      total_earned = total_earned + referrer_reward,
      updated_at = now()
  WHERE user_id = referrer_id;
  
  -- Credit referee with 50 NCTR  
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr + referee_reward,
      total_earned = total_earned + referee_reward,
      updated_at = now()
  WHERE user_id = referred_id;
  
  -- Auto-lock referrer's reward in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    referrer_id,
    referrer_reward,
    'referral',
    'invite'
  ) INTO referrer_lock_id;
  
  -- Auto-lock referee's reward in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    referred_id,
    referee_reward,
    'referral_signup',
    'invite'
  ) INTO referee_lock_id;
  
  -- Record referrer transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status,
    created_at
  ) VALUES (
    referrer_id,
    'earned',
    referrer_reward,
    'Referral reward for inviting bellanderson@gmail.com',
    'referral',
    'completed',
    '2025-09-22 22:14:24+00'  -- Match when they signed up
  );
  
  -- Record referee transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status,
    created_at
  ) VALUES (
    referred_id,
    'earned',
    referee_reward,
    'Welcome bonus for joining via referral',
    'referral_signup',
    'completed',
    '2025-09-22 22:14:24+00'  -- Match when they signed up
  );
  
  RAISE NOTICE 'Successfully credited referral rewards - Referral ID: %', new_referral_id;
END
$$;
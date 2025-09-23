-- Update referral reward amounts to 1000 NCTR
UPDATE public.earning_opportunities 
SET nctr_reward = 1000.00000000,
    description = 'Earn 1000 NCTR for each friend who joins The Garden using your referral link. Rewards are automatically locked in 360LOCK to boost your alliance status. Both you and your friend get rewards!',
    updated_at = now()
WHERE opportunity_type = 'invite' AND title = 'Invite Friends to The Garden';

-- Update existing referral processing function to use 1000 NCTR
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referral_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referral_record RECORD;
  referrer_reward NUMERIC := 1000.00; -- Updated to 1000 NCTR reward for referrer
  referee_reward NUMERIC := 1000.00;  -- Updated to 1000 NCTR reward for new user
  referrer_lock_id UUID;
  referee_lock_id UUID;
BEGIN
  -- Get referral details
  SELECT * INTO referral_record
  FROM public.referrals
  WHERE id = p_referral_id AND status = 'completed' AND reward_credited = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral not found or already processed');
  END IF;
  
  -- Credit referrer with 1000 NCTR in 360LOCK
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr + referrer_reward,
      total_earned = total_earned + referrer_reward,
      updated_at = now()
  WHERE user_id = referral_record.referrer_user_id;
  
  -- Credit referee with 1000 NCTR in 360LOCK  
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr + referee_reward,
      total_earned = total_earned + referee_reward,
      updated_at = now()
  WHERE user_id = referral_record.referred_user_id;
  
  -- Auto-lock referrer's reward in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    referral_record.referrer_user_id,
    referrer_reward,
    'referral',
    'invite'
  ) INTO referrer_lock_id;
  
  -- Auto-lock referee's reward in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    referral_record.referred_user_id,
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
    status
  ) VALUES (
    referral_record.referrer_user_id,
    'earned',
    referrer_reward,
    'Referral reward for inviting new user (1000 NCTR)',
    'referral',
    'completed'
  );
  
  -- Record referee transaction
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
    referee_reward,
    'Welcome bonus for joining via referral (1000 NCTR)',
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
    'referrer_reward', referrer_reward,
    'referee_reward', referee_reward,
    'referrer_lock_id', referrer_lock_id,
    'referee_lock_id', referee_lock_id
  );
END;
$$;
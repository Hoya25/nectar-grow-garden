
-- Function to process and credit completed referrals
CREATE OR REPLACE FUNCTION public.process_completed_referral(p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'referrer_lock_id', v_referrer_lock_id
  );
END;
$$;

-- Trigger function to auto-process referrals when profile is completed
CREATE OR REPLACE FUNCTION public.trigger_referral_reward_on_profile_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completion_data jsonb;
  v_referral_result jsonb;
BEGIN
  -- Check if profile is now complete
  SELECT public.calculate_profile_completion(NEW.user_id) INTO v_completion_data;
  
  -- If profile is complete, process any pending referrals
  IF (v_completion_data->>'is_complete')::boolean THEN
    SELECT public.process_completed_referral(NEW.user_id) INTO v_referral_result;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS auto_credit_referral_on_profile_complete ON public.profiles;
CREATE TRIGGER auto_credit_referral_on_profile_complete
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name 
    OR OLD.username IS DISTINCT FROM NEW.username 
    OR OLD.email IS DISTINCT FROM NEW.email
    OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
    OR OLD.wallet_address IS DISTINCT FROM NEW.wallet_address)
  EXECUTE FUNCTION public.trigger_referral_reward_on_profile_complete();

-- Update the invite opportunity with proper reward amount
UPDATE public.earning_opportunities
SET lock_360_nctr_reward = 500,
    reward_distribution_type = 'lock_360',
    updated_at = now()
WHERE opportunity_type = 'invite';

-- Manually process Lee Rosen's referral since it was completed but not credited
DO $$
DECLARE
  v_lee_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get Lee Rosen's user_id
  SELECT user_id INTO v_lee_user_id
  FROM profiles
  WHERE full_name ILIKE '%Lee%Rosen%'
  LIMIT 1;

  IF v_lee_user_id IS NOT NULL THEN
    -- Process the referral
    SELECT public.process_completed_referral(v_lee_user_id) INTO v_result;
    RAISE NOTICE 'Processed Lee Rosen referral: %', v_result;
  END IF;
END $$;

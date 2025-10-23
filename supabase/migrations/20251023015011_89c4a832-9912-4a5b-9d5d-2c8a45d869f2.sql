-- Update referral system to require first purchase before awarding bonuses
-- This prevents gaming the system with fake signups

-- Step 1: Update the process_completed_referral function to check for first purchase
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
  v_has_first_purchase boolean;
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

  -- NEW: Check if referred user has made their first purchase
  -- Look for any completed affiliate purchase transaction
  SELECT EXISTS(
    SELECT 1 FROM public.nctr_transactions
    WHERE user_id = p_referred_user_id
      AND transaction_type = 'earned'
      AND earning_source IN ('affiliate_purchase', 'shopping', 'loyalize')
      AND status = 'completed'
      AND purchase_amount > 0
  ) INTO v_has_first_purchase;

  -- If no first purchase yet, return pending status
  IF NOT v_has_first_purchase THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Waiting for first purchase confirmation',
      'status', 'pending_purchase'
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
    1000  -- Default fallback to match current system
  );

  IF v_reward_amount <= 0 THEN
    v_reward_amount := 1000;  -- Ensure minimum reward
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
    'Referral bonus: ' || (SELECT COALESCE(full_name, username, 'Friend') FROM profiles WHERE user_id = p_referred_user_id) || ' made their first purchase!',
    'invite',
    'completed'
  );

  -- Credit the REFERRED USER with a welcome bonus
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
    'Welcome bonus: First purchase completed! Referred by ' || (SELECT COALESCE(full_name, username, 'a friend') FROM profiles WHERE user_id = v_referral.referrer_user_id),
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
    'referee_lock_id', v_referee_lock_id,
    'message', 'Referral bonuses credited after first purchase confirmation'
  );
END;
$$;

-- Step 2: Create function to check and process referral rewards after purchases
CREATE OR REPLACE FUNCTION public.check_referral_reward_after_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_referral_result jsonb;
  v_has_previous_purchase boolean;
BEGIN
  -- Only process for affiliate/shopping purchases
  IF NEW.earning_source NOT IN ('affiliate_purchase', 'shopping', 'loyalize') THEN
    RETURN NEW;
  END IF;

  -- Only process if this is a completed transaction with a purchase amount
  IF NEW.status != 'completed' OR NEW.purchase_amount IS NULL OR NEW.purchase_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Check if this is the user's FIRST purchase
  SELECT EXISTS(
    SELECT 1 FROM public.nctr_transactions
    WHERE user_id = NEW.user_id
      AND transaction_type = 'earned'
      AND earning_source IN ('affiliate_purchase', 'shopping', 'loyalize')
      AND status = 'completed'
      AND purchase_amount > 0
      AND id != NEW.id  -- Exclude the current transaction
  ) INTO v_has_previous_purchase;

  -- If this is the first purchase, try to process referral rewards
  IF NOT v_has_previous_purchase THEN
    RAISE NOTICE '🎉 First purchase detected for user %! Processing referral rewards...', NEW.user_id;
    
    SELECT public.process_completed_referral(NEW.user_id) INTO v_referral_result;
    
    IF (v_referral_result->>'success')::boolean THEN
      RAISE NOTICE '✅ Referral bonuses credited: %', v_referral_result;
    ELSE
      RAISE NOTICE 'ℹ️ No referral bonus to credit: %', v_referral_result->>'message';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Create trigger to auto-process referral rewards after first purchase
DROP TRIGGER IF EXISTS process_referral_after_first_purchase ON public.nctr_transactions;
CREATE TRIGGER process_referral_after_first_purchase
  AFTER INSERT ON public.nctr_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_referral_reward_after_purchase();

-- Step 4: Update the invite opportunity description to reflect new requirement
UPDATE public.earning_opportunities
SET description = 'Invite friends to The Garden! Both you and your friend earn 1000 NCTR in 360LOCK after they complete their profile AND make their first purchase. This ensures genuine participation and prevents abuse.',
    updated_at = now()
WHERE opportunity_type = 'invite';
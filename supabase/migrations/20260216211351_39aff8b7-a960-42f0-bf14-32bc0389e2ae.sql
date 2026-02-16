
CREATE OR REPLACE FUNCTION public.process_completed_referral(p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral RECORD;
  v_invite_opportunity RECORD;
  v_referrer_lock_id uuid;
  v_referee_lock_id uuid;
  v_reward_amount numeric;
  v_has_first_purchase boolean;
BEGIN
  -- Get the referral record (use correct column name: referred_id)
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = p_referred_user_id
    AND is_paid = false
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No uncredited referral found for this user'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.nctr_transactions
    WHERE user_id = p_referred_user_id
      AND transaction_type = 'earned'
      AND earning_source IN ('affiliate_purchase', 'shopping', 'loyalize')
      AND status = 'completed'
      AND purchase_amount > 0
  ) INTO v_has_first_purchase;

  IF NOT v_has_first_purchase THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Waiting for first purchase confirmation',
      'status', 'pending_purchase'
    );
  END IF;

  SELECT * INTO v_invite_opportunity
  FROM public.earning_opportunities
  WHERE opportunity_type = 'invite' AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active invite opportunity configured');
  END IF;

  v_reward_amount := COALESCE(
    v_invite_opportunity.lock_360_nctr_reward,
    v_invite_opportunity.lock_90_nctr_reward,
    v_invite_opportunity.available_nctr_reward,
    1000
  );
  IF v_reward_amount <= 0 THEN v_reward_amount := 1000; END IF;

  -- Credit the REFERRER (use correct column: referrer_id)
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + v_reward_amount, updated_at = now()
  WHERE user_id = v_referral.referrer_id;

  SELECT public.auto_lock_earned_nctr(v_referral.referrer_id, v_reward_amount, 'invite', 'invite') INTO v_referrer_lock_id;

  INSERT INTO public.nctr_transactions (user_id, transaction_type, nctr_amount, description, earning_source, status)
  VALUES (v_referral.referrer_id, 'earned', v_reward_amount,
    'Referral bonus: ' || (SELECT COALESCE(full_name, username, 'Friend') FROM profiles WHERE user_id = p_referred_user_id) || ' made their first purchase!',
    'invite', 'completed');

  -- Credit the REFERRED USER
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + v_reward_amount, updated_at = now()
  WHERE user_id = p_referred_user_id;

  SELECT public.auto_lock_earned_nctr(p_referred_user_id, v_reward_amount, 'invite', 'invite') INTO v_referee_lock_id;

  INSERT INTO public.nctr_transactions (user_id, transaction_type, nctr_amount, description, earning_source, status)
  VALUES (p_referred_user_id, 'earned', v_reward_amount,
    'Welcome bonus: First purchase completed! Referred by ' || (SELECT COALESCE(full_name, username, 'a friend') FROM profiles WHERE user_id = v_referral.referrer_id),
    'invite', 'completed');

  -- Mark referral as paid (use correct column: is_paid)
  UPDATE public.referrals SET is_paid = true WHERE id = v_referral.id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_user_id', v_referral.referrer_id,
    'referred_user_id', p_referred_user_id,
    'reward_amount', v_reward_amount,
    'referrer_lock_id', v_referrer_lock_id,
    'referee_lock_id', v_referee_lock_id,
    'message', 'Referral bonuses credited after first purchase confirmation'
  );
END;
$function$;

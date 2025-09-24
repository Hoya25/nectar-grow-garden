-- Update process_daily_checkin function to remove all legacy and hardcoded amounts
-- Only use admin-specified amounts from earning_opportunities table

CREATE OR REPLACE FUNCTION public.process_daily_checkin(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  daily_opportunity RECORD;
  total_reward NUMERIC := 0;
  multiplied_amount NUMERIC;
  available_reward NUMERIC := 0;
  lock_90_reward NUMERIC := 0;
  lock_360_reward NUMERIC := 0;
  lock_id UUID;
BEGIN
  -- Check if daily checkin is available
  IF NOT public.is_daily_checkin_available(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily checkin already claimed today. Come back tomorrow!'
    );  
  END IF;
  
  -- Get the daily check-in opportunity configuration
  SELECT 
    available_nctr_reward,
    lock_90_nctr_reward,
    lock_360_nctr_reward,
    reward_distribution_type
  INTO daily_opportunity
  FROM public.earning_opportunities 
  WHERE opportunity_type = 'daily_checkin' 
    AND is_active = true
  LIMIT 1;

  -- If no daily check-in opportunity is configured, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily check-in is not currently available. Please contact support.'
    );
  END IF;

  -- Calculate rewards based ONLY on admin configuration
  -- Remove ALL legacy/hardcoded amounts
  IF daily_opportunity.reward_distribution_type = 'available' THEN
    available_reward := COALESCE(daily_opportunity.available_nctr_reward, 0);
  ELSIF daily_opportunity.reward_distribution_type = 'lock_90' THEN
    lock_90_reward := COALESCE(daily_opportunity.lock_90_nctr_reward, 0);
  ELSIF daily_opportunity.reward_distribution_type = 'lock_360' THEN
    lock_360_reward := COALESCE(daily_opportunity.lock_360_nctr_reward, 0);
  ELSIF daily_opportunity.reward_distribution_type = 'combined' THEN
    available_reward := COALESCE(daily_opportunity.available_nctr_reward, 0);
    lock_90_reward := COALESCE(daily_opportunity.lock_90_nctr_reward, 0);
    lock_360_reward := COALESCE(daily_opportunity.lock_360_nctr_reward, 0);
  ELSE
    -- If distribution type is not set or invalid, return error
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily check-in reward distribution is not configured. Please contact admin.'
    );
  END IF;

  -- Calculate total reward
  total_reward := available_reward + lock_90_reward + lock_360_reward;

  -- If no reward configured, return error
  IF total_reward <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily check-in reward amounts are not configured. Please contact admin.'
    );
  END IF;

  -- Apply reward multiplier to each component separately
  IF available_reward > 0 THEN
    multiplied_amount := public.apply_reward_multiplier(p_user_id, available_reward);
    
    -- Add to available balance
    UPDATE public.nctr_portfolio
    SET available_nctr = available_nctr + multiplied_amount,
        total_earned = total_earned + multiplied_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO public.nctr_transactions (
      user_id,
      transaction_type,
      nctr_amount,
      description,
      earning_source,
      status
    ) VALUES (
      p_user_id,
      'earned',
      multiplied_amount,
      'Daily check-in bonus (available in wallet)',
      'daily_checkin',
      'completed'
    );
  END IF;

  -- Handle 90LOCK rewards
  IF lock_90_reward > 0 THEN
    SELECT public.auto_lock_earned_nctr(
      p_user_id,
      lock_90_reward,
      'daily_checkin',
      'bonus'
    ) INTO lock_id;
    
    -- Update total earned
    UPDATE public.nctr_portfolio
    SET total_earned = total_earned + public.apply_reward_multiplier(p_user_id, lock_90_reward),
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO public.nctr_transactions (
      user_id,
      transaction_type,
      nctr_amount,
      description,
      earning_source,
      status
    ) VALUES (
      p_user_id,
      'earned',
      public.apply_reward_multiplier(p_user_id, lock_90_reward),
      'Daily check-in bonus (90LOCK)',
      'daily_checkin',
      'completed'
    );
  END IF;

  -- Handle 360LOCK rewards
  IF lock_360_reward > 0 THEN
    SELECT public.auto_lock_earned_nctr(
      p_user_id,
      lock_360_reward,
      'daily_checkin',
      'bonus'
    ) INTO lock_id;
    
    -- Update total earned
    UPDATE public.nctr_portfolio
    SET total_earned = total_earned + public.apply_reward_multiplier(p_user_id, lock_360_reward),
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO public.nctr_transactions (
      user_id,
      transaction_type,
      nctr_amount,
      description,
      earning_source,
      status
    ) VALUES (
      p_user_id,
      'earned',
      public.apply_reward_multiplier(p_user_id, lock_360_reward),
      'Daily check-in bonus (360LOCK)',
      'daily_checkin',
      'completed'
    );
  END IF;

  -- Calculate final multiplied total for response
  multiplied_amount := public.apply_reward_multiplier(p_user_id, total_reward);
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_amount', multiplied_amount,
    'base_amount', total_reward,
    'multiplier', (multiplied_amount / total_reward),
    'distribution', jsonb_build_object(
      'available', available_reward,
      'lock_90', lock_90_reward,
      'lock_360', lock_360_reward
    ),
    'message', 'Daily check-in bonus earned! Come back tomorrow for more.'
  );
END;
$function$;
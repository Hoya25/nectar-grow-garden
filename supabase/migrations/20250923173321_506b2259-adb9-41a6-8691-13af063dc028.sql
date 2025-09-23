-- Create function to apply reward multipliers based on user status
CREATE OR REPLACE FUNCTION public.apply_reward_multiplier(p_user_id uuid, p_base_amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_status text;
  multiplier numeric := 1.0;
  final_amount numeric;
BEGIN
  -- Get user's current status
  SELECT opportunity_status INTO user_status
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;
  
  -- Get the reward multiplier for this status
  SELECT reward_multiplier INTO multiplier
  FROM public.opportunity_status_levels
  WHERE status_name = COALESCE(user_status, 'starter');
  
  -- Calculate final amount with multiplier
  final_amount := p_base_amount * COALESCE(multiplier, 1.0);
  
  RETURN final_amount;
END;
$function$;

-- Update the auto_lock_earned_nctr function to apply multipliers
CREATE OR REPLACE FUNCTION public.auto_lock_earned_nctr(p_user_id uuid, p_nctr_amount numeric, p_earning_source text, p_opportunity_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lock_type text := '90LOCK';
  lock_days integer := 90;
  new_lock_id uuid;
  multiplied_amount numeric;
BEGIN
  -- Apply reward multiplier based on user status
  multiplied_amount := public.apply_reward_multiplier(p_user_id, p_nctr_amount);
  
  -- Determine lock type based on earning source
  IF p_opportunity_type IN ('invite', 'bonus') OR p_earning_source IN ('invite', 'daily_checkin', 'referral') THEN
    lock_type := '360LOCK';
    lock_days := 360;
  ELSE
    lock_type := '90LOCK';
    lock_days := 90;
  END IF;

  -- Create the lock with multiplied amount
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
    p_user_id,
    multiplied_amount,
    lock_type,
    lock_type,
    lock_days,
    now() + (lock_days || ' days')::interval,
    (lock_type = '90LOCK'), -- Only 90LOCK can be upgraded
    lock_type
  ) RETURNING id INTO new_lock_id;

  RETURN new_lock_id;
END;
$function$;

-- Function to calculate and award NCTR with multipliers for affiliate purchases
CREATE OR REPLACE FUNCTION public.award_affiliate_nctr(p_user_id uuid, p_base_nctr_amount numeric, p_earning_source text DEFAULT 'affiliate_purchase')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  multiplied_amount numeric;
  lock_id uuid;
BEGIN
  -- Apply reward multiplier based on user status
  multiplied_amount := public.apply_reward_multiplier(p_user_id, p_base_nctr_amount);
  
  -- Update total_earned in portfolio with multiplied amount
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + multiplied_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Auto-lock the multiplied earnings in 90LOCK
  SELECT public.auto_lock_earned_nctr(
    p_user_id,
    p_base_nctr_amount, -- Pass base amount since auto_lock already applies multiplier
    p_earning_source,
    'shopping'
  ) INTO lock_id;
  
  -- Record the transaction with multiplied amount
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
    'NCTR earned from affiliate purchase (with ' || (multiplied_amount / p_base_nctr_amount) || 'x status multiplier)',
    p_earning_source,
    'completed'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'base_amount', p_base_nctr_amount,
    'multiplied_amount', multiplied_amount,
    'multiplier', (multiplied_amount / p_base_nctr_amount),
    'lock_id', lock_id
  );
END;
$function$;
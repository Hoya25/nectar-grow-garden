-- Update the profile completion bonus function to auto-lock in 360LOCK instead of adding to available
CREATE OR REPLACE FUNCTION public.award_profile_completion_bonus(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completion_data jsonb;
  bonus_amount numeric := 500.00; -- 500 NCTR bonus
  lock_id uuid;
BEGIN
  -- Check completion status
  SELECT public.calculate_profile_completion(p_user_id) INTO completion_data;
  
  -- Verify user is eligible for bonus
  IF NOT (completion_data->>'eligible_for_bonus')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not eligible for profile completion bonus',
      'completion_data', completion_data
    );
  END IF;
  
  -- Update ONLY total_earned in portfolio (not available_nctr - bonus goes to 360LOCK)
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + bonus_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Auto-lock the bonus in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    p_user_id,
    bonus_amount,
    'profile_completion',
    'bonus'
  ) INTO lock_id;
  
  -- Record the transaction
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
    bonus_amount,
    'Profile completion bonus (500 NCTR automatically locked in 360LOCK)',
    'profile_completion',
    'completed'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'bonus_amount', bonus_amount,
    'lock_id', lock_id,
    'completion_score', completion_data->>'completion_score',
    'message', 'Profile completion bonus awarded and locked in 360LOCK!'
  );
END;
$function$;
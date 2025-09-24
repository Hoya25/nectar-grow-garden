-- Now create the daily checkin opportunity and functions
INSERT INTO public.earning_opportunities (
  title,
  description,
  opportunity_type,
  nctr_reward,
  available_nctr_reward,
  lock_90_nctr_reward,
  lock_360_nctr_reward,
  is_active,
  featured,
  cta_text,
  partner_name,
  default_lock_type
) VALUES (
  'Daily Check-in Bonus',
  'Check in daily to earn your NCTR bonus! Available every 24 hours.',
  'daily_checkin',
  0,
  50,
  0,
  0,
  true,
  true,
  '✅ Claim Daily Bonus',
  'The Garden',
  '90LOCK'
) ON CONFLICT DO NOTHING;

-- Create a function to check if daily checkin is available for a user
CREATE OR REPLACE FUNCTION public.is_daily_checkin_available(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_checkin_date DATE;
  current_date_utc DATE;
BEGIN
  -- Get current UTC date
  current_date_utc := CURRENT_DATE;
  
  -- Get the last checkin date for this user
  SELECT DATE(created_at) INTO last_checkin_date
  FROM public.nctr_transactions
  WHERE user_id = p_user_id
    AND earning_source = 'daily_checkin'
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no previous checkin or last checkin was before today, it's available
  RETURN (last_checkin_date IS NULL OR last_checkin_date < current_date_utc);
END;
$function$;

-- Create function to process daily checkin
CREATE OR REPLACE FUNCTION public.process_daily_checkin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  checkin_reward NUMERIC := 50.00; -- 50 NCTR daily bonus
  multiplied_amount NUMERIC;
  lock_id UUID;
BEGIN
  -- Check if daily checkin is available
  IF NOT public.is_daily_checkin_available(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily checkin already claimed today. Come back tomorrow!'
    );  
  END IF;
  
  -- Apply reward multiplier based on user status
  multiplied_amount := public.apply_reward_multiplier(p_user_id, checkin_reward);
  
  -- Update available_nctr in portfolio (daily checkin goes to available balance)
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr + multiplied_amount,
      total_earned = total_earned + multiplied_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
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
    multiplied_amount,
    'Daily check-in bonus (available in wallet)',
    'daily_checkin',
    'completed'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_amount', multiplied_amount,
    'base_amount', checkin_reward,
    'multiplier', (multiplied_amount / checkin_reward),
    'message', 'Daily check-in bonus earned! Come back tomorrow for more.'
  );
END;
$function$;
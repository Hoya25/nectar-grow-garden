-- Fix available NCTR to correct amount (5 NCTR)
UPDATE public.nctr_portfolio 
SET available_nctr = 5.00,
    updated_at = now()
WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff';

-- Create function to commit available NCTR to 360LOCK
CREATE OR REPLACE FUNCTION public.commit_available_to_360lock(p_user_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_available NUMERIC;
  new_lock_id UUID;
BEGIN
  -- Check current available balance
  SELECT available_nctr INTO current_available
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;
  
  IF current_available IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Portfolio not found');
  END IF;
  
  IF p_amount > current_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient available NCTR');
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;
  
  -- Create 360LOCK commitment
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
    p_amount,
    '360LOCK',
    '360LOCK',
    360,
    now() + '360 days'::interval,
    false,
    '360LOCK'
  ) RETURNING id INTO new_lock_id;
  
  -- Deduct from available balance
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr - p_amount,
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
    'locked',
    p_amount,
    'Manual commitment of available NCTR to 360LOCK',
    'manual_commitment',
    'completed'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'lock_id', new_lock_id,
    'amount', p_amount,
    'lock_type', '360LOCK'
  );
END;
$function$;
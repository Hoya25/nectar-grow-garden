-- Update create_withdrawal_request function to remove withdrawal fee
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(p_nctr_amount numeric, p_wallet_address text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_available NUMERIC;
  min_withdrawal NUMERIC;
  max_withdrawal NUMERIC;
  daily_limit NUMERIC;
  gas_fee NUMERIC := 0.5; -- Fixed gas fee in NCTR
  net_amount NUMERIC;
  treasury_enabled BOOLEAN;
  today_withdrawn NUMERIC;
  new_request_id UUID;
BEGIN
  -- Get treasury configuration
  SELECT (setting_value->>0)::NUMERIC INTO min_withdrawal 
  FROM treasury_config WHERE setting_key = 'min_withdrawal_amount';
  
  SELECT (setting_value->>0)::NUMERIC INTO max_withdrawal 
  FROM treasury_config WHERE setting_key = 'max_withdrawal_amount';
  
  SELECT (setting_value->>0)::NUMERIC INTO daily_limit 
  FROM treasury_config WHERE setting_key = 'daily_withdrawal_limit';
  
  SELECT (setting_value->>0)::BOOLEAN INTO treasury_enabled 
  FROM treasury_config WHERE setting_key = 'treasury_enabled';

  -- Check if treasury is enabled
  IF NOT COALESCE(treasury_enabled, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Withdrawal system is currently disabled'
    );
  END IF;

  -- Validate withdrawal amount
  IF p_nctr_amount < COALESCE(min_withdrawal, 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Minimum withdrawal amount is ' || COALESCE(min_withdrawal, 1) || ' NCTR'
    );
  END IF;

  IF p_nctr_amount > COALESCE(max_withdrawal, 100000) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Maximum withdrawal amount is ' || COALESCE(max_withdrawal, 100000) || ' NCTR'
    );
  END IF;

  -- Check daily limit
  SELECT COALESCE(SUM(nctr_amount), 0) INTO today_withdrawn
  FROM withdrawal_requests 
  WHERE user_id = auth.uid() 
    AND status IN ('pending', 'processing', 'completed')
    AND DATE(created_at) = CURRENT_DATE;

  IF today_withdrawn + p_nctr_amount > COALESCE(daily_limit, 50000) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily withdrawal limit exceeded. Current limit: ' || COALESCE(daily_limit, 50000) || ' NCTR'
    );
  END IF;

  -- Check available balance
  SELECT available_nctr INTO current_available 
  FROM nctr_portfolio WHERE user_id = auth.uid();
  
  IF current_available IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Portfolio not found'
    );
  END IF;

  IF p_nctr_amount > current_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient available NCTR balance. Available: ' || current_available || ' NCTR'
    );
  END IF;

  -- Calculate net amount (amount - gas fee only, no withdrawal fee)
  net_amount := p_nctr_amount - gas_fee;

  IF net_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Withdrawal amount too small after gas fee'
    );
  END IF;

  -- Deduct from available balance immediately
  UPDATE nctr_portfolio 
  SET available_nctr = available_nctr - p_nctr_amount,
      updated_at = now()
  WHERE user_id = auth.uid();

  -- Create withdrawal request
  INSERT INTO withdrawal_requests (
    user_id,
    wallet_address,
    nctr_amount,
    gas_fee_nctr,
    net_amount_nctr,
    status
  ) VALUES (
    auth.uid(),
    p_wallet_address,
    p_nctr_amount,
    gas_fee,
    net_amount,
    'pending'
  ) RETURNING id INTO new_request_id;

  -- Record transaction
  INSERT INTO nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    auth.uid(),
    'withdrawal',
    -p_nctr_amount,
    'NCTR withdrawal request to ' || LEFT(p_wallet_address, 10) || '...',
    'withdrawal',
    'pending'
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', new_request_id,
    'net_amount', net_amount,
    'total_fees', gas_fee
  );
END;
$function$;
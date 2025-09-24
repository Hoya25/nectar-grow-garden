-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  nctr_amount NUMERIC(18,8) NOT NULL CHECK (nctr_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  request_hash TEXT UNIQUE,
  transaction_hash TEXT,
  gas_fee_nctr NUMERIC(18,8) DEFAULT 0,
  net_amount_nctr NUMERIC(18,8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (check_user_is_admin(auth.uid()));

CREATE POLICY "Admins can update withdrawal requests" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (check_user_is_admin(auth.uid()));

-- Create treasury configuration table
CREATE TABLE public.treasury_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for treasury config
ALTER TABLE public.treasury_config ENABLE ROW LEVEL SECURITY;

-- Only admins can access treasury config
CREATE POLICY "Only admins can access treasury config" 
ON public.treasury_config 
FOR ALL 
USING (check_user_is_admin(auth.uid()));

-- Insert default treasury configuration
INSERT INTO public.treasury_config (setting_key, setting_value, description) VALUES
('min_withdrawal_amount', '100', 'Minimum NCTR amount that can be withdrawn'),
('max_withdrawal_amount', '100000', 'Maximum NCTR amount that can be withdrawn per request'),
('daily_withdrawal_limit', '50000', 'Maximum NCTR that can be withdrawn per user per day'),
('withdrawal_fee_percentage', '0.02', 'Percentage fee for withdrawals (2%)'),
('treasury_enabled', 'true', 'Whether withdrawal system is enabled'),
('processing_delay_minutes', '30', 'Minimum delay before processing withdrawals');

-- Create function to process withdrawal request
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_nctr_amount NUMERIC,
  p_wallet_address TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_available NUMERIC;
  min_withdrawal NUMERIC;
  max_withdrawal NUMERIC;
  daily_limit NUMERIC;
  withdrawal_fee_pct NUMERIC;
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
  
  SELECT (setting_value->>0)::NUMERIC INTO withdrawal_fee_pct 
  FROM treasury_config WHERE setting_key = 'withdrawal_fee_percentage';
  
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
  IF p_nctr_amount < COALESCE(min_withdrawal, 100) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Minimum withdrawal amount is ' || COALESCE(min_withdrawal, 100) || ' NCTR'
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

  -- Calculate net amount (amount - fees)
  net_amount := p_nctr_amount - (p_nctr_amount * COALESCE(withdrawal_fee_pct, 0.02)) - gas_fee;

  IF net_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Withdrawal amount too small after fees'
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
    gas_fee + (p_nctr_amount * COALESCE(withdrawal_fee_pct, 0.02)),
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
    'total_fees', p_nctr_amount - net_amount
  );
END;
$$;
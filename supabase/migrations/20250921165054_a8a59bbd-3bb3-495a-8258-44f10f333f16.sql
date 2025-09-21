-- Fix security issues first

-- Enable RLS on the new table
ALTER TABLE public.opportunity_status_levels ENABLE ROW LEVEL SECURITY;

-- Create policy for opportunity status levels (public read)
CREATE POLICY "Anyone can view status levels" 
ON public.opportunity_status_levels 
FOR SELECT 
USING (true);

-- Create function to calculate user's opportunity status
CREATE OR REPLACE FUNCTION public.calculate_user_status(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  total_locked_nctr DECIMAL(18,8) := 0;
  min_lock_duration INTEGER := 0;
  calculated_status TEXT := 'starter';
BEGIN
  -- Calculate total locked NCTR and minimum lock duration
  SELECT 
    COALESCE(SUM(nctr_amount), 0),
    COALESCE(MIN(EXTRACT(DAYS FROM (unlock_date - lock_date))::INTEGER), 0)
  INTO total_locked_nctr, min_lock_duration
  FROM public.nctr_locks 
  WHERE nctr_locks.user_id = calculate_user_status.user_id 
    AND status = 'active';

  -- Determine status based on locked amount and duration
  SELECT status_name INTO calculated_status
  FROM public.opportunity_status_levels
  WHERE min_locked_nctr <= total_locked_nctr 
    AND min_lock_duration <= min_lock_duration
  ORDER BY min_locked_nctr DESC, min_lock_duration DESC
  LIMIT 1;

  RETURN COALESCE(calculated_status, 'starter');
END;
$$;

-- Create function to update user status and handle rewards
CREATE OR REPLACE FUNCTION public.update_user_status(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status TEXT;
  new_status TEXT;
  status_changed BOOLEAN := false;
  upgrade_reward DECIMAL(18,8) := 0;
  result JSONB;
BEGIN
  -- Get current status
  SELECT opportunity_status INTO old_status
  FROM public.nctr_portfolio
  WHERE nctr_portfolio.user_id = update_user_status.user_id;

  -- Calculate new status
  new_status := public.calculate_user_status(user_id);

  -- Check if status changed
  IF old_status != new_status THEN
    status_changed := true;
    
    -- Update portfolio with new status
    UPDATE public.nctr_portfolio
    SET opportunity_status = new_status,
        updated_at = now()
    WHERE nctr_portfolio.user_id = update_user_status.user_id;

    -- Calculate upgrade reward (bonus NCTR for status upgrade)
    CASE new_status
      WHEN 'advanced' THEN upgrade_reward := 25;
      WHEN 'premium' THEN upgrade_reward := 100; 
      WHEN 'vip' THEN upgrade_reward := 500;
      ELSE upgrade_reward := 0;
    END CASE;

    -- Award upgrade bonus if applicable
    IF upgrade_reward > 0 THEN
      -- Add bonus to portfolio
      UPDATE public.nctr_portfolio
      SET available_nctr = available_nctr + upgrade_reward,
          total_earned = total_earned + upgrade_reward
      WHERE nctr_portfolio.user_id = update_user_status.user_id;

      -- Record the transaction
      INSERT INTO public.nctr_transactions (
        user_id,
        transaction_type,
        nctr_amount,
        description,
        status
      ) VALUES (
        user_id,
        'earned',
        upgrade_reward,
        'Status upgrade bonus: ' || old_status || ' → ' || new_status,
        'completed'
      );
    END IF;
  END IF;

  -- Prepare result
  result := jsonb_build_object(
    'user_id', user_id,
    'old_status', old_status,
    'new_status', new_status,
    'status_changed', status_changed,
    'upgrade_reward', upgrade_reward
  );

  RETURN result;
END;
$$;
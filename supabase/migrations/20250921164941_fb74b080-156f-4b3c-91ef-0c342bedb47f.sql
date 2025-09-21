-- Create opportunity status levels and requirements
CREATE TABLE public.opportunity_status_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_name TEXT NOT NULL UNIQUE,
  min_locked_nctr DECIMAL(18,8) NOT NULL DEFAULT 0,
  min_lock_duration INTEGER NOT NULL DEFAULT 0, -- days
  reward_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.0,
  max_opportunities INTEGER DEFAULT NULL, -- NULL = unlimited
  description TEXT,
  benefits TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the status levels with requirements
INSERT INTO public.opportunity_status_levels 
(status_name, min_locked_nctr, min_lock_duration, reward_multiplier, description, benefits) 
VALUES 
(
  'starter', 
  0, 
  0, 
  1.0,
  'Welcome to The Garden! Start earning NCTR with basic opportunities.',
  ARRAY['Basic earning opportunities', 'Community access', 'Referral rewards']
),
(
  'advanced', 
  100, 
  90, 
  1.25,
  'Committed member with enhanced earning potential.',
  ARRAY['25% bonus rewards', 'Advanced brand partnerships', 'Priority customer support', 'Exclusive campaigns']
),
(
  'premium', 
  500, 
  180, 
  1.5,
  'Premium member with significant commitment to The Garden.',
  ARRAY['50% bonus rewards', 'Premium brand partnerships', 'Early access to new features', 'VIP support', 'Monthly bonus rewards']
),
(
  'vip', 
  2000, 
  360, 
  2.0,
  'VIP member with maximum earning potential and exclusive benefits.',
  ARRAY['100% bonus rewards', 'Exclusive VIP partnerships', 'Personal account manager', 'Alpha product access', 'Quarterly bonuses', 'Special event invitations']
);

-- Create function to calculate user's opportunity status
CREATE OR REPLACE FUNCTION public.calculate_user_status(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- Log the status change
    INSERT INTO public.nctr_transactions (
      user_id,
      transaction_type,
      nctr_amount,
      description,
      status
    ) VALUES (
      user_id,
      'bonus',
      0,
      'Status updated: ' || old_status || ' → ' || new_status,
      'completed'
    );
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

-- Create trigger function to auto-update status when locks change
CREATE OR REPLACE FUNCTION public.trigger_update_user_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update status for the affected user
  PERFORM public.update_user_status(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.user_id
      ELSE NEW.user_id
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on nctr_locks table
CREATE TRIGGER update_status_on_lock_change
  AFTER INSERT OR UPDATE OR DELETE ON public.nctr_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_user_status();

-- Add status requirements to earning opportunities
ALTER TABLE public.earning_opportunities 
ADD COLUMN IF NOT EXISTS min_status TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS max_per_status INTEGER DEFAULT NULL;

-- Update existing opportunities with status requirements
UPDATE public.earning_opportunities 
SET min_status = CASE 
  WHEN title LIKE '%VIP%' OR title LIKE '%Premium%' THEN 'premium'
  WHEN title LIKE '%Advanced%' OR title LIKE '%Exclusive%' THEN 'advanced'  
  ELSE 'starter'
END;

-- Create view for user status with details
CREATE OR REPLACE VIEW public.user_status_details AS
SELECT 
  p.user_id,
  p.opportunity_status,
  osl.description as status_description,
  osl.benefits as status_benefits,
  osl.reward_multiplier,
  osl.min_locked_nctr as required_locked_nctr,
  osl.min_lock_duration as required_lock_duration,
  COALESCE(locks.total_locked, 0) as current_locked_nctr,
  COALESCE(locks.min_duration, 0) as current_min_duration,
  -- Calculate progress to next level
  next_level.status_name as next_status,
  next_level.min_locked_nctr as next_required_locked,
  next_level.min_lock_duration as next_required_duration
FROM public.nctr_portfolio p
LEFT JOIN public.opportunity_status_levels osl 
  ON osl.status_name = p.opportunity_status
LEFT JOIN (
  SELECT 
    user_id,
    SUM(nctr_amount) as total_locked,
    MIN(EXTRACT(DAYS FROM (unlock_date - lock_date))::INTEGER) as min_duration
  FROM public.nctr_locks
  WHERE status = 'active'
  GROUP BY user_id
) locks ON locks.user_id = p.user_id
LEFT JOIN public.opportunity_status_levels next_level ON (
  next_level.min_locked_nctr > COALESCE(locks.total_locked, 0)
  OR next_level.min_lock_duration > COALESCE(locks.min_duration, 0)
)
ORDER BY p.user_id, next_level.min_locked_nctr ASC;
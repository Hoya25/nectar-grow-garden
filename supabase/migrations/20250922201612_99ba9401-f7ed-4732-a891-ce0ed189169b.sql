-- Standardize NCTR earning and locking system
-- Add default_lock_type to earning_opportunities to specify which lock type each opportunity should use

ALTER TABLE public.earning_opportunities 
ADD COLUMN default_lock_type text DEFAULT '90LOCK';

-- Update existing opportunities with correct lock types
UPDATE public.earning_opportunities 
SET default_lock_type = '360LOCK' 
WHERE opportunity_type IN ('invite', 'bonus');

UPDATE public.earning_opportunities 
SET default_lock_type = '90LOCK' 
WHERE opportunity_type IN ('shopping', 'partner');

-- Add upgrade capability to nctr_locks table
ALTER TABLE public.nctr_locks 
ADD COLUMN can_upgrade boolean DEFAULT true,
ADD COLUMN original_lock_type text DEFAULT '90LOCK',
ADD COLUMN upgraded_from_lock_id uuid DEFAULT NULL;

-- Update existing locks to reflect their original type
UPDATE public.nctr_locks 
SET original_lock_type = lock_category;

-- Add earning_source to nctr_transactions to track where NCTR came from
ALTER TABLE public.nctr_transactions 
ADD COLUMN earning_source text DEFAULT 'manual',
ADD COLUMN auto_lock_type text DEFAULT NULL;

-- Create function to automatically lock NCTR based on earning source
CREATE OR REPLACE FUNCTION public.auto_lock_earned_nctr(
  p_user_id uuid,
  p_nctr_amount numeric,
  p_earning_source text,
  p_opportunity_type text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  lock_type text := '90LOCK';
  lock_days integer := 90;
  new_lock_id uuid;
BEGIN
  -- Determine lock type based on earning source
  IF p_opportunity_type IN ('invite', 'bonus') OR p_earning_source IN ('invite', 'daily_checkin', 'referral') THEN
    lock_type := '360LOCK';
    lock_days := 360;
  ELSE
    lock_type := '90LOCK';
    lock_days := 90;
  END IF;

  -- Create the lock
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
    p_nctr_amount,
    lock_type,
    lock_type,
    lock_days,
    now() + (lock_days || ' days')::interval,
    (lock_type = '90LOCK'), -- Only 90LOCK can be upgraded
    lock_type
  ) RETURNING id INTO new_lock_id;

  RETURN new_lock_id;
END;
$$;

-- Create function to upgrade 90LOCK to 360LOCK
CREATE OR REPLACE FUNCTION public.upgrade_lock_to_360(p_lock_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_lock RECORD;
  new_lock_id uuid;
  result jsonb;
BEGIN
  -- Get the existing lock
  SELECT * INTO old_lock 
  FROM public.nctr_locks 
  WHERE id = p_lock_id 
    AND user_id = auth.uid() 
    AND status = 'active' 
    AND lock_category = '90LOCK'
    AND can_upgrade = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lock not found or cannot be upgraded'
    );
  END IF;

  -- Create new 360LOCK
  INSERT INTO public.nctr_locks (
    user_id,
    nctr_amount,
    lock_type,
    lock_category,
    commitment_days,
    unlock_date,
    can_upgrade,
    original_lock_type,
    upgraded_from_lock_id
  ) VALUES (
    old_lock.user_id,
    old_lock.nctr_amount,
    '360LOCK',
    '360LOCK',
    360,
    now() + '360 days'::interval,
    false,
    old_lock.original_lock_type,
    old_lock.id
  ) RETURNING id INTO new_lock_id;

  -- Deactivate old lock
  UPDATE public.nctr_locks 
  SET status = 'upgraded' 
  WHERE id = p_lock_id;

  -- Update portfolio balances
  PERFORM public.update_portfolio_lock_balances() FROM (SELECT old_lock.user_id) AS t;

  -- Log the transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source
  ) VALUES (
    old_lock.user_id,
    'lock_upgrade',
    old_lock.nctr_amount,
    'Upgraded 90LOCK to 360LOCK for enhanced status benefits',
    'lock_upgrade'
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_lock_id', p_lock_id,
    'new_lock_id', new_lock_id,
    'amount', old_lock.nctr_amount
  );
END;
$$;

-- Update earning opportunities descriptions to reflect new lock behavior
UPDATE public.earning_opportunities 
SET description = 'Earn NCTR for each friend who joins The Garden using your referral link. Rewards are automatically locked in 360LOCK to boost your alliance status. Both you and your friend get rewards!'
WHERE opportunity_type = 'invite';

UPDATE public.earning_opportunities 
SET description = 'Visit The Garden daily and earn bonus NCTR tokens automatically locked in 360LOCK. Streak rewards increase your daily bonus and alliance status!'
WHERE opportunity_type = 'bonus' AND title LIKE '%Daily%';

UPDATE public.earning_opportunities 
SET description = 'One-time bonus for completing your full profile with name, avatar, and preferences. Reward automatically locked in 360LOCK for maximum alliance status boost.'
WHERE opportunity_type = 'bonus' AND title LIKE '%Profile%';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_nctr_locks_can_upgrade ON public.nctr_locks(user_id, can_upgrade) WHERE can_upgrade = true AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_earning_source ON public.nctr_transactions(earning_source);

-- Add comments for documentation
COMMENT ON COLUMN public.earning_opportunities.default_lock_type IS 'Specifies whether NCTR from this opportunity goes to 90LOCK or 360LOCK by default';
COMMENT ON COLUMN public.nctr_locks.can_upgrade IS 'Whether this lock can be upgraded from 90LOCK to 360LOCK';
COMMENT ON COLUMN public.nctr_locks.original_lock_type IS 'The original lock type when first created';
COMMENT ON COLUMN public.nctr_locks.upgraded_from_lock_id IS 'References the original lock if this is an upgrade';
COMMENT ON FUNCTION public.auto_lock_earned_nctr(uuid, numeric, text, text) IS 'Automatically locks earned NCTR based on earning source: affiliate purchases -> 90LOCK, invites/bonuses -> 360LOCK';
COMMENT ON FUNCTION public.upgrade_lock_to_360(uuid) IS 'Upgrades a 90LOCK to 360LOCK for enhanced alliance status benefits';
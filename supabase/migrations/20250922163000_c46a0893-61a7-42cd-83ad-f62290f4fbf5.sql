-- Update NCTR locks system to incorporate 90LOCK and 360LOCK branding
-- Add new columns to track lock types and update existing data

-- First, add new columns to nctr_locks table
ALTER TABLE public.nctr_locks 
ADD COLUMN IF NOT EXISTS lock_category TEXT DEFAULT '90LOCK',
ADD COLUMN IF NOT EXISTS commitment_days INTEGER DEFAULT 90;

-- Update existing locks to use new system
UPDATE public.nctr_locks 
SET lock_category = CASE 
  WHEN EXTRACT(days FROM (unlock_date - lock_date)) >= 360 THEN '360LOCK'
  WHEN EXTRACT(days FROM (unlock_date - lock_date)) >= 90 THEN '90LOCK'
  ELSE '90LOCK'
END,
commitment_days = EXTRACT(days FROM (unlock_date - lock_date))::INTEGER
WHERE lock_category IS NULL OR commitment_days IS NULL;

-- Update nctr_portfolio to track 90LOCK and 360LOCK separately
ALTER TABLE public.nctr_portfolio 
ADD COLUMN IF NOT EXISTS lock_90_nctr NUMERIC(18,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lock_360_nctr NUMERIC(18,8) DEFAULT 0;

-- Create function to calculate lock balances
CREATE OR REPLACE FUNCTION public.calculate_lock_balances(user_id uuid)
RETURNS TABLE(lock_90_total numeric, lock_360_total numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN lock_category = '90LOCK' THEN nctr_amount ELSE 0 END), 0) as lock_90_total,
    COALESCE(SUM(CASE WHEN lock_category = '360LOCK' THEN nctr_amount ELSE 0 END), 0) as lock_360_total
  FROM public.nctr_locks 
  WHERE nctr_locks.user_id = calculate_lock_balances.user_id 
    AND status = 'active';
END;
$$;

-- Update portfolio with calculated balances
UPDATE public.nctr_portfolio 
SET 
  lock_90_nctr = COALESCE((SELECT lock_90_total FROM public.calculate_lock_balances(nctr_portfolio.user_id)), 0),
  lock_360_nctr = COALESCE((SELECT lock_360_total FROM public.calculate_lock_balances(nctr_portfolio.user_id)), 0);

-- Update the user status calculation to be based on 360LOCK amounts
CREATE OR REPLACE FUNCTION public.calculate_user_status(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_360_lock_nctr DECIMAL(18,8) := 0;
  calculated_status TEXT := 'starter';
BEGIN
  -- Calculate total 360LOCK NCTR amount
  SELECT COALESCE(SUM(nctr_amount), 0)
  INTO total_360_lock_nctr
  FROM public.nctr_locks 
  WHERE nctr_locks.user_id = calculate_user_status.user_id 
    AND status = 'active'
    AND lock_category = '360LOCK';

  -- Determine status based on 360LOCK amount only
  SELECT status_name INTO calculated_status
  FROM public.opportunity_status_levels
  WHERE min_locked_nctr <= total_360_lock_nctr 
    AND min_lock_duration <= 360
  ORDER BY min_locked_nctr DESC
  LIMIT 1;

  RETURN COALESCE(calculated_status, 'starter');
END;
$$;

-- Update status levels to reflect 360LOCK requirements
UPDATE public.opportunity_status_levels 
SET 
  description = CASE status_name
    WHEN 'starter' THEN 'Entry level with basic earning opportunities. Upgrade to 360LOCK for enhanced benefits.'
    WHEN 'advanced' THEN 'Enhanced earning opportunities with 360LOCK commitment. 25% bonus rewards on all activities.'
    WHEN 'premium' THEN 'Premium tier with significant 360LOCK investment. 100% bonus rewards and exclusive partnerships.'
    WHEN 'vip' THEN 'Elite status with maximum 360LOCK commitment. 500% bonus rewards, VIP experiences, and alpha access.'
    ELSE description
  END,
  benefits = CASE status_name
    WHEN 'starter' THEN ARRAY['Basic earning opportunities', 'Standard rewards', '90LOCK available', 'Community access']
    WHEN 'advanced' THEN ARRAY['25% bonus rewards', 'Advanced brand partnerships', 'Priority customer support', 'Exclusive campaigns', '360LOCK benefits']
    WHEN 'premium' THEN ARRAY['100% bonus rewards', 'Premium brand partnerships', 'Dedicated support', 'Early access features', 'Enhanced 360LOCK rewards']
    WHEN 'vip' THEN ARRAY['500% bonus rewards', 'Exclusive VIP partnerships', 'Personal account manager', 'Alpha product access', 'Maximum 360LOCK benefits', 'Special event invitations']
    ELSE benefits
  END;

-- Create trigger to update portfolio lock balances when locks change
CREATE OR REPLACE FUNCTION public.update_portfolio_lock_balances()
RETURNS TRIGGER AS $$
DECLARE
  affected_user_id uuid;
  lock_90_total numeric;
  lock_360_total numeric;
BEGIN
  -- Get the user_id from the affected row
  affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Calculate new balances
  SELECT * FROM public.calculate_lock_balances(affected_user_id) 
  INTO lock_90_total, lock_360_total;
  
  -- Update portfolio
  UPDATE public.nctr_portfolio 
  SET 
    lock_90_nctr = lock_90_total,
    lock_360_nctr = lock_360_total,
    updated_at = now()
  WHERE user_id = affected_user_id;
  
  -- Update user status based on new 360LOCK amount
  PERFORM public.update_user_status(affected_user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

-- Create trigger for lock balance updates
DROP TRIGGER IF EXISTS update_lock_balances_trigger ON public.nctr_locks;
CREATE TRIGGER update_lock_balances_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.nctr_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_portfolio_lock_balances();

-- Add default lock options
INSERT INTO public.site_settings (setting_key, setting_value, description) VALUES 
('default_lock_options', '{"90LOCK": {"days": 90, "name": "90LOCK - 90 Day Commitment", "description": "Standard commitment period for steady growth"}, "360LOCK": {"days": 360, "name": "360LOCK - 360 Day Commitment", "description": "Premium commitment for maximum Alliance status and rewards"}}', 'Default lock commitment options with 90LOCK and 360LOCK branding')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();
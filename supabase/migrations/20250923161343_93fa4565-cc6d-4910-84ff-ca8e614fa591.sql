-- Add new reward structure fields for different NCTR lock types to earning_opportunities table
ALTER TABLE public.earning_opportunities 
ADD COLUMN IF NOT EXISTS available_nctr_reward NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS lock_90_nctr_reward NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS lock_360_nctr_reward NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_distribution_type TEXT DEFAULT 'legacy',
ADD COLUMN IF NOT EXISTS reward_structure JSONB DEFAULT '{}';

-- Add constraint to ensure at least one reward type has a value
ALTER TABLE public.earning_opportunities 
ADD CONSTRAINT check_has_reward 
CHECK (
  nctr_reward > 0 OR 
  available_nctr_reward > 0 OR 
  lock_90_nctr_reward > 0 OR 
  lock_360_nctr_reward > 0 OR 
  reward_per_dollar > 0
);

-- Update existing opportunities to use the new structure
UPDATE public.earning_opportunities 
SET reward_distribution_type = 'legacy'
WHERE reward_distribution_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.earning_opportunities.available_nctr_reward IS 'Amount of NCTR awarded as immediately available balance';
COMMENT ON COLUMN public.earning_opportunities.lock_90_nctr_reward IS 'Amount of NCTR awarded as 90-day locked balance';
COMMENT ON COLUMN public.earning_opportunities.lock_360_nctr_reward IS 'Amount of NCTR awarded as 360-day locked balance';
COMMENT ON COLUMN public.earning_opportunities.reward_distribution_type IS 'Type of reward distribution: legacy, available, lock_90, lock_360, or combined';
COMMENT ON COLUMN public.earning_opportunities.reward_structure IS 'JSON structure defining complex reward distributions';
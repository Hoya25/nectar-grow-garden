-- Drop the existing check constraint that requires rewards
ALTER TABLE public.earning_opportunities DROP CONSTRAINT check_has_reward;

-- Create a more flexible constraint that allows social opportunities to have no rewards
-- but still ensures other opportunity types have some reward
ALTER TABLE public.earning_opportunities ADD CONSTRAINT check_has_reward_or_social
CHECK (
  opportunity_type = 'social_follow' OR 
  nctr_reward > 0 OR 
  available_nctr_reward > 0 OR 
  lock_90_nctr_reward > 0 OR 
  lock_360_nctr_reward > 0 OR 
  reward_per_dollar > 0
);

-- Now clear all legacy NCTR allocations from social follow opportunities
UPDATE public.earning_opportunities 
SET 
  nctr_reward = 0,
  available_nctr_reward = 0,
  lock_90_nctr_reward = 0,
  lock_360_nctr_reward = 0,
  reward_per_dollar = 0,
  updated_at = now()
WHERE social_platform IN ('instagram', 'substack') 
  AND opportunity_type = 'social_follow';
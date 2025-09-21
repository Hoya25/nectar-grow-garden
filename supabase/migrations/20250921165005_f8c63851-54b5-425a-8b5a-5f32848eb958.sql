-- Create opportunity status levels and requirements (if not exists)
CREATE TABLE IF NOT EXISTS public.opportunity_status_levels (
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

-- Insert the status levels with requirements (only if table is empty)
INSERT INTO public.opportunity_status_levels 
(status_name, min_locked_nctr, min_lock_duration, reward_multiplier, description, benefits) 
SELECT 
  'starter', 0, 0, 1.0,
  'Welcome to The Garden! Start earning NCTR with basic opportunities.',
  ARRAY['Basic earning opportunities', 'Community access', 'Referral rewards']
WHERE NOT EXISTS (SELECT 1 FROM public.opportunity_status_levels WHERE status_name = 'starter');

INSERT INTO public.opportunity_status_levels 
(status_name, min_locked_nctr, min_lock_duration, reward_multiplier, description, benefits) 
SELECT 
  'advanced', 100, 90, 1.25,
  'Committed member with enhanced earning potential.',
  ARRAY['25% bonus rewards', 'Advanced brand partnerships', 'Priority customer support', 'Exclusive campaigns']
WHERE NOT EXISTS (SELECT 1 FROM public.opportunity_status_levels WHERE status_name = 'advanced');

INSERT INTO public.opportunity_status_levels 
(status_name, min_locked_nctr, min_lock_duration, reward_multiplier, description, benefits) 
SELECT 
  'premium', 500, 180, 1.5,
  'Premium member with significant commitment to The Garden.',
  ARRAY['50% bonus rewards', 'Premium brand partnerships', 'Early access to new features', 'VIP support', 'Monthly bonus rewards']
WHERE NOT EXISTS (SELECT 1 FROM public.opportunity_status_levels WHERE status_name = 'premium');

INSERT INTO public.opportunity_status_levels 
(status_name, min_locked_nctr, min_lock_duration, reward_multiplier, description, benefits) 
SELECT 
  'vip', 2000, 360, 2.0,
  'VIP member with maximum earning potential and exclusive benefits.',
  ARRAY['100% bonus rewards', 'Exclusive VIP partnerships', 'Personal account manager', 'Alpha product access', 'Quarterly bonuses', 'Special event invitations']
WHERE NOT EXISTS (SELECT 1 FROM public.opportunity_status_levels WHERE status_name = 'vip');
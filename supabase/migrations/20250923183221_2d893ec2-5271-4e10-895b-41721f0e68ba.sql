-- Update the check constraint to include social_follow opportunity type
ALTER TABLE public.earning_opportunities 
DROP CONSTRAINT IF EXISTS earning_opportunities_opportunity_type_check;

ALTER TABLE public.earning_opportunities 
ADD CONSTRAINT earning_opportunities_opportunity_type_check 
CHECK (opportunity_type IN ('shopping', 'invite', 'partner', 'bonus', 'social_follow'));
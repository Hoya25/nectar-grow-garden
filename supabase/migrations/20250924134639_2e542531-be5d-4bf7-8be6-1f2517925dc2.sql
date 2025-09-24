-- First, let's see what opportunity types are currently allowed
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname LIKE '%opportunity_type%';

-- Add 'daily_checkin' to the allowed opportunity types
ALTER TABLE public.earning_opportunities 
DROP CONSTRAINT IF EXISTS earning_opportunities_opportunity_type_check;

ALTER TABLE public.earning_opportunities 
ADD CONSTRAINT earning_opportunities_opportunity_type_check 
CHECK (opportunity_type IN ('invite', 'bonus', 'social_follow', 'shopping', 'partner', 'daily_checkin'));
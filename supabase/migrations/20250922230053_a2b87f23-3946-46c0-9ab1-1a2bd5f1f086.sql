-- Update brands table numeric fields to support values up to 100 and beyond
-- Change from NUMERIC(6,4) to NUMERIC(10,4) to allow much larger values

ALTER TABLE public.brands 
ALTER COLUMN commission_rate TYPE NUMERIC(10,4);

ALTER TABLE public.brands 
ALTER COLUMN nctr_per_dollar TYPE NUMERIC(10,4);

-- Update any other tables that might have similar constraints
-- Check earning_opportunities table as well
ALTER TABLE public.earning_opportunities
ALTER COLUMN nctr_reward TYPE NUMERIC(18,8); -- Already large enough

ALTER TABLE public.earning_opportunities
ALTER COLUMN reward_per_dollar TYPE NUMERIC(10,4); -- Increase from default if needed

-- Update partner_campaigns table for consistency
ALTER TABLE public.partner_campaigns
ALTER COLUMN bonus_multiplier TYPE NUMERIC(10,4);

-- Add comment for documentation
COMMENT ON COLUMN public.brands.commission_rate IS 'Commission rate as decimal (e.g., 0.05 = 5%). Max value 999,999.9999';
COMMENT ON COLUMN public.brands.nctr_per_dollar IS 'NCTR tokens earned per dollar spent. Max value 999,999.9999';
COMMENT ON COLUMN public.earning_opportunities.reward_per_dollar IS 'Reward rate per dollar. Max value 999,999.9999';
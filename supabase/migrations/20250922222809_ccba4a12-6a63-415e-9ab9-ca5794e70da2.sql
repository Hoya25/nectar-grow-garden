-- Increase precision for reward_per_dollar to allow values up to 9999.9999
ALTER TABLE public.earning_opportunities 
ALTER COLUMN reward_per_dollar TYPE NUMERIC(8,4);
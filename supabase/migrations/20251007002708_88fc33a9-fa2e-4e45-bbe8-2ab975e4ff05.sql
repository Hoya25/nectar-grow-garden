-- Update daily check-in to give only 1 NCTR to Available balance
UPDATE public.earning_opportunities 
SET available_nctr_reward = 1,
    updated_at = now()
WHERE opportunity_type = 'daily_checkin';
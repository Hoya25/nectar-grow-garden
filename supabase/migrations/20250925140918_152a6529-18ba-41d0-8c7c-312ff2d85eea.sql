-- Fix Airbnb/Travel and Earn lock rewards to match the updated reward_per_dollar
UPDATE earning_opportunities 
SET lock_90_nctr_reward = 25, 
    lock_360_nctr_reward = 25,
    updated_at = now()
WHERE title = 'Travel and Earn' AND partner_name = 'Travel and Earn';
-- First, check the current constraint
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'earning_opportunities'
  AND con.contype = 'c'
  AND con.conname LIKE '%type%';

-- Drop the old constraint and create a new one that includes 'free_trial'
ALTER TABLE earning_opportunities 
DROP CONSTRAINT IF EXISTS earning_opportunities_opportunity_type_check;

ALTER TABLE earning_opportunities
ADD CONSTRAINT earning_opportunities_opportunity_type_check 
CHECK (opportunity_type IN ('shopping', 'invite', 'social_follow', 'bonus', 'daily_checkin', 'partner', 'free_trial'));

-- Now update the Rad.Live opportunity
UPDATE earning_opportunities 
SET 
  opportunity_type = 'free_trial',
  reward_per_dollar = 0,
  updated_at = now()
WHERE title ILIKE '%rad%';

-- Verify the update
SELECT id, title, opportunity_type, reward_per_dollar, is_active 
FROM earning_opportunities 
WHERE title ILIKE '%rad%';
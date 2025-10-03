-- Deactivate the NoBull opportunity that cannot be deactivated from admin panel
UPDATE earning_opportunities 
SET is_active = false,
    updated_at = now()
WHERE id = '55f04026-98a9-4445-ba16-27bf52c2c11c'
AND partner_name = 'Nobull';

-- Verify the update
SELECT id, title, partner_name, is_active, updated_at
FROM earning_opportunities
WHERE id = '55f04026-98a9-4445-ba16-27bf52c2c11c';
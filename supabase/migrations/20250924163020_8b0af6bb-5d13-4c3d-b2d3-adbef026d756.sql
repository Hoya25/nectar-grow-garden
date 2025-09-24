-- Fix display_order values to be sequential
WITH numbered_opportunities AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY display_order ASC, created_at ASC) as new_order
  FROM earning_opportunities
  WHERE is_active = true
)
UPDATE earning_opportunities 
SET display_order = numbered_opportunities.new_order
FROM numbered_opportunities 
WHERE earning_opportunities.id = numbered_opportunities.id;
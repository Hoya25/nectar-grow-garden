-- Fix incorrect nctr_per_dollar rates for brands
-- These brands were incorrectly set to 100 NCTR per dollar
-- They should be 25 NCTR per dollar (matching the standard rate)

UPDATE brands 
SET nctr_per_dollar = 25.0, 
    updated_at = now()
WHERE id IN (
  'c8ca8781-7368-447c-8eba-0e5952abbd90', -- Fanatics
  'b1e507dd-3bc0-44c1-85e5-1c7e2f487617', -- Fanatics Gift Card
  '802eacf3-e8f9-427d-8ebe-53b4bae5cc1e'  -- Airbnb Gift Card
);

-- Verify the update
SELECT id, name, nctr_per_dollar, category 
FROM brands 
WHERE name ILIKE '%fanatics%' OR name ILIKE '%airbnb%'
ORDER BY name;
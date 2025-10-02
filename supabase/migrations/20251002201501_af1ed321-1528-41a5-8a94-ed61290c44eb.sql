-- Fix Uber Gift Card reward rate to match opportunity configuration
UPDATE brands 
SET nctr_per_dollar = 25.0
WHERE name = 'Uber Gift Card' OR name ILIKE '%uber%';
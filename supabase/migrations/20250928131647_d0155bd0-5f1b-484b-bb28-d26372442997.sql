-- Deactivate old/non-Loyalize Uber brands to avoid confusion
-- Keep only the Loyalize-integrated gift card brands active

UPDATE public.brands 
SET is_active = false 
WHERE name = 'Uber Gift Cards' 
  AND loyalize_id = 'uber-gift-cards-001';

-- Verify the correct Loyalize brands remain active
-- These should stay active:
-- - Uber Gift Card (loyalize_id: 44820)  
-- - Uber Eats Gift Card (loyalize_id: 44821)
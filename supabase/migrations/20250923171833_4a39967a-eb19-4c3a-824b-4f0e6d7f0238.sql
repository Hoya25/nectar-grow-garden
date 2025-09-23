-- Clean up duplicate Uber transactions and fix NCTR allocation

-- First, let's see what we have (for reference)
-- Two transactions: d2bf5647-8598-4821-988d-e13ba609c7dd and 6e275bb6-61c7-4f99-a3f8-8876620e7889
-- Both for 1,500 NCTR Uber purchases with incorrect lock allocation

-- Delete the duplicate (newer) transaction
DELETE FROM nctr_transactions 
WHERE id = 'd2bf5647-8598-4821-988d-e13ba609c7dd'
AND user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff'
AND earning_source = 'affiliate_purchase'
AND description = 'Purchase reward from Uber Gift Card (Order: UGC-1)';

-- Delete the duplicate (newer) locks created by the second webhook call
DELETE FROM nctr_locks 
WHERE id IN (
  '7e871127-6593-4e27-b693-ee3f464bf1d8', -- 250 NCTR 360LOCK from second call
  '7d5cd106-9287-496f-bef5-cf84df01a4f8'  -- 1,225 NCTR 90LOCK from second call
)
AND user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff';

-- Update the remaining locks to have correct allocation (375 to 90LOCK, 1,125 to 360LOCK)
-- Fix the 90LOCK amount (from 1,225 to 375)
UPDATE nctr_locks 
SET nctr_amount = 375.00
WHERE id = 'e5ceaa3d-299e-4846-a823-443b4a383e5f'
AND user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff'
AND lock_category = '90LOCK';

-- Fix the 360LOCK amount (from 250 to 1,125)
UPDATE nctr_locks 
SET nctr_amount = 1125.00
WHERE id = 'e7564d7b-9124-4f6c-a6b0-da7aa3361c15'
AND user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff'
AND lock_category = '360LOCK';

-- Recalculate portfolio totals
-- Current total_earned should be: 1000 (referrals) + 30 (daily checkins) + 1500 (uber) = 2530
-- Current 90LOCK total: 375 (corrected uber)
-- Current 360LOCK total: 950 + 50 + 5 + 25 + 1125 = 2155 (referrals + commitments + corrected uber)

UPDATE nctr_portfolio 
SET 
  total_earned = 2530.00,  -- Corrected total (removed duplicate 1500)
  lock_90_nctr = 375.00,   -- Corrected 90LOCK amount
  lock_360_nctr = 2155.00, -- Recalculated 360LOCK total
  updated_at = now()
WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff';
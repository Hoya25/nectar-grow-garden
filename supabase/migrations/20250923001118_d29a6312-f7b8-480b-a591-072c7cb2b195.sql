-- Credit missing 950 NCTR for referral reward adjustment
-- User should have received 1000 NCTR but only got 50 NCTR

-- Update portfolio with missing 950 NCTR
UPDATE public.nctr_portfolio 
SET available_nctr = available_nctr + 950,
    total_earned = total_earned + 950,
    updated_at = now()
WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff';

-- Create 360LOCK for the missing 950 NCTR
INSERT INTO public.nctr_locks (
  user_id,
  nctr_amount,
  lock_type,
  lock_category,
  commitment_days,
  unlock_date,
  can_upgrade,
  original_lock_type
) VALUES (
  'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff',
  950.00,
  '360LOCK',
  '360LOCK',
  360,
  now() + '360 days'::interval,
  false,
  '360LOCK'
);

-- Record the adjustment transaction
INSERT INTO public.nctr_transactions (
  user_id,
  transaction_type,
  nctr_amount,
  description,
  earning_source,
  status
) VALUES (
  'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff',
  'earned',
  950.00,
  'Referral reward adjustment - upgrading from 50 to 1000 NCTR total',
  'referral_adjustment',
  'completed'
);
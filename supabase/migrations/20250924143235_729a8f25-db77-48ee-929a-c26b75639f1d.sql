-- Lower minimum NCTR withdrawal amount to 25 NCTR
UPDATE public.treasury_config 
SET setting_value = '25' 
WHERE setting_key = 'min_withdrawal_amount';

-- Add comment for clarity
UPDATE public.treasury_config 
SET description = 'Minimum NCTR amount that can be withdrawn (lowered to 25 NCTR for better accessibility)'
WHERE setting_key = 'min_withdrawal_amount';
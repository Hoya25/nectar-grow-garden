-- Allow authenticated users to read specific public site settings
-- This allows the payment flow to access treasury_wallet_address without admin privileges

-- First drop the restrictive admin-only select policy
DROP POLICY IF EXISTS "Admins can view site settings" ON site_settings;

-- Create a new policy that allows:
-- 1. Admins to read all settings
-- 2. Authenticated users to read specific public settings
CREATE POLICY "Public settings readable by authenticated users"
ON site_settings
FOR SELECT
TO authenticated
USING (
  -- Admins can read all settings
  is_admin()
  OR
  -- Authenticated users can only read these specific public settings
  setting_key IN (
    'treasury_wallet_address',
    'wholesale_nctr_price',
    'nctr_price'
  )
);
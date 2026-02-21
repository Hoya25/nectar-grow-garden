-- Fix 1: Tighten profiles RLS to require auth.uid() verification
DROP POLICY IF EXISTS "admins_view_profile_metadata" ON profiles;

CREATE POLICY "admins_view_profile_metadata" ON profiles
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.access_level = 'super_admin'
      )
    )
  );

-- Fix 2: Tighten nctr_transactions to super_admin only
DROP POLICY IF EXISTS "admins_view_transactions" ON nctr_transactions;

CREATE POLICY "admins_view_transactions" ON nctr_transactions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.access_level = 'super_admin'
      )
    )
  );
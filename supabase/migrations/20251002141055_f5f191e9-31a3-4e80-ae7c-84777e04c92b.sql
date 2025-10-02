-- Add admin policy for affiliate_link_mappings so admins can view all mappings for diagnostics
CREATE POLICY "Admins can view all affiliate link mappings"
ON public.affiliate_link_mappings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

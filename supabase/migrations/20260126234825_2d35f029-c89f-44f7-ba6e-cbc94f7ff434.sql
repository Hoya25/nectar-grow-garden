-- ============================================
-- SECURITY FIX: Enable RLS on critical tables
-- ============================================

-- 1. SHOP_TRANSACTIONS: Contains customer PII (emails, names, purchase amounts)
-- Enable RLS and restrict to owner-only access

ALTER TABLE public.shop_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view their own shop transactions"
  ON public.shop_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own transactions (for webhook processing with their user_id)
CREATE POLICY "System can insert shop transactions"
  ON public.shop_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Only admins can update transactions (for crediting NCTR)
CREATE POLICY "Admins can manage shop transactions"
  ON public.shop_transactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. APP_SETTINGS: Contains business configuration (pricing, rates)
-- Enable RLS with admin-only write, restricted read

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can fully manage app settings
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Authenticated users can view only safe public settings
CREATE POLICY "Users can view public settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (key IN ('nctr_price', 'treasury_wallet_address', 'site_maintenance', 'announcement'));

-- 3. BRAND_CATEGORIES: Public metadata for browsing (read-only public access)

ALTER TABLE public.brand_categories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active categories
CREATE POLICY "Anyone can view active brand categories"
  ON public.brand_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage brand categories"
  ON public.brand_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. BRAND_TAGS: Public metadata for browsing (read-only public access)

ALTER TABLE public.brand_tags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active tags
CREATE POLICY "Anyone can view active brand tags"
  ON public.brand_tags FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can manage tags
CREATE POLICY "Admins can manage brand tags"
  ON public.brand_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. BRAND_TAG_ASSIGNMENTS: Public join table for brand-tag relationships

ALTER TABLE public.brand_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view tag assignments
CREATE POLICY "Anyone can view brand tag assignments"
  ON public.brand_tag_assignments FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage tag assignments
CREATE POLICY "Admins can manage brand tag assignments"
  ON public.brand_tag_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. SHOP_SETTINGS: Contains webhook secrets and store configuration

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access shop settings (contains secrets)
CREATE POLICY "Admins can manage shop settings"
  ON public.shop_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
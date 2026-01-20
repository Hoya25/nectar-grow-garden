-- ============================================
-- UNIFIED USER SYSTEM FOR GARDEN + CRESCENDO
-- ============================================

-- 1. STATUS TIERS (Admin Configurable)
CREATE TABLE IF NOT EXISTS status_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  badge_emoji text DEFAULT '💧',
  badge_color text DEFAULT '#60A5FA',
  min_nctr_360_locked numeric NOT NULL DEFAULT 0,
  max_nctr_360_locked numeric, -- NULL means unlimited (top tier)
  benefits jsonb DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. INSERT DEFAULT TIERS (Admin can change these)
INSERT INTO status_tiers (tier_name, display_name, badge_emoji, badge_color, min_nctr_360_locked, max_nctr_360_locked, benefits, sort_order) VALUES
  ('droplet', 'Droplet', '💧', '#60A5FA', 0, 99, '["Basic marketplace access", "Standard cashback rates"]', 1),
  ('eddy', 'Eddy', '🌀', '#818CF8', 100, 499, '["10% bonus on cashback", "Early access to new rewards"]', 2),
  ('spiral', 'Spiral', '🔄', '#A78BFA', 500, 1999, '["25% bonus on cashback", "Exclusive rewards unlocked", "Priority support"]', 3),
  ('surge', 'Surge', '🌊', '#C084FC', 2000, 9999, '["50% bonus on cashback", "VIP experiences", "Governance voting"]', 4),
  ('torus', 'Torus', '♾️', '#D4FF00', 10000, NULL, '["Maximum benefits", "Founding member status", "All governance rights", "White-glove support"]', 5)
ON CONFLICT (tier_name) DO NOTHING;

-- 3. UNIFIED USER PROFILES (no FK to auth.users per Supabase guidelines)
CREATE TABLE IF NOT EXISTS unified_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL, -- References auth.users conceptually, no FK
  
  -- Identity
  wallet_address text UNIQUE,
  email text,
  display_name text,
  avatar_url text,
  
  -- Status (calculated from 360LOCK)
  current_tier_id uuid REFERENCES status_tiers(id),
  tier_calculated_at timestamptz,
  
  -- Platform-specific data
  garden_data jsonb DEFAULT '{}'::jsonb,
  crescendo_data jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_active_garden timestamptz,
  last_active_crescendo timestamptz,
  
  UNIQUE(auth_user_id)
);

-- 4. WALLET PORTFOLIO (Tracks NCTR holdings)
CREATE TABLE IF NOT EXISTS wallet_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES unified_profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  
  -- NCTR Holdings
  nctr_balance numeric DEFAULT 0,
  nctr_360_locked numeric DEFAULT 0,
  nctr_90_locked numeric DEFAULT 0,
  nctr_unlocked numeric DEFAULT 0,
  
  -- Lock details
  locks jsonb DEFAULT '[]'::jsonb,
  
  -- Sync tracking
  last_synced_at timestamptz DEFAULT now(),
  sync_source text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, wallet_address)
);

-- 5. UNIFIED ADMIN SETTINGS (renamed to avoid conflict with site_settings)
CREATE TABLE IF NOT EXISTS unified_admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

-- Insert default admin settings
INSERT INTO unified_admin_settings (setting_key, setting_value, description) VALUES
  ('status_calculation_method', '"360lock_only"', 'How to calculate status: 360lock_only, total_locked, total_balance'),
  ('tier_sync_frequency', '"realtime"', 'How often to recalculate tiers: realtime, hourly, daily'),
  ('platforms_enabled', '{"garden": true, "crescendo": true}', 'Which platforms are enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- 6. CROSS-PLATFORM ACTIVITY LOG
CREATE TABLE IF NOT EXISTS unified_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES unified_profiles(id),
  platform text NOT NULL,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 6b. VALIDATION TRIGGER for platform (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION validate_activity_platform()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.platform NOT IN ('garden', 'crescendo', 'admin') THEN
    RAISE EXCEPTION 'Invalid platform: %. Must be garden, crescendo, or admin', NEW.platform;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_activity_platform_trigger
BEFORE INSERT OR UPDATE ON unified_activity_log
FOR EACH ROW
EXECUTE FUNCTION validate_activity_platform();

-- 7. FUNCTION: Calculate user tier based on 360LOCK
CREATE OR REPLACE FUNCTION calculate_unified_user_tier(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_total_360_locked numeric;
  v_tier_id uuid;
BEGIN
  -- Get total 360LOCK amount for user
  SELECT COALESCE(SUM(nctr_360_locked), 0)
  INTO v_total_360_locked
  FROM wallet_portfolio
  WHERE user_id = p_user_id;
  
  -- Find matching tier
  SELECT id INTO v_tier_id
  FROM status_tiers
  WHERE is_active = true
    AND min_nctr_360_locked <= v_total_360_locked
    AND (max_nctr_360_locked IS NULL OR max_nctr_360_locked >= v_total_360_locked)
  ORDER BY sort_order DESC
  LIMIT 1;
  
  -- Update user profile
  UPDATE unified_profiles
  SET current_tier_id = v_tier_id,
      tier_calculated_at = now(),
      updated_at = now()
  WHERE id = p_user_id;
  
  RETURN v_tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCTION: Get user with full tier info
CREATE OR REPLACE FUNCTION get_unified_user_with_tier(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user', to_jsonb(up.*),
    'tier', to_jsonb(st.*),
    'portfolio', (
      SELECT jsonb_agg(to_jsonb(wp.*))
      FROM wallet_portfolio wp
      WHERE wp.user_id = up.id
    )
  )
  INTO v_result
  FROM unified_profiles up
  LEFT JOIN status_tiers st ON up.current_tier_id = st.id
  WHERE up.id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. TRIGGER: Auto-recalculate tier when portfolio changes
CREATE OR REPLACE FUNCTION trigger_recalculate_unified_tier()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_unified_user_tier(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portfolio_unified_tier_update
AFTER INSERT OR UPDATE ON wallet_portfolio
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_unified_tier();

-- 10. INDEXES
CREATE INDEX IF NOT EXISTS idx_unified_profiles_wallet ON unified_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_unified_profiles_tier ON unified_profiles(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_unified_profiles_auth ON unified_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_portfolio_user ON wallet_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_activity_log_user ON unified_activity_log(user_id, created_at DESC);

-- 11. ROW LEVEL SECURITY
ALTER TABLE unified_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_admin_settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own unified profile" ON unified_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Users can update their own profile
CREATE POLICY "Users update own unified profile" ON unified_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Users can insert their own profile
CREATE POLICY "Users insert own unified profile" ON unified_profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Service role can manage all profiles
CREATE POLICY "Service role manages unified profiles" ON unified_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Anyone can read status tiers
CREATE POLICY "Anyone can read tiers" ON status_tiers
  FOR SELECT USING (true);

-- Admins can manage tiers
CREATE POLICY "Admins manage status tiers" ON status_tiers
  FOR ALL USING (is_admin());

-- Users can read their own portfolio
CREATE POLICY "Users read own wallet portfolio" ON wallet_portfolio
  FOR SELECT USING (
    user_id IN (SELECT id FROM unified_profiles WHERE auth_user_id = auth.uid())
  );

-- Users can insert their own portfolio
CREATE POLICY "Users insert own wallet portfolio" ON wallet_portfolio
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM unified_profiles WHERE auth_user_id = auth.uid())
  );

-- Users can update their own portfolio
CREATE POLICY "Users update own wallet portfolio" ON wallet_portfolio
  FOR UPDATE USING (
    user_id IN (SELECT id FROM unified_profiles WHERE auth_user_id = auth.uid())
  );

-- Service role can manage all portfolios
CREATE POLICY "Service role manages wallet portfolio" ON wallet_portfolio
  FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own activity
CREATE POLICY "Users read own unified activity" ON unified_activity_log
  FOR SELECT USING (
    user_id IN (SELECT id FROM unified_profiles WHERE auth_user_id = auth.uid())
  );

-- Users can insert their own activity
CREATE POLICY "Users insert own unified activity" ON unified_activity_log
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM unified_profiles WHERE auth_user_id = auth.uid())
  );

-- Service role can manage all activity
CREATE POLICY "Service role manages unified activity" ON unified_activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- Admins can view activity
CREATE POLICY "Admins view unified activity" ON unified_activity_log
  FOR SELECT USING (is_admin());

-- Admins can manage unified settings
CREATE POLICY "Admins manage unified settings" ON unified_admin_settings
  FOR ALL USING (is_admin());

-- Service role can manage unified settings
CREATE POLICY "Service role manages unified settings" ON unified_admin_settings
  FOR ALL USING (auth.role() = 'service_role');
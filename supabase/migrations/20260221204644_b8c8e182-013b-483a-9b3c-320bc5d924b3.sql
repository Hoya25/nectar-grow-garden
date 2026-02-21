
-- 1. Token definitions (reference table)
CREATE TABLE public.token_definitions (
  token_id text PRIMARY KEY,
  display_name text NOT NULL,
  color text NOT NULL,
  glow_color text,
  impact_engine text,
  is_impact_token boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.token_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view token definitions"
  ON public.token_definitions FOR SELECT USING (true);

CREATE POLICY "Admins can manage token definitions"
  ON public.token_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Brand token bounties
CREATE TABLE public.brand_token_bounties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  token_id text NOT NULL REFERENCES public.token_definitions(token_id),
  base_rate numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  is_shopper_selectable boolean NOT NULL DEFAULT true,
  is_admin_locked boolean NOT NULL DEFAULT false,
  amplifier_override numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, token_id)
);

ALTER TABLE public.brand_token_bounties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage token bounties"
  ON public.brand_token_bounties FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active token bounties"
  ON public.brand_token_bounties FOR SELECT
  USING (is_active = true);

-- 3. Auto-update updated_at trigger for brand_token_bounties
CREATE TRIGGER update_brand_token_bounties_updated_at
  BEFORE UPDATE ON public.brand_token_bounties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed token definitions
INSERT INTO public.token_definitions 
  (token_id, display_name, color, glow_color, impact_engine, is_impact_token, sort_order)
VALUES
  ('NCTR',        'NCTR',        '#E2FF6D', 'rgba(226,255,109,0.5)', 'Alliance',      false, 0),
  ('INSPIRATION', 'INSPIRATION', '#A8E6CF', 'rgba(168,230,207,0.5)', 'Wellness',      true,  1),
  ('THROTTLE',    'THROTTLE',    '#FF6B6B', 'rgba(255,107,107,0.5)', 'Powersports',   true,  2),
  ('GROUNDBALL',  'GROUNDBALL',  '#4ECDC4', 'rgba(78,205,196,0.5)',  'Lacrosse',      true,  3),
  ('STARDUST',    'STARDUST',    '#FFE66D', 'rgba(255,230,109,0.5)', 'Entertainment', true,  4),
  ('SWEAT',       'SWEAT',       '#FF8B94', 'rgba(255,139,148,0.5)', 'Trades',        true,  5),
  ('SISU',        'SISU',        '#A8D8EA', 'rgba(168,216,234,0.5)', 'Recovery',      true,  6),
  ('SHIFT',       'SHIFT',       '#AA96DA', 'rgba(170,150,218,0.5)', 'Hospitality',   true,  7);

-- 5. Add overlay/amplifier columns to brands table
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS nctr_overlay_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS nctr_overlay_rate numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS amplifier_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS amplifier_multiplier numeric DEFAULT 1.25;

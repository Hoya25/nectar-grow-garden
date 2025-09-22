-- Insert default earning opportunities banner content into site_settings
INSERT INTO public.site_settings (setting_key, setting_value, description) 
VALUES 
  ('earning_opportunities_banner_title', '"Earning Opportunities"', 'Main title for the earning opportunities section'),
  ('earning_opportunities_banner_subtitle', '"Support NCTR Alliance partners and earn NCTR with every transaction"', 'Subtitle text for the earning opportunities section')
ON CONFLICT (setting_key) DO NOTHING;
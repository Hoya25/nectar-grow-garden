-- Insert wholesale NCTR price setting (default $0.04)
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES (
  'wholesale_nctr_price',
  '0.04',
  'Wholesale price per NCTR token for 360LOCK purchases (in USD)'
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;
-- Insert treasury wallet address configuration
INSERT INTO site_settings (setting_key, setting_value, description)
VALUES (
  'treasury_wallet_address',
  '"0x8858BB2e1e0D248605F7d6eb34A3C74F5CdD6eDD"'::jsonb,
  'Base network treasury wallet address for NCTR purchases'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = '"0x8858BB2e1e0D248605F7d6eb34A3C74F5CdD6eDD"'::jsonb,
  updated_at = now();
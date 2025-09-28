-- Add tracking mapping for Kurdilla's existing tracking ID
INSERT INTO public.affiliate_link_mappings (tracking_id, user_id, brand_id) 
VALUES (
  'tgn_cd1a54f5_1b17d9eb_mg33qd4g', 
  '4b90a032-2c5b-4835-9c73-d298cd1a54f5', 
  'd8b29d2d-28e8-4886-a8a8-4aa02b7196d7'
) 
ON CONFLICT (tracking_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  brand_id = EXCLUDED.brand_id,
  updated_at = now();
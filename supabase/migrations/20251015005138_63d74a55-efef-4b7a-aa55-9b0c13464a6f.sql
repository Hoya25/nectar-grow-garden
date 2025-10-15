-- Fix alliance_tokens structure to include full token details
UPDATE nctr_portfolio 
SET alliance_tokens = jsonb_build_object('SOL', jsonb_build_object(
  'name', 'Solana',
  'symbol', 'SOL',
  'amount', 0.0017,
  'logo_url', 'https://cryptologos.cc/logos/solana-sol-logo.png'
))
WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff' AND alliance_tokens IS NOT NULL;
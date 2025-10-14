-- Temporarily add SOL alliance tokens to demonstrate the Alliance Tokens card
UPDATE nctr_portfolio 
SET alliance_tokens = jsonb_build_object('SOL', 0.0017)
WHERE user_id = 'fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff';

-- Update one transaction to show alliance token reward
UPDATE nctr_transactions
SET alliance_token_amount = 0.0017,
    alliance_token_symbol = 'SOL',
    description = 'Uber Gift Card purchase ($17.00) • Base: 425.00 NCTR • Wings 2.00x bonus: +425.00 NCTR + 0.0017 SOL'
WHERE id = '6440476f-7551-4d96-8d89-a63b8757f2d3';
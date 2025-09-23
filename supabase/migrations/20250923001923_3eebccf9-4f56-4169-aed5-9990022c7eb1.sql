-- Fix portfolio balance update by manually calling the trigger function
-- This will ensure the portfolio reflects the correct 360LOCK balance

-- Update the portfolio balances for the user
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Get the user ID
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'anderson@projectbutterfly.io';
    
    -- Manually trigger the portfolio balance update
    PERFORM update_portfolio_lock_balances() FROM (SELECT user_uuid as user_id) t;
END $$;
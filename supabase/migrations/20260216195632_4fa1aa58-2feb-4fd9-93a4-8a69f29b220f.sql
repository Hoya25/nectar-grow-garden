-- Drop the 5-param overload that has the ambiguous variable bug
DROP FUNCTION IF EXISTS public.award_affiliate_nctr(uuid, numeric, text, text, numeric);

-- Recreate with fixed variable names (v_ prefix)
CREATE OR REPLACE FUNCTION public.award_affiliate_nctr(
  p_user_id uuid,
  p_base_nctr_amount numeric,
  p_earning_source text,
  p_brand_name text DEFAULT NULL,
  p_purchase_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  multiplied_amount numeric;
  lock_id uuid;
  v_alliance_token_amount numeric := 0;
  v_alliance_token_symbol text;
  v_alliance_token_name text;
  v_alliance_token_ratio numeric;
  v_alliance_token_lock_days integer;
  brand_data record;
  alliance_lock_id uuid;
  capped_purchase_amount numeric;
  cap_applied boolean := false;
  reward_cap numeric := 2500.00;
BEGIN
  multiplied_amount := public.apply_reward_multiplier(p_user_id, p_base_nctr_amount);
  
  IF p_purchase_amount IS NOT NULL AND p_purchase_amount > reward_cap THEN
    capped_purchase_amount := reward_cap;
    cap_applied := true;
  ELSE
    capped_purchase_amount := p_purchase_amount;
  END IF;
  
  IF p_brand_name IS NOT NULL AND capped_purchase_amount IS NOT NULL THEN
    SELECT 
      alliance_token_enabled,
      alliance_token_ratio,
      alliance_token_symbol,
      alliance_token_name,
      alliance_token_lock_days
    INTO brand_data
    FROM public.earning_opportunities
    WHERE partner_name = p_brand_name
      AND opportunity_type = 'shopping'
      AND is_active = true
      AND alliance_token_enabled = true
    LIMIT 1;
    
    IF FOUND AND brand_data.alliance_token_ratio > 0 THEN
      v_alliance_token_amount := capped_purchase_amount * brand_data.alliance_token_ratio;
      v_alliance_token_symbol := brand_data.alliance_token_symbol;
      v_alliance_token_name := brand_data.alliance_token_name;
      v_alliance_token_ratio := brand_data.alliance_token_ratio;
      v_alliance_token_lock_days := brand_data.alliance_token_lock_days;
      
      IF v_alliance_token_amount > 0 THEN
        INSERT INTO public.alliance_token_locks (
          user_id, token_amount, token_name, token_symbol, lock_days, unlock_date
        ) VALUES (
          p_user_id,
          v_alliance_token_amount,
          COALESCE(v_alliance_token_name, v_alliance_token_symbol),
          v_alliance_token_symbol,
          v_alliance_token_lock_days,
          now() + (v_alliance_token_lock_days || ' days')::interval
        ) RETURNING id INTO alliance_lock_id;
        
        UPDATE public.nctr_portfolio
        SET 
          alliance_tokens = COALESCE(alliance_tokens, '{}'::jsonb) || 
            jsonb_build_object(
              v_alliance_token_symbol,
              COALESCE((alliance_tokens->v_alliance_token_symbol)::numeric, 0) + v_alliance_token_amount
            ),
          updated_at = now()
        WHERE user_id = p_user_id;
      END IF;
    END IF;
  END IF;
  
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + multiplied_amount, updated_at = now()
  WHERE user_id = p_user_id;
  
  SELECT public.auto_lock_earned_nctr(
    p_user_id, p_base_nctr_amount, p_earning_source, 'shopping'
  ) INTO lock_id;
  
  INSERT INTO public.nctr_transactions (
    user_id, transaction_type, nctr_amount, alliance_token_amount, alliance_token_symbol,
    purchase_amount, description, earning_source, partner_name, status
  ) VALUES (
    p_user_id, 'earned', multiplied_amount, v_alliance_token_amount, v_alliance_token_symbol,
    p_purchase_amount,
    CASE 
      WHEN v_alliance_token_amount > 0 AND cap_applied THEN
        format('NCTR earned from %s purchase (with %sx multiplier) + %s %s (rewards capped at $%s)', 
          COALESCE(p_brand_name, 'affiliate'), (multiplied_amount / p_base_nctr_amount),
          v_alliance_token_amount, v_alliance_token_symbol, reward_cap)
      WHEN v_alliance_token_amount > 0 THEN
        format('NCTR earned from %s purchase (with %sx multiplier) + %s %s', 
          COALESCE(p_brand_name, 'affiliate'), (multiplied_amount / p_base_nctr_amount),
          v_alliance_token_amount, v_alliance_token_symbol)
      WHEN cap_applied THEN
        format('NCTR earned from %s purchase (with %sx multiplier, rewards capped at $%s)', 
          COALESCE(p_brand_name, 'affiliate'), (multiplied_amount / p_base_nctr_amount), reward_cap)
      ELSE
        format('NCTR earned from %s purchase (with %sx multiplier)', 
          COALESCE(p_brand_name, 'affiliate'), (multiplied_amount / p_base_nctr_amount))
    END,
    p_earning_source, p_brand_name, 'completed'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'base_amount', p_base_nctr_amount,
    'multiplied_amount', multiplied_amount,
    'multiplier', (multiplied_amount / p_base_nctr_amount),
    'lock_id', lock_id,
    'alliance_token_amount', v_alliance_token_amount,
    'alliance_token_symbol', v_alliance_token_symbol,
    'alliance_lock_id', alliance_lock_id,
    'cap_applied', cap_applied,
    'capped_at', CASE WHEN cap_applied THEN reward_cap ELSE NULL END
  );
END;
$$;
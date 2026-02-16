
DROP FUNCTION IF EXISTS public.award_affiliate_nctr(uuid, numeric, text, text, numeric);

CREATE OR REPLACE FUNCTION public.award_affiliate_nctr(
  p_user_id uuid,
  p_base_nctr_amount numeric,
  p_earning_source text,
  p_brand_name text,
  p_purchase_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_multiplier numeric := 1.0;
  v_final_amount numeric;
  v_opportunity_status text;
  v_alliance_token_ratio numeric := 0;
  v_alliance_token_symbol text;
  v_alliance_token_amount numeric := 0;
  v_existing_tokens jsonb;
  v_existing_amount numeric := 0;
BEGIN
  SELECT opportunity_status INTO v_opportunity_status
  FROM nctr_portfolio WHERE user_id = p_user_id;

  IF v_opportunity_status IS NOT NULL THEN
    SELECT reward_multiplier INTO v_multiplier
    FROM opportunity_status_levels WHERE status_name = v_opportunity_status;
  END IF;

  v_multiplier := COALESCE(v_multiplier, 1.0);
  v_final_amount := p_base_nctr_amount * v_multiplier;

  INSERT INTO nctr_transactions (
    user_id, nctr_amount, transaction_type, earning_source,
    partner_name, purchase_amount, description, status
  ) VALUES (
    p_user_id, v_final_amount, 'earned', p_earning_source,
    p_brand_name, p_purchase_amount,
    format('Earned %s NCTR from %s purchase ($%s) with %sx multiplier',
           v_final_amount, p_brand_name, p_purchase_amount, v_multiplier),
    'completed'
  );

  SELECT eo.alliance_token_ratio, eo.alliance_token_symbol
  INTO v_alliance_token_ratio, v_alliance_token_symbol
  FROM earning_opportunities eo
  JOIN brands b ON b.id = eo.brand_id
  WHERE b.name = p_brand_name AND eo.alliance_token_enabled = true
  LIMIT 1;

  v_alliance_token_ratio := COALESCE(v_alliance_token_ratio, 0);

  IF v_alliance_token_ratio > 0 AND v_alliance_token_symbol IS NOT NULL THEN
    v_alliance_token_amount := v_final_amount * v_alliance_token_ratio;

    SELECT COALESCE(alliance_tokens, '{}'::jsonb) INTO v_existing_tokens
    FROM nctr_portfolio WHERE user_id = p_user_id;

    IF v_existing_tokens IS NULL OR jsonb_typeof(v_existing_tokens) != 'object' THEN
      v_existing_tokens := '{}'::jsonb;
    END IF;

    IF v_existing_tokens ? v_alliance_token_symbol 
       AND jsonb_typeof(v_existing_tokens->v_alliance_token_symbol) = 'number' THEN
      v_existing_amount := (v_existing_tokens->>v_alliance_token_symbol)::numeric;
    ELSE
      v_existing_amount := 0;
    END IF;

    UPDATE nctr_portfolio SET 
      available_nctr = available_nctr + v_final_amount,
      total_earned = total_earned + v_final_amount,
      alliance_tokens = v_existing_tokens || jsonb_build_object(v_alliance_token_symbol, v_existing_amount + v_alliance_token_amount),
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE nctr_portfolio SET 
      available_nctr = available_nctr + v_final_amount,
      total_earned = total_earned + v_final_amount,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'multiplier', v_multiplier,
    'base_amount', p_base_nctr_amount, 'multiplied_amount', v_final_amount,
    'alliance_token_amount', v_alliance_token_amount,
    'alliance_token_symbol', v_alliance_token_symbol
  );
END;
$$;

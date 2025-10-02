-- Update award_affiliate_nctr function to include detailed purchase info and fix multiplier formatting
CREATE OR REPLACE FUNCTION public.award_affiliate_nctr(
  p_user_id uuid, 
  p_base_nctr_amount numeric, 
  p_earning_source text DEFAULT 'affiliate_purchase',
  p_brand_name text DEFAULT NULL,
  p_purchase_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  multiplied_amount numeric;
  lock_id uuid;
  multiplier numeric;
  description_text text;
BEGIN
  -- Apply reward multiplier based on user status
  multiplied_amount := public.apply_reward_multiplier(p_user_id, p_base_nctr_amount);
  
  -- Calculate multiplier and round to 2 decimal places
  multiplier := ROUND(multiplied_amount / p_base_nctr_amount, 2);
  
  -- Build description with purchase details and breakdown
  IF p_brand_name IS NOT NULL AND p_purchase_amount IS NOT NULL THEN
    description_text := p_brand_name || ' purchase ($' || ROUND(p_purchase_amount, 2) || 
                       ') • Base: ' || ROUND(p_base_nctr_amount, 2) || 
                       ' NCTR • Wings ' || multiplier || 'x bonus: +' || 
                       ROUND(multiplied_amount - p_base_nctr_amount, 2) || ' NCTR';
  ELSE
    description_text := 'NCTR earned from affiliate purchase (with ' || multiplier || 'x status multiplier)';
  END IF;
  
  -- Update total_earned in portfolio with multiplied amount
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + multiplied_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Auto-lock the multiplied earnings in 90LOCK
  SELECT public.auto_lock_earned_nctr(
    p_user_id,
    p_base_nctr_amount, -- Pass base amount since auto_lock already applies multiplier
    p_earning_source,
    'shopping'
  ) INTO lock_id;
  
  -- Record the transaction with multiplied amount and detailed description
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status,
    partner_name,
    purchase_amount
  ) VALUES (
    p_user_id,
    'earned',
    multiplied_amount,
    description_text,
    p_earning_source,
    'completed',
    p_brand_name,
    p_purchase_amount
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'base_amount', p_base_nctr_amount,
    'multiplied_amount', multiplied_amount,
    'multiplier', multiplier,
    'lock_id', lock_id
  );
END;
$function$;
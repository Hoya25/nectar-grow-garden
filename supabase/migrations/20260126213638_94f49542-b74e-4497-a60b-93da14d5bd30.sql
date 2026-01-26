-- Update tier thresholds to match Crescendo Status metal tiers
UPDATE public.opportunity_status_levels
SET min_locked_nctr = 0
WHERE status_name = 'bronze';

UPDATE public.opportunity_status_levels
SET min_locked_nctr = 1000
WHERE status_name = 'silver';

UPDATE public.opportunity_status_levels
SET min_locked_nctr = 2500
WHERE status_name = 'gold';

UPDATE public.opportunity_status_levels
SET min_locked_nctr = 10000
WHERE status_name = 'platinum';

UPDATE public.opportunity_status_levels
SET min_locked_nctr = 50000
WHERE status_name = 'diamond';

-- Update database function to use Crescendo Status terminology instead of Wings
CREATE OR REPLACE FUNCTION public.process_affiliate_purchase(
  p_user_id uuid,
  p_base_nctr_amount numeric,
  p_brand_name text DEFAULT NULL,
  p_purchase_amount numeric DEFAULT NULL,
  p_external_transaction_id text DEFAULT NULL,
  p_partner_name text DEFAULT NULL,
  p_auto_lock_type text DEFAULT '360'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  multiplier numeric;
  multiplied_amount numeric;
  description_text text;
  result jsonb;
BEGIN
  -- Get user's status multiplier
  SELECT COALESCE(osl.reward_multiplier, 1.0) INTO multiplier
  FROM nctr_portfolio np
  LEFT JOIN opportunity_status_levels osl ON np.opportunity_status = osl.status_name
  WHERE np.user_id = p_user_id;
  
  IF multiplier IS NULL THEN
    multiplier := 1.0;
  END IF;
  
  -- Calculate multiplied amount
  multiplied_amount := p_base_nctr_amount * multiplier;
  
  -- Build description with purchase details and breakdown
  IF p_brand_name IS NOT NULL AND p_purchase_amount IS NOT NULL THEN
    description_text := p_brand_name || ' purchase ($' || ROUND(p_purchase_amount, 2)::text || 
                       ') • Base: ' || ROUND(p_base_nctr_amount, 2)::text || 
                       ' NCTR • Status ' || ROUND(multiplier, 2)::text || 'x bonus: +' || 
                       ROUND(multiplied_amount - p_base_nctr_amount, 2)::text || ' NCTR';
  ELSE
    description_text := 'NCTR earned from affiliate purchase (with ' || ROUND(multiplier, 2)::text || 'x status multiplier)';
  END IF;
  
  -- Insert the transaction
  INSERT INTO nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status,
    external_transaction_id,
    partner_name,
    purchase_amount,
    auto_lock_type
  ) VALUES (
    p_user_id,
    'earned',
    multiplied_amount,
    description_text,
    'affiliate_purchase',
    'completed',
    p_external_transaction_id,
    p_partner_name,
    p_purchase_amount,
    p_auto_lock_type
  );
  
  -- Update portfolio based on lock type
  IF p_auto_lock_type = '360' THEN
    UPDATE nctr_portfolio 
    SET lock_360_nctr = COALESCE(lock_360_nctr, 0) + multiplied_amount,
        total_earned = COALESCE(total_earned, 0) + multiplied_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_auto_lock_type = '90' THEN
    UPDATE nctr_portfolio 
    SET lock_90_nctr = COALESCE(lock_90_nctr, 0) + multiplied_amount,
        total_earned = COALESCE(total_earned, 0) + multiplied_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE nctr_portfolio 
    SET available_nctr = COALESCE(available_nctr, 0) + multiplied_amount,
        total_earned = COALESCE(total_earned, 0) + multiplied_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'base_amount', p_base_nctr_amount,
    'multiplier', multiplier,
    'final_amount', multiplied_amount,
    'description', description_text
  );
  
  RETURN result;
END;
$function$;
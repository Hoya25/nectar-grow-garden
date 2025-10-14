-- Update the update_opportunity_admin function to include Alliance Token fields
CREATE OR REPLACE FUNCTION public.update_opportunity_admin(opportunity_id uuid, opportunity_data jsonb)
 RETURNS TABLE(id uuid, brand_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Simple admin check using is_admin function
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Update the opportunity including Alliance Token fields
  UPDATE public.earning_opportunities
  SET
    title = COALESCE((opportunity_data->>'title')::text, title),
    description = COALESCE((opportunity_data->>'description')::text, description),
    opportunity_type = COALESCE((opportunity_data->>'opportunity_type')::text, opportunity_type),
    nctr_reward = COALESCE((opportunity_data->>'nctr_reward')::numeric, nctr_reward),
    reward_per_dollar = COALESCE((opportunity_data->>'reward_per_dollar')::numeric, reward_per_dollar),
    partner_name = COALESCE((opportunity_data->>'partner_name')::text, partner_name),
    partner_logo_url = COALESCE((opportunity_data->>'partner_logo_url')::text, partner_logo_url),
    affiliate_link = COALESCE((opportunity_data->>'affiliate_link')::text, affiliate_link),
    video_url = COALESCE((opportunity_data->>'video_url')::text, video_url),
    video_title = COALESCE((opportunity_data->>'video_title')::text, video_title),
    video_description = COALESCE((opportunity_data->>'video_description')::text, video_description),
    is_active = COALESCE((opportunity_data->>'is_active')::boolean, is_active),
    display_order = COALESCE((opportunity_data->>'display_order')::integer, display_order),
    brand_id = CASE 
      WHEN opportunity_data->>'brand_id' = 'null' OR opportunity_data->>'brand_id' IS NULL THEN NULL
      ELSE (opportunity_data->>'brand_id')::uuid
    END,
    available_nctr_reward = COALESCE((opportunity_data->>'available_nctr_reward')::numeric, available_nctr_reward),
    lock_90_nctr_reward = COALESCE((opportunity_data->>'lock_90_nctr_reward')::numeric, lock_90_nctr_reward),
    lock_360_nctr_reward = COALESCE((opportunity_data->>'lock_360_nctr_reward')::numeric, lock_360_nctr_reward),
    reward_distribution_type = COALESCE((opportunity_data->>'reward_distribution_type')::text, reward_distribution_type),
    -- Alliance Token fields
    alliance_token_enabled = COALESCE((opportunity_data->>'alliance_token_enabled')::boolean, alliance_token_enabled),
    alliance_token_name = COALESCE((opportunity_data->>'alliance_token_name')::text, alliance_token_name),
    alliance_token_symbol = COALESCE((opportunity_data->>'alliance_token_symbol')::text, alliance_token_symbol),
    alliance_token_logo_url = COALESCE((opportunity_data->>'alliance_token_logo_url')::text, alliance_token_logo_url),
    alliance_token_ratio = COALESCE((opportunity_data->>'alliance_token_ratio')::numeric, alliance_token_ratio),
    alliance_token_lock_days = COALESCE((opportunity_data->>'alliance_token_lock_days')::integer, alliance_token_lock_days),
    updated_at = now()
  WHERE earning_opportunities.id = opportunity_id;

  -- Return the updated opportunity ID and brand_id for verification
  RETURN QUERY 
  SELECT earning_opportunities.id, earning_opportunities.brand_id 
  FROM earning_opportunities 
  WHERE earning_opportunities.id = opportunity_id;
END;
$function$;
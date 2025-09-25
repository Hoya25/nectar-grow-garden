-- Fix the update_opportunity_secure function to use the correct admin_users.id
CREATE OR REPLACE FUNCTION update_opportunity_secure(
  opportunity_id UUID,
  opportunity_data JSONB
) RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  opportunity_type TEXT,
  nctr_reward DECIMAL,
  reward_per_dollar DECIMAL,
  partner_name TEXT,
  partner_logo_url TEXT,
  affiliate_link TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  display_order INTEGER,
  available_nctr_reward DECIMAL,
  lock_90_nctr_reward DECIMAL,
  lock_360_nctr_reward DECIMAL,
  reward_distribution_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  admin_record_id UUID;
  is_admin BOOLEAN := FALSE;
  admin_user_exists BOOLEAN := FALSE;
BEGIN
  -- Get current user from JWT
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE auth.users.id = current_user_id;
  
  -- Check if user exists in admin_users table and get the admin record ID
  SELECT au.id, EXISTS(
    SELECT 1 
    FROM admin_users au2
    WHERE au2.user_id = current_user_id
  ) INTO admin_record_id, admin_user_exists
  FROM admin_users au
  WHERE au.user_id = current_user_id
  LIMIT 1;
  
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 
    FROM admin_users au
    WHERE au.user_id = current_user_id 
    AND au.access_level IN ('full_access', 'management')
  ) INTO is_admin;
  
  -- Additional check for the specific admin email
  IF user_email = 'anderson@projectbutterfly.io' THEN
    is_admin := TRUE;
  END IF;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Only log if user exists in admin_users table and we have the admin record ID
  IF admin_user_exists AND admin_record_id IS NOT NULL THEN
    INSERT INTO public.admin_activity_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      admin_record_id,  -- Use the admin_users.id, not auth.uid()
      'updated',
      'opportunity',
      opportunity_id,
      opportunity_data
    );
  END IF;
  
  -- Update the opportunity
  RETURN QUERY
  UPDATE earning_opportunities
  SET 
    title = COALESCE((opportunity_data->>'title')::TEXT, earning_opportunities.title),
    description = COALESCE((opportunity_data->>'description')::TEXT, earning_opportunities.description),
    opportunity_type = COALESCE((opportunity_data->>'opportunity_type')::TEXT, earning_opportunities.opportunity_type),
    nctr_reward = COALESCE((opportunity_data->>'nctr_reward')::DECIMAL, earning_opportunities.nctr_reward),
    reward_per_dollar = COALESCE((opportunity_data->>'reward_per_dollar')::DECIMAL, earning_opportunities.reward_per_dollar),
    partner_name = COALESCE((opportunity_data->>'partner_name')::TEXT, earning_opportunities.partner_name),
    partner_logo_url = COALESCE((opportunity_data->>'partner_logo_url')::TEXT, earning_opportunities.partner_logo_url),
    affiliate_link = COALESCE((opportunity_data->>'affiliate_link')::TEXT, earning_opportunities.affiliate_link),
    is_active = COALESCE((opportunity_data->>'is_active')::BOOLEAN, earning_opportunities.is_active),
    display_order = COALESCE((opportunity_data->>'display_order')::INTEGER, earning_opportunities.display_order),
    available_nctr_reward = COALESCE((opportunity_data->>'available_nctr_reward')::DECIMAL, earning_opportunities.available_nctr_reward),
    lock_90_nctr_reward = COALESCE((opportunity_data->>'lock_90_nctr_reward')::DECIMAL, earning_opportunities.lock_90_nctr_reward),
    lock_360_nctr_reward = COALESCE((opportunity_data->>'lock_360_nctr_reward')::DECIMAL, earning_opportunities.lock_360_nctr_reward),
    reward_distribution_type = COALESCE((opportunity_data->>'reward_distribution_type')::TEXT, earning_opportunities.reward_distribution_type),
    video_url = COALESCE((opportunity_data->>'video_url')::TEXT, earning_opportunities.video_url),
    video_title = COALESCE((opportunity_data->>'video_title')::TEXT, earning_opportunities.video_title),
    video_description = COALESCE((opportunity_data->>'video_description')::TEXT, earning_opportunities.video_description),
    updated_at = now()
  WHERE earning_opportunities.id = opportunity_id
  RETURNING 
    earning_opportunities.id,
    earning_opportunities.title,
    earning_opportunities.description,
    earning_opportunities.opportunity_type,
    earning_opportunities.nctr_reward,
    earning_opportunities.reward_per_dollar,
    earning_opportunities.partner_name,
    earning_opportunities.partner_logo_url,
    earning_opportunities.affiliate_link,
    earning_opportunities.is_active,
    earning_opportunities.created_at,
    earning_opportunities.updated_at,
    earning_opportunities.display_order,
    earning_opportunities.available_nctr_reward,
    earning_opportunities.lock_90_nctr_reward,
    earning_opportunities.lock_360_nctr_reward,
    earning_opportunities.reward_distribution_type;
END;
$$;
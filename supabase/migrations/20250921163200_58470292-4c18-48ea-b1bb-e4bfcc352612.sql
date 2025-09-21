-- First, let's add some sample earning opportunities to get started
INSERT INTO public.earning_opportunities (
  title, 
  description, 
  opportunity_type, 
  nctr_reward, 
  reward_per_dollar, 
  partner_name, 
  is_active
) VALUES 
(
  'Invite Friends to The Garden',
  'Earn 50 NCTR for each friend who joins The Garden using your referral link. Both you and your friend get rewards!',
  'invite',
  50,
  0,
  'The Garden',
  true
),
(
  'Daily Check-in Bonus',
  'Visit The Garden daily and earn bonus NCTR tokens. Streak rewards increase your daily bonus!',
  'bonus',
  5,
  0,
  'The Garden',
  true
),
(
  'Complete Your Profile',
  'One-time bonus for completing your full profile with name, avatar, and preferences.',
  'bonus',
  25,
  0,
  'The Garden',
  true
);

-- Create function to make user admin by email
CREATE OR REPLACE FUNCTION public.make_user_admin_by_email(user_email TEXT, admin_role TEXT DEFAULT 'super_admin')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  result_message TEXT;
BEGIN
  -- Find user by email in auth.users (requires RLS bypass via SECURITY DEFINER)
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email 
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN 'User with email ' || user_email || ' not found. Please ensure they have signed up first.';
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = target_user_id) THEN
    RETURN 'User ' || user_email || ' is already an admin.';
  END IF;
  
  -- Make user an admin
  INSERT INTO public.admin_users (user_id, role, permissions, created_by)
  VALUES (
    target_user_id, 
    admin_role, 
    ARRAY['manage_opportunities', 'manage_users', 'manage_brands', 'manage_system'],
    target_user_id -- self-created for initial admin
  );
  
  RETURN 'Successfully made ' || user_email || ' a ' || admin_role || '.';
END;
$$;

-- Function to add sample brand data (can be called after admin setup)
CREATE OR REPLACE FUNCTION public.add_sample_brands()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.brands (
    name, 
    description, 
    category,
    commission_rate, 
    nctr_per_dollar,
    website_url,
    is_active,
    featured
  ) VALUES 
  (
    'Sample Fashion Brand',
    'Premium fashion retailer offering sustainable and ethically-made clothing for modern lifestyles.',
    'Fashion',
    0.08,
    0.015,
    'https://example-fashion.com',
    true,
    true
  ),
  (
    'Sample Electronics Store',
    'Leading electronics retailer with the latest gadgets, smartphones, and tech accessories.',
    'Electronics',
    0.05,
    0.012,
    'https://example-electronics.com',
    true,
    false
  ),
  (
    'Sample Home & Garden',
    'Everything for your home and garden - furniture, decor, plants, and outdoor equipment.',
    'Home & Garden',
    0.06,
    0.018,
    'https://example-home.com',
    true,
    false
  );
  
  RETURN 'Sample brands added successfully.';
END;
$$;
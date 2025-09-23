-- Create function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_data RECORD;
  completion_score integer := 0;
  completion_details jsonb := '{}';
  is_complete boolean := false;
  bonus_awarded boolean := false;
BEGIN
  -- Get profile data
  SELECT 
    p.full_name,
    p.username, 
    p.avatar_url,
    p.wallet_address,
    p.email
  INTO profile_data
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
  
  -- Calculate completion score based on criteria
  completion_details := jsonb_build_object(
    'full_name', profile_data.full_name IS NOT NULL AND profile_data.full_name != '',
    'username', profile_data.username IS NOT NULL AND profile_data.username != '',
    'email', profile_data.email IS NOT NULL AND profile_data.email != '',
    'avatar_url', profile_data.avatar_url IS NOT NULL AND profile_data.avatar_url != '',
    'wallet_connected', profile_data.wallet_address IS NOT NULL AND profile_data.wallet_address != ''
  );
  
  -- Core elements (70% = 35 points each for full_name, username, email)
  IF (completion_details->>'full_name')::boolean THEN completion_score := completion_score + 25; END IF;
  IF (completion_details->>'username')::boolean THEN completion_score := completion_score + 25; END IF;
  IF (completion_details->>'email')::boolean THEN completion_score := completion_score + 20; END IF;
  
  -- Wallet connection (adds 15% = 15 points)
  IF (completion_details->>'wallet_connected')::boolean THEN completion_score := completion_score + 15; END IF;
  
  -- Avatar (adds 10% = 10 points) 
  IF (completion_details->>'avatar_url')::boolean THEN completion_score := completion_score + 10; END IF;
  
  -- Profile is considered "complete" at 95% (needs core + wallet + avatar)
  is_complete := completion_score >= 95;
  
  -- Check if bonus was already awarded
  SELECT EXISTS(
    SELECT 1 FROM public.nctr_transactions 
    WHERE user_id = p_user_id 
    AND earning_source = 'profile_completion'
    AND status = 'completed'
  ) INTO bonus_awarded;
  
  RETURN jsonb_build_object(
    'completion_score', completion_score,
    'completion_details', completion_details,
    'is_complete', is_complete,
    'bonus_awarded', bonus_awarded,
    'eligible_for_bonus', is_complete AND NOT bonus_awarded
  );
END;
$$;

-- Create function to award profile completion bonus
CREATE OR REPLACE FUNCTION public.award_profile_completion_bonus(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  completion_data jsonb;
  bonus_amount numeric := 500.00; -- 500 NCTR bonus
  lock_id uuid;
BEGIN
  -- Check completion status
  SELECT public.calculate_profile_completion(p_user_id) INTO completion_data;
  
  -- Verify user is eligible for bonus
  IF NOT (completion_data->>'eligible_for_bonus')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not eligible for profile completion bonus',
      'completion_data', completion_data
    );
  END IF;
  
  -- Update total_earned in portfolio
  UPDATE public.nctr_portfolio
  SET total_earned = total_earned + bonus_amount,
      available_nctr = available_nctr + bonus_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    p_user_id,
    'earned',
    bonus_amount,
    'Profile completion bonus (500 NCTR)',
    'profile_completion',
    'completed'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'bonus_amount', bonus_amount,
    'completion_score', completion_data->>'completion_score',
    'message', 'Profile completion bonus awarded successfully!'
  );
END;
$$;

-- Create trigger function to check for profile completion on profile updates
CREATE OR REPLACE FUNCTION public.check_profile_completion_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  completion_result jsonb;
BEGIN
  -- Check if profile is now complete and award bonus if eligible
  SELECT public.calculate_profile_completion(NEW.user_id) INTO completion_result;
  
  IF (completion_result->>'eligible_for_bonus')::boolean THEN
    PERFORM public.award_profile_completion_bonus(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table to automatically check for completion
CREATE TRIGGER trigger_check_profile_completion
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_completion_bonus();
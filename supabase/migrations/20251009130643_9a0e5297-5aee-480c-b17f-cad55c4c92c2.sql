-- Fix referral bonus trigger to work on both INSERT and UPDATE
-- This ensures new users get credited when they complete their profile during signup

-- First, let's update the function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.trigger_referral_reward_on_profile_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_completion_data jsonb;
  v_referral_result jsonb;
BEGIN
  -- Check if profile is now complete
  SELECT public.calculate_profile_completion(NEW.user_id) INTO v_completion_data;
  
  -- If profile is complete, process any pending referrals
  IF (v_completion_data->>'is_complete')::boolean THEN
    SELECT public.process_completed_referral(NEW.user_id) INTO v_referral_result;
    
    -- Log the result for debugging
    RAISE NOTICE 'Referral processed for user %: %', NEW.user_id, v_referral_result;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS auto_credit_referral_on_profile_complete ON public.profiles;

-- Recreate trigger - simpler version that works on both INSERT and UPDATE
CREATE TRIGGER auto_credit_referral_on_profile_complete
  AFTER INSERT OR UPDATE OF full_name, username, email, avatar_url, wallet_address ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_referral_reward_on_profile_complete();

-- Now manually process all pending referrals for users who already have complete profiles
DO $$
DECLARE
  v_result jsonb;
  v_user record;
BEGIN
  -- Find all users with uncredited referrals who have complete profiles
  FOR v_user IN
    SELECT DISTINCT
      r.referred_user_id,
      p.full_name
    FROM referrals r
    JOIN profiles p ON r.referred_user_id = p.user_id
    WHERE r.status = 'completed'
    AND r.reward_credited = false
    AND p.full_name IS NOT NULL
    AND p.email IS NOT NULL
  LOOP
    BEGIN
      -- Process the referral bonus
      SELECT process_completed_referral(v_user.referred_user_id) INTO v_result;
      
      RAISE NOTICE 'Processed referral for % (user_id: %): %', 
        v_user.full_name, 
        v_user.referred_user_id, 
        v_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing referral for %: %', v_user.full_name, SQLERRM;
    END;
  END LOOP;
END $$;
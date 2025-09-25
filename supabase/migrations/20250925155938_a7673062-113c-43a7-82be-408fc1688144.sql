-- Fix referrals table security vulnerability
-- Drop the insecure INSERT policy that allows anyone to create referrals
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

-- Create a secure INSERT policy for referrals
CREATE POLICY "Authenticated users can create legitimate referrals only"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  -- Must be the referrer creating their own referral
  AND auth.uid() = referrer_user_id
  -- Cannot refer themselves
  AND auth.uid() != referred_user_id
  -- Must have a valid referral code
  AND referral_code IS NOT NULL 
  AND LENGTH(TRIM(referral_code)) > 0
  -- Must have a valid referred user
  AND referred_user_id IS NOT NULL
  -- Status must be pending for new referrals
  AND status = 'pending'
  -- Reward should not be credited yet
  AND reward_credited = false
);

-- Add monitoring trigger for referral creation attempts
CREATE OR REPLACE FUNCTION public.monitor_referral_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log referral creation for security monitoring
  PERFORM public.log_sensitive_access(
    'referral_created',
    'referrals',
    NEW.id,
    'medium'
  );
  
  -- Additional validation: Check if referred user exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.referred_user_id
  ) THEN
    RAISE EXCEPTION 'Referred user does not exist';
  END IF;
  
  -- Check for duplicate referrals
  IF EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrer_user_id = NEW.referrer_user_id 
    AND referred_user_id = NEW.referred_user_id
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Referral already exists for this user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the monitoring trigger
DROP TRIGGER IF EXISTS referral_creation_monitor ON public.referrals;
CREATE TRIGGER referral_creation_monitor
  BEFORE INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_referral_creation();
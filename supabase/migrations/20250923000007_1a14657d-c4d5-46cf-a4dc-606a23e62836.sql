-- Create referrals table to track referral relationships
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, rewarded
  reward_credited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rewarded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_user_id) -- Each user can only be referred once
);

-- Create index for better performance
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can create referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (true); -- Allow anyone to create referrals during signup

-- Function to process referral rewards
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referral_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referral_record RECORD;
  referrer_reward NUMERIC := 50.00; -- NCTR reward for referrer
  referee_reward NUMERIC := 50.00;  -- NCTR reward for new user
  referrer_lock_id UUID;
  referee_lock_id UUID;
BEGIN
  -- Get referral details
  SELECT * INTO referral_record
  FROM public.referrals
  WHERE id = p_referral_id AND status = 'completed' AND reward_credited = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral not found or already processed');
  END IF;
  
  -- Credit referrer with 50 NCTR in 360LOCK
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr + referrer_reward,
      total_earned = total_earned + referrer_reward,
      updated_at = now()
  WHERE user_id = referral_record.referrer_user_id;
  
  -- Credit referee with 50 NCTR in 360LOCK  
  UPDATE public.nctr_portfolio
  SET available_nctr = available_nctr + referee_reward,
      total_earned = total_earned + referee_reward,
      updated_at = now()
  WHERE user_id = referral_record.referred_user_id;
  
  -- Auto-lock referrer's reward in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    referral_record.referrer_user_id,
    referrer_reward,
    'referral',
    'invite'
  ) INTO referrer_lock_id;
  
  -- Auto-lock referee's reward in 360LOCK
  SELECT public.auto_lock_earned_nctr(
    referral_record.referred_user_id,
    referee_reward,
    'referral_signup',
    'invite'
  ) INTO referee_lock_id;
  
  -- Record referrer transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    referral_record.referrer_user_id,
    'earned',
    referrer_reward,
    'Referral reward for inviting new user',
    'referral',
    'completed'
  );
  
  -- Record referee transaction
  INSERT INTO public.nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    earning_source,
    status
  ) VALUES (
    referral_record.referred_user_id,
    'earned',
    referee_reward,
    'Welcome bonus for joining via referral',
    'referral_signup',
    'completed'
  );
  
  -- Mark referral as rewarded
  UPDATE public.referrals
  SET reward_credited = true,
      rewarded_at = now()
  WHERE id = p_referral_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'referrer_reward', referrer_reward,
    'referee_reward', referee_reward,
    'referrer_lock_id', referrer_lock_id,
    'referee_lock_id', referee_lock_id
  );
END;
$$;

-- Function to create referral when user signs up
CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  referral_code TEXT;
  referrer_id UUID;
  new_referral_id UUID;
BEGIN
  -- Check if there's a referral code in user metadata
  referral_code := NEW.raw_user_meta_data ->> 'referral_code';
  
  IF referral_code IS NOT NULL THEN
    -- Find referrer by code (first 8 chars of their user ID)
    SELECT id INTO referrer_id
    FROM auth.users
    WHERE UPPER(SUBSTRING(id::text, 1, 8)) = UPPER(referral_code)
    AND id != NEW.id -- Don't allow self-referral
    LIMIT 1;
    
    IF referrer_id IS NOT NULL THEN
      -- Create referral record
      INSERT INTO public.referrals (
        referrer_user_id,
        referred_user_id,
        referral_code,
        status
      ) VALUES (
        referrer_id,
        NEW.id,
        referral_code,
        'completed'
      ) RETURNING id INTO new_referral_id;
      
      -- Process rewards after a short delay to ensure user profile is created
      PERFORM public.process_referral_reward(new_referral_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to handle referrals on user signup
CREATE TRIGGER on_auth_user_referral_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_referral_signup();
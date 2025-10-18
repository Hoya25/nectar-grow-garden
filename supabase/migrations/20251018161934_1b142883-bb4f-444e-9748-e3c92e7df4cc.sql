-- Create table to track user daily check-in streaks
CREATE TABLE IF NOT EXISTS public.daily_checkin_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  streak_bonuses_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.daily_checkin_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak
CREATE POLICY "Users can view their own streak"
ON public.daily_checkin_streaks
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own streak
CREATE POLICY "Users can create their own streak"
ON public.daily_checkin_streaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own streak
CREATE POLICY "Users can update their own streak"
ON public.daily_checkin_streaks
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all streaks
CREATE POLICY "Admins can view all streaks"
ON public.daily_checkin_streaks
FOR SELECT
USING (is_admin());

-- Create index for performance
CREATE INDEX idx_daily_checkin_streaks_user_id ON public.daily_checkin_streaks(user_id);
CREATE INDEX idx_daily_checkin_streaks_last_checkin ON public.daily_checkin_streaks(last_checkin_date);

-- Insert default streak configuration into site_settings
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES (
  'daily_checkin_streak_config',
  jsonb_build_object(
    'enabled', true,
    'streak_requirement', 7,
    'bonus_nctr_amount', 50,
    'bonus_lock_type', '360LOCK',
    'streak_bonus_description', 'Check in for 7 days in a row to earn 50 NCTR in 360LOCK!'
  ),
  'Configuration for daily check-in streak bonuses'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Update process_daily_checkin function to handle streaks
CREATE OR REPLACE FUNCTION public.process_daily_checkin_with_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_opportunity RECORD;
  v_reward_amount NUMERIC;
  v_multiplied_amount NUMERIC;
  v_available_reward NUMERIC := 0;
  v_lock_90_reward NUMERIC := 0;
  v_lock_360_reward NUMERIC := 0;
  v_lock_id UUID;
  v_streak_record RECORD;
  v_streak_config JSONB;
  v_streak_bonus_awarded BOOLEAN := false;
  v_streak_bonus_amount NUMERIC := 0;
  v_streak_bonus_lock_id UUID;
  v_new_streak INTEGER := 0;
BEGIN
  -- Check if daily checkin is available
  IF NOT public.is_daily_checkin_available(p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily checkin already claimed today. Come back tomorrow!'
    );  
  END IF;
  
  -- Get the daily check-in opportunity configuration
  SELECT 
    available_nctr_reward,
    lock_90_nctr_reward,
    lock_360_nctr_reward,
    reward_distribution_type
  INTO daily_opportunity
  FROM public.earning_opportunities 
  WHERE opportunity_type = 'daily_checkin' 
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily check-in is not currently available. Please contact support.'
    );
  END IF;

  -- Calculate rewards based on admin configuration
  IF daily_opportunity.reward_distribution_type = 'available' THEN
    v_available_reward := COALESCE(daily_opportunity.available_nctr_reward, 0);
  ELSIF daily_opportunity.reward_distribution_type = 'lock_90' THEN
    v_lock_90_reward := COALESCE(daily_opportunity.lock_90_nctr_reward, 0);
  ELSIF daily_opportunity.reward_distribution_type = 'lock_360' THEN
    v_lock_360_reward := COALESCE(daily_opportunity.lock_360_nctr_reward, 0);
  ELSIF daily_opportunity.reward_distribution_type = 'combined' THEN
    v_available_reward := COALESCE(daily_opportunity.available_nctr_reward, 0);
    v_lock_90_reward := COALESCE(daily_opportunity.lock_90_nctr_reward, 0);
    v_lock_360_reward := COALESCE(daily_opportunity.lock_360_nctr_reward, 0);
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily check-in reward distribution is not configured. Please contact admin.'
    );
  END IF;

  v_reward_amount := v_available_reward + v_lock_90_reward + v_lock_360_reward;

  IF v_reward_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily check-in reward amounts are not configured. Please contact admin.'
    );
  END IF;

  -- Process streak logic
  -- Get streak configuration
  SELECT setting_value INTO v_streak_config
  FROM public.site_settings
  WHERE setting_key = 'daily_checkin_streak_config';

  -- Get or create user's streak record
  SELECT * INTO v_streak_record
  FROM public.daily_checkin_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create new streak record
    INSERT INTO public.daily_checkin_streaks (user_id, current_streak, longest_streak, last_checkin_date, total_checkins)
    VALUES (p_user_id, 1, 1, CURRENT_DATE, 1)
    RETURNING * INTO v_streak_record;
    v_new_streak := 1;
  ELSE
    -- Update existing streak
    IF v_streak_record.last_checkin_date = CURRENT_DATE - 1 THEN
      -- Consecutive day - increment streak
      v_new_streak := v_streak_record.current_streak + 1;
      
      UPDATE public.daily_checkin_streaks
      SET current_streak = v_new_streak,
          longest_streak = GREATEST(longest_streak, v_new_streak),
          last_checkin_date = CURRENT_DATE,
          total_checkins = total_checkins + 1,
          updated_at = now()
      WHERE user_id = p_user_id;
      
    ELSIF v_streak_record.last_checkin_date < CURRENT_DATE - 1 THEN
      -- Streak broken - reset to 1
      v_new_streak := 1;
      
      UPDATE public.daily_checkin_streaks
      SET current_streak = 1,
          last_checkin_date = CURRENT_DATE,
          total_checkins = total_checkins + 1,
          updated_at = now()
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  -- Check if streak bonus should be awarded
  IF (v_streak_config->>'enabled')::boolean THEN
    IF v_new_streak >= (v_streak_config->>'streak_requirement')::integer 
       AND v_new_streak % (v_streak_config->>'streak_requirement')::integer = 0 THEN
      v_streak_bonus_awarded := true;
      v_streak_bonus_amount := (v_streak_config->>'bonus_nctr_amount')::numeric;
      
      -- Apply multiplier to streak bonus
      v_streak_bonus_amount := public.apply_reward_multiplier(p_user_id, v_streak_bonus_amount);
      
      -- Auto-lock the streak bonus in 360LOCK
      SELECT public.auto_lock_earned_nctr(
        p_user_id,
        v_streak_bonus_amount,
        'daily_checkin_streak',
        'bonus'
      ) INTO v_streak_bonus_lock_id;
      
      -- Update total earned
      UPDATE public.nctr_portfolio
      SET total_earned = total_earned + v_streak_bonus_amount,
          updated_at = now()
      WHERE user_id = p_user_id;
      
      -- Record streak bonus transaction
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
        v_streak_bonus_amount,
        format('🔥 %s-day streak bonus! (%s NCTR locked in 360LOCK)', 
          v_new_streak, v_streak_bonus_amount),
        'daily_checkin_streak',
        'completed'
      );
      
      -- Update streak bonuses counter
      UPDATE public.daily_checkin_streaks
      SET streak_bonuses_earned = streak_bonuses_earned + 1
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  -- Process regular daily check-in rewards (existing logic)
  IF v_available_reward > 0 THEN
    v_multiplied_amount := public.apply_reward_multiplier(p_user_id, v_available_reward);
    
    UPDATE public.nctr_portfolio
    SET available_nctr = available_nctr + v_multiplied_amount,
        total_earned = total_earned + v_multiplied_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
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
      v_multiplied_amount,
      'Daily check-in bonus (available in wallet)',
      'daily_checkin',
      'completed'
    );
  END IF;

  IF v_lock_90_reward > 0 THEN
    SELECT public.auto_lock_earned_nctr(
      p_user_id,
      v_lock_90_reward,
      'daily_checkin',
      'bonus'
    ) INTO v_lock_id;
    
    UPDATE public.nctr_portfolio
    SET total_earned = total_earned + public.apply_reward_multiplier(p_user_id, v_lock_90_reward),
        updated_at = now()
    WHERE user_id = p_user_id;
    
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
      public.apply_reward_multiplier(p_user_id, v_lock_90_reward),
      'Daily check-in bonus (90LOCK)',
      'daily_checkin',
      'completed'
    );
  END IF;

  IF v_lock_360_reward > 0 THEN
    SELECT public.auto_lock_earned_nctr(
      p_user_id,
      v_lock_360_reward,
      'daily_checkin',
      'bonus'
    ) INTO v_lock_id;
    
    UPDATE public.nctr_portfolio
    SET total_earned = total_earned + public.apply_reward_multiplier(p_user_id, v_lock_360_reward),
        updated_at = now()
    WHERE user_id = p_user_id;
    
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
      public.apply_reward_multiplier(p_user_id, v_lock_360_reward),
      'Daily check-in bonus (360LOCK)',
      'daily_checkin',
      'completed'
    );
  END IF;

  v_multiplied_amount := public.apply_reward_multiplier(p_user_id, v_reward_amount);
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_amount', v_multiplied_amount,
    'base_amount', v_reward_amount,
    'multiplier', (v_multiplied_amount / v_reward_amount),
    'distribution', jsonb_build_object(
      'available', v_available_reward,
      'lock_90', v_lock_90_reward,
      'lock_360', v_lock_360_reward
    ),
    'streak', jsonb_build_object(
      'current_streak', v_new_streak,
      'streak_bonus_awarded', v_streak_bonus_awarded,
      'streak_bonus_amount', v_streak_bonus_amount,
      'next_bonus_in', (v_streak_config->>'streak_requirement')::integer - (v_new_streak % (v_streak_config->>'streak_requirement')::integer)
    ),
    'message', CASE 
      WHEN v_streak_bonus_awarded THEN 
        format('🔥 %s-day streak! Daily bonus earned + %s NCTR streak bonus!', v_new_streak, v_streak_bonus_amount)
      ELSE 
        'Daily check-in bonus earned! Come back tomorrow for more.'
    END
  );
END;
$$;
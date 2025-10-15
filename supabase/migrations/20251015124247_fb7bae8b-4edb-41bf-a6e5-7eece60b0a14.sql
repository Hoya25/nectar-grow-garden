-- Create learning modules table for educational content
CREATE TABLE public.learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video', -- video, article, interactive
  video_url TEXT,
  article_content TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  nctr_reward NUMERIC DEFAULT 0,
  lock_type TEXT DEFAULT '90LOCK', -- 90LOCK or 360LOCK
  difficulty_level TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced
  category TEXT DEFAULT 'general', -- trading, defi, basics, etc.
  is_active BOOLEAN DEFAULT true,
  requires_quiz BOOLEAN DEFAULT true,
  min_quiz_score INTEGER DEFAULT 70, -- minimum score to pass
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice, true_false
  options JSONB NOT NULL, -- array of answer options
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user progress tracking table
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
  content_viewed BOOLEAN DEFAULT false,
  quiz_passed BOOLEAN DEFAULT false,
  quiz_score INTEGER,
  reward_claimed BOOLEAN DEFAULT false,
  reward_amount NUMERIC DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN DEFAULT false,
  answers JSONB, -- stores user answers for review
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_modules
CREATE POLICY "Authenticated users can view active modules"
  ON public.learning_modules FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage modules"
  ON public.learning_modules FOR ALL
  USING (is_admin());

-- RLS Policies for quiz_questions
CREATE POLICY "Users can view questions for active modules"
  ON public.quiz_questions FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.learning_modules
      WHERE id = quiz_questions.module_id AND is_active = true
    )
  );

CREATE POLICY "Admins can manage questions"
  ON public.quiz_questions FOR ALL
  USING (is_admin());

-- RLS Policies for learning_progress
CREATE POLICY "Users can view their own progress"
  ON public.learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
  ON public.learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.learning_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.learning_progress FOR SELECT
  USING (is_admin());

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view their own attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON public.quiz_attempts FOR SELECT
  USING (is_admin());

-- Function to process quiz completion and award NCTR
CREATE OR REPLACE FUNCTION public.process_quiz_completion(
  p_user_id UUID,
  p_module_id UUID,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_record RECORD;
  passed BOOLEAN;
  attempt_count INTEGER;
  lock_id UUID;
  multiplied_amount NUMERIC;
  result JSONB;
BEGIN
  -- Get module details
  SELECT * INTO module_record
  FROM public.learning_modules
  WHERE id = p_module_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Module not found or inactive'
    );
  END IF;

  -- Calculate if passed
  passed := (p_score * 100 / p_total_questions) >= module_record.min_quiz_score;

  -- Get attempt count
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO attempt_count
  FROM public.quiz_attempts
  WHERE user_id = p_user_id AND module_id = p_module_id;

  -- Record quiz attempt
  INSERT INTO public.quiz_attempts (
    user_id,
    module_id,
    score,
    total_questions,
    passed,
    answers,
    attempt_number
  ) VALUES (
    p_user_id,
    p_module_id,
    p_score,
    p_total_questions,
    passed,
    p_answers,
    attempt_count
  );

  -- Update learning progress
  INSERT INTO public.learning_progress (
    user_id,
    module_id,
    status,
    content_viewed,
    quiz_passed,
    quiz_score,
    completed_at
  ) VALUES (
    p_user_id,
    p_module_id,
    CASE WHEN passed THEN 'completed' ELSE 'in_progress' END,
    true,
    passed,
    p_score,
    CASE WHEN passed THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    quiz_passed = passed,
    quiz_score = p_score,
    status = CASE WHEN passed THEN 'completed' ELSE 'in_progress' END,
    completed_at = CASE WHEN passed THEN now() ELSE learning_progress.completed_at END,
    updated_at = now();

  -- If passed and reward not claimed, award NCTR
  IF passed AND module_record.nctr_reward > 0 THEN
    -- Check if already claimed
    IF EXISTS (
      SELECT 1 FROM public.learning_progress
      WHERE user_id = p_user_id 
        AND module_id = p_module_id 
        AND reward_claimed = true
    ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'passed', passed,
        'score', p_score,
        'reward_already_claimed', true
      );
    END IF;

    -- Apply reward multiplier
    multiplied_amount := public.apply_reward_multiplier(p_user_id, module_record.nctr_reward);

    -- Update portfolio
    UPDATE public.nctr_portfolio
    SET total_earned = total_earned + multiplied_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Auto-lock the reward
    SELECT public.auto_lock_earned_nctr(
      p_user_id,
      module_record.nctr_reward,
      'learn_and_earn',
      'bonus'
    ) INTO lock_id;

    -- Record transaction
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
      multiplied_amount,
      'Learn & Earn: ' || module_record.title || ' (' || module_record.lock_type || ')',
      'learn_and_earn',
      'completed'
    );

    -- Mark reward as claimed
    UPDATE public.learning_progress
    SET reward_claimed = true,
        reward_amount = multiplied_amount
    WHERE user_id = p_user_id AND module_id = p_module_id;

    result := jsonb_build_object(
      'success', true,
      'passed', passed,
      'score', p_score,
      'reward_amount', multiplied_amount,
      'lock_type', module_record.lock_type,
      'lock_id', lock_id
    );
  ELSE
    result := jsonb_build_object(
      'success', true,
      'passed', passed,
      'score', p_score,
      'message', CASE 
        WHEN NOT passed THEN 'Keep trying! You need ' || module_record.min_quiz_score || '% to pass.'
        ELSE 'Module completed!'
      END
    );
  END IF;

  RETURN result;
END;
$$;

-- Insert some sample learning modules
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  video_url,
  thumbnail_url,
  duration_minutes,
  nctr_reward,
  lock_type,
  difficulty_level,
  category,
  min_quiz_score,
  display_order
) VALUES
(
  'Welcome to The Garden',
  'Learn the basics of The Garden ecosystem, NCTR tokens, and how to maximize your rewards.',
  'video',
  'https://example.com/welcome-video',
  NULL,
  5,
  100,
  '90LOCK',
  'beginner',
  'basics',
  70,
  1
),
(
  'Understanding Alliance Tokens',
  'Deep dive into Alliance Tokens - what they are, how you earn them, and their benefits.',
  'video',
  'https://example.com/alliance-tokens-video',
  NULL,
  8,
  150,
  '90LOCK',
  'intermediate',
  'rewards',
  75,
  2
),
(
  'Referral System Mastery',
  'Learn how to maximize earnings through The Garden''s referral program and invite rewards.',
  'video',
  'https://example.com/referral-video',
  NULL,
  6,
  200,
  '360LOCK',
  'intermediate',
  'growth',
  80,
  3
);

-- Insert sample quiz questions for the first module
INSERT INTO public.quiz_questions (
  module_id,
  question_text,
  question_type,
  options,
  correct_answer,
  explanation,
  display_order
) VALUES
(
  (SELECT id FROM public.learning_modules WHERE title = 'Welcome to The Garden' LIMIT 1),
  'What is NCTR?',
  'multiple_choice',
  '["The Garden''s reward token", "A cryptocurrency exchange", "A social media platform", "A gaming token"]'::jsonb,
  'The Garden''s reward token',
  'NCTR is The Garden''s native reward token that you earn through various activities.',
  1
),
(
  (SELECT id FROM public.learning_modules WHERE title = 'Welcome to The Garden' LIMIT 1),
  'How long are rewards locked in a 90LOCK?',
  'multiple_choice',
  '["30 days", "60 days", "90 days", "180 days"]'::jsonb,
  '90 days',
  '90LOCK rewards are locked for 90 days to encourage long-term holding.',
  2
),
(
  (SELECT id FROM public.learning_modules WHERE title = 'Welcome to The Garden' LIMIT 1),
  'Can you upgrade a 90LOCK to a 360LOCK?',
  'true_false',
  '["True", "False"]'::jsonb,
  'True',
  'Yes! You can upgrade your 90LOCK rewards to 360LOCK for enhanced benefits.',
  3
);
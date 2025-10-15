-- Insert Learn and Earn modules from PDF

-- Module 1: Welcome to The Garden
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  category,
  difficulty_level,
  duration_minutes,
  nctr_reward,
  lock_type,
  is_active,
  requires_quiz,
  min_quiz_score,
  display_order
) VALUES (
  'Welcome to The Garden',
  'The Garden is your opportunity hub. Do everyday actions, unlock quests, and earn NCTR without buying anything first. NCTR is used for access, status, and benefits across the Alliance. Hit your first earn fast, then keep a weekly streak to grow your status. Some rewards use 90LOCK, which simply means a payout is held for 90 days to keep things fair and reduce abuse.',
  'article',
  'basics',
  'beginner',
  5,
  100,
  '90LOCK',
  true,
  true,
  75,
  0
);

-- Get the module ID for quiz questions
DO $$
DECLARE
  v_module_id uuid;
BEGIN
  SELECT id INTO v_module_id FROM public.learning_modules WHERE title = 'Welcome to The Garden';
  
  -- Quiz questions for Module 1
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, options, correct_answer, explanation, display_order) VALUES
  (v_module_id, 'What''s the fastest way to get started in The Garden?', 'multiple_choice', 
   '["Buy as much NCTR as possible", "Complete a first-earn quest", "Wait for an airdrop", "DM support"]'::jsonb,
   'Complete a first-earn quest', 'Earn-first is the goal.', 0),
  
  (v_module_id, 'What does 90LOCK mean?', 'multiple_choice',
   '["Tokens can never move", "A 90-day hold before a reward unlocks", "A limit on wallet size", "A trading fee"]'::jsonb,
   'A 90-day hold before a reward unlocks', 'A time-based unlock for certain rewards.', 1),
  
  (v_module_id, 'The Garden primarily helps you:', 'multiple_choice',
   '["Predict prices", "Earn access and status through actions", "Short the market", "Mine blocks"]'::jsonb,
   'Earn access and status through actions', 'Consumptive benefits, not profit promises.', 2),
  
  (v_module_id, 'Weekly streaks matter because they:', 'multiple_choice',
   '["Increase odds of speculation", "Boost engagement and can unlock more perks", "Disable earning", "Delete quests"]'::jsonb,
   'Boost engagement and can unlock more perks', 'Streaks = more consistent perks.', 3);
END $$;

-- Module 2: Understanding Alliance Tokens
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  category,
  difficulty_level,
  duration_minutes,
  nctr_reward,
  lock_type,
  is_active,
  requires_quiz,
  min_quiz_score,
  display_order
) VALUES (
  'Understanding Alliance Tokens',
  'Alliance tokens are utility tokens used across participating partners. Think of them like keys for access, status, and reward baskets. You can earn them in The Garden and optionally acquire more via compliant checkout. Holding can unlock tiers and event perks. Verified contracts and transparent distribution keep things clear. Avoid financial framing: the focus is what you can do with the token, not price talk.',
  'article',
  'basics',
  'beginner',
  7,
  150,
  '90LOCK',
  true,
  true,
  75,
  1
);

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  SELECT id INTO v_module_id FROM public.learning_modules WHERE title = 'Understanding Alliance Tokens';
  
  -- Quiz questions for Module 2
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, options, correct_answer, explanation, display_order) VALUES
  (v_module_id, 'The primary role of the Alliance token is to provide:', 'multiple_choice',
   '["Investment returns", "Access, status, and utility across partners", "Mining rewards", "Loan collateral"]'::jsonb,
   'Access, status, and utility across partners', 'It''s about utility.', 0),
  
  (v_module_id, 'Earn-first posture means:', 'multiple_choice',
   '["Users must trade before they can participate", "Users can get tokens by completing actions before considering purchase", "Price speculation is required", "Tokens are a savings account"]'::jsonb,
   'Users can get tokens by completing actions before considering purchase', 'Actions before purchase.', 1),
  
  (v_module_id, 'Which statement fits compliance guardrails?', 'multiple_choice',
   '["Buy now for profit", "Guaranteed APY", "Use tokens to access perks and partner rewards", "Number go up"]'::jsonb,
   'Use tokens to access perks and partner rewards', 'Describes consumptive use.', 2),
  
  (v_module_id, 'Why are verified contracts and distribution transparency important?', 'multiple_choice',
   '["They guarantee profits", "They help users trust how tokens are issued and used", "They enable unlimited minting without notice", "They remove all risk"]'::jsonb,
   'They help users trust how tokens are issued and used', 'For clarity and trust, not profit guarantees.', 3),
  
  (v_module_id, 'What''s a "basket" in this context?', 'multiple_choice',
   '["A meme", "A grouped set of partner rewards or offers", "A mining pool", "A leverage tool"]'::jsonb,
   'A grouped set of partner rewards or offers', 'Bundled perks or offers.', 4);
END $$;

-- Module 3: Referral System Mastery
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  category,
  difficulty_level,
  duration_minutes,
  nctr_reward,
  lock_type,
  is_active,
  requires_quiz,
  min_quiz_score,
  display_order
) VALUES (
  'Referral System Mastery',
  'Invite friends to The Garden and earn NCTR when they complete eligible actions. Quality beats quantity: real participants trigger rewards. Some referral rewards may use 360LOCK to signal long-term alignment and unlock higher-tier perks. Share clearly. No price claims. Focus on benefits and how to earn responsibly.',
  'article',
  'referrals',
  'intermediate',
  6,
  200,
  '360LOCK',
  true,
  true,
  75,
  2
);

DO $$
DECLARE
  v_module_id uuid;
BEGIN
  SELECT id INTO v_module_id FROM public.learning_modules WHERE title = 'Referral System Mastery';
  
  -- Quiz questions for Module 3
  INSERT INTO public.quiz_questions (module_id, question_text, question_type, options, correct_answer, explanation, display_order) VALUES
  (v_module_id, 'The best referral strategy is to:', 'multiple_choice',
   '["Blast random links everywhere", "Promise profits to anyone who clicks", "Invite people who will actually complete actions", "Create multiple accounts yourself"]'::jsonb,
   'Invite people who will actually complete actions', 'Quality referrals = real engagement.', 0),
  
  (v_module_id, 'What does 360LOCK communicate?', 'multiple_choice',
   '["A forever lock with no purpose", "Long-term alignment for higher-tier benefits", "Instant sell pressure", "Unlimited referrals"]'::jsonb,
   'Long-term alignment for higher-tier benefits', 'Signals alignment and unlocks deeper perks.', 1),
  
  (v_module_id, 'Which message is compliant and effective?', 'multiple_choice',
   '["Guaranteed profit if you join now", "Complete your first quest in The Garden to unlock perks", "This token is going to the moon", "Use leverage with your rewards"]'::jsonb,
   'Complete your first quest in The Garden to unlock perks', 'Focus on actions and perks, not ROI.', 2),
  
  (v_module_id, 'When do referral rewards typically trigger?', 'multiple_choice',
   '["Immediately on click", "When referred users complete eligible actions", "Only after price rises", "Never"]'::jsonb,
   'When referred users complete eligible actions', 'Action-based triggers.', 3),
  
  (v_module_id, 'If a reward shows a time-based lock, you should:', 'multiple_choice',
   '["Hide it", "Misstate the timeline", "Explain the hold clearly and how to unlock", "Promise it will be removed"]'::jsonb,
   'Explain the hold clearly and how to unlock', 'Clear disclosure builds trust.', 4);
END $$;
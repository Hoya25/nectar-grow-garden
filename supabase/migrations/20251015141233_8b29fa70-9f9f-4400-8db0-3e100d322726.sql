-- Insert Learning Module 1: Welcome to The Garden
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  article_content,
  nctr_reward,
  lock_type,
  difficulty_level,
  category,
  duration_minutes,
  requires_quiz,
  min_quiz_score,
  display_order,
  is_active
) VALUES (
  'Welcome to The Garden',
  'Quick explainer on how The Garden works and how to earn NCTR through everyday actions',
  'article',
  E'# Welcome to The Garden\n\n## Quick explainer\n\nThe Garden is your opportunity hub. Do everyday actions, unlock quests, and earn NCTR without buying anything first.\n\nNCTR is used for access, status, and benefits across the Alliance.\n\nHit your first earn fast, then keep a weekly streak to grow your status.\n\nSome rewards use 90LOCK, which simply means a payout is held for 90 days to keep things fair and reduce abuse.',
  100,
  '90LOCK',
  'beginner',
  'general',
  5,
  true,
  75,
  1,
  true
);

-- Insert quiz questions for Module 1
WITH module AS (
  SELECT id FROM public.learning_modules WHERE title = 'Welcome to The Garden' LIMIT 1
)
INSERT INTO public.quiz_questions (module_id, question_text, question_type, options, correct_answer, explanation, display_order)
SELECT 
  module.id,
  'What''s the fastest way to get started in The Garden?',
  'multiple_choice',
  '["Buy as much NCTR as possible", "Complete a first-earn quest", "Wait for an airdrop", "DM support"]'::jsonb,
  'Complete a first-earn quest',
  'Earn-first is the goal. You can start earning NCTR without buying anything first.',
  1
FROM module
UNION ALL
SELECT 
  module.id,
  'What does 90LOCK mean?',
  'multiple_choice',
  '["Tokens can never move", "A 90-day hold before a reward unlocks", "A limit on wallet size", "A trading fee"]'::jsonb,
  'A 90-day hold before a reward unlocks',
  'A time-based unlock for certain rewards to keep things fair and reduce abuse.',
  2
FROM module
UNION ALL
SELECT 
  module.id,
  'The Garden primarily helps you:',
  'multiple_choice',
  '["Predict prices", "Earn access and status through actions", "Short the market", "Mine blocks"]'::jsonb,
  'Earn access and status through actions',
  'Consumptive benefits, not profit promises. Focus is on utility and access.',
  3
FROM module
UNION ALL
SELECT 
  module.id,
  'Weekly streaks matter because they:',
  'multiple_choice',
  '["Increase odds of speculation", "Boost engagement and can unlock more perks", "Disable earning", "Delete quests"]'::jsonb,
  'Boost engagement and can unlock more perks',
  'Streaks = more consistent perks and better status progression.',
  4
FROM module;

-- Insert Learning Module 2: Understanding Alliance Tokens
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  article_content,
  nctr_reward,
  lock_type,
  difficulty_level,
  category,
  duration_minutes,
  requires_quiz,
  min_quiz_score,
  display_order,
  is_active
) VALUES (
  'Understanding Alliance Tokens',
  'Learn about Alliance tokens, their utility, and how they work across participating partners',
  'article',
  E'# Understanding Alliance Tokens\n\n## Quick explainer\n\n"Alliance tokens" are utility tokens used across participating partners. Think of them like keys for access, status, and reward baskets.\n\nYou can earn them in The Garden and optionally acquire more via compliant checkout.\n\nHolding can unlock tiers and event perks. Verified contracts and transparent distribution keep things clear.\n\nAvoid financial framing: the focus is what you can do with the token, not price talk.',
  150,
  '90LOCK',
  'beginner',
  'general',
  8,
  true,
  75,
  2,
  true
);

-- Insert quiz questions for Module 2
WITH module AS (
  SELECT id FROM public.learning_modules WHERE title = 'Understanding Alliance Tokens' LIMIT 1
)
INSERT INTO public.quiz_questions (module_id, question_text, question_type, options, correct_answer, explanation, display_order)
SELECT 
  module.id,
  'The primary role of the Alliance token is to provide:',
  'multiple_choice',
  '["Trading profits", "Utility for access, status, and rewards", "Mining power", "Governance votes"]'::jsonb,
  'Utility for access, status, and rewards',
  'It''s about utility, not speculation.',
  1
FROM module
UNION ALL
SELECT 
  module.id,
  '"Earn-first posture" means:',
  'multiple_choice',
  '["Users must trade before they can participate", "Users can get tokens by completing actions before considering purchase", "Price speculation is required", "Tokens are a savings account"]'::jsonb,
  'Users can get tokens by completing actions before considering purchase',
  'Actions before purchase - you earn first, buy optionally.',
  2
FROM module
UNION ALL
SELECT 
  module.id,
  'Which statement fits compliance guardrails?',
  'multiple_choice',
  '["Buy now for profit", "Guaranteed APY", "Use tokens to access perks and partner rewards", "Number go up"]'::jsonb,
  'Use tokens to access perks and partner rewards',
  'Describes consumptive use, not profit promises.',
  3
FROM module
UNION ALL
SELECT 
  module.id,
  'Why are verified contracts and distribution transparency important?',
  'multiple_choice',
  '["They guarantee profits", "They help users trust how tokens are issued and used", "They enable unlimited minting without notice", "They remove all risk"]'::jsonb,
  'They help users trust how tokens are issued and used',
  'For clarity and trust, not profit guarantees.',
  4
FROM module
UNION ALL
SELECT 
  module.id,
  'What''s a "basket" in this context?',
  'multiple_choice',
  '["A meme", "A grouped set of partner rewards or offers", "A mining pool", "A leverage tool"]'::jsonb,
  'A grouped set of partner rewards or offers',
  'Bundled perks or offers from partners.',
  5
FROM module;

-- Insert Learning Module 3: Referral System Mastery
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  article_content,
  nctr_reward,
  lock_type,
  difficulty_level,
  category,
  duration_minutes,
  requires_quiz,
  min_quiz_score,
  display_order,
  is_active
) VALUES (
  'Referral System Mastery',
  'Learn how to effectively invite friends and earn rewards through quality referrals',
  'article',
  E'# Referral System Mastery\n\n## Quick explainer\n\nInvite friends to The Garden and earn NCTR when they complete eligible actions.\n\nQuality beats quantity: real participants trigger rewards.\n\nSome referral rewards may use 360LOCK to signal long-term alignment and unlock higher-tier perks.\n\nShare clearly. No price claims. Focus on benefits and how to earn responsibly.',
  200,
  '360LOCK',
  'intermediate',
  'general',
  10,
  true,
  75,
  3,
  true
);

-- Insert quiz questions for Module 3
WITH module AS (
  SELECT id FROM public.learning_modules WHERE title = 'Referral System Mastery' LIMIT 1
)
INSERT INTO public.quiz_questions (module_id, question_text, question_type, options, correct_answer, explanation, display_order)
SELECT 
  module.id,
  'The best referral strategy is to:',
  'multiple_choice',
  '["Blast random links everywhere", "Promise profits to anyone who clicks", "Invite people who will actually complete actions", "Create multiple accounts yourself"]'::jsonb,
  'Invite people who will actually complete actions',
  'Quality beats quantity. Real participants trigger rewards.',
  1
FROM module
UNION ALL
SELECT 
  module.id,
  'What does 360LOCK communicate?',
  'multiple_choice',
  '["A forever lock with no purpose", "Long-term alignment and access to higher-tier perks", "A penalty system", "Instant withdrawal rights"]'::jsonb,
  'Long-term alignment and access to higher-tier perks',
  'Signals commitment and unlocks better benefits.',
  2
FROM module
UNION ALL
SELECT 
  module.id,
  'When sharing The Garden, you should focus on:',
  'multiple_choice',
  '["Price predictions", "How to earn and what perks are available", "Trading strategies", "Get rich quick promises"]'::jsonb,
  'How to earn and what perks are available',
  'Share benefits clearly, avoid financial framing.',
  3
FROM module
UNION ALL
SELECT 
  module.id,
  'Multi-account abuse is:',
  'multiple_choice',
  '["Encouraged for max rewards", "Against the rules and can result in bans", "A smart strategy", "Required for status"]'::jsonb,
  'Against the rules and can result in bans',
  'One real person, one account. Fraud kills trust.',
  4
FROM module;

-- Insert Learning Module 4: Status Tiers and Multipliers
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  article_content,
  nctr_reward,
  lock_type,
  difficulty_level,
  category,
  duration_minutes,
  requires_quiz,
  min_quiz_score,
  display_order,
  is_active
) VALUES (
  'Status Tiers and Multipliers',
  'Understand how status levels work and how to maximize your earning potential',
  'article',
  E'# Status Tiers and Multipliers\n\n## Quick explainer\n\nThe more NCTR you hold in 360LOCK, the higher your status tier.\n\nHigher tiers unlock reward multipliers, exclusive quests, and early access to new partners.\n\nMaintaining consistency matters more than one big action.\n\nStatus isn''t about wealth flex; it''s about engagement, trust, and unlocking better utility.',
  250,
  '360LOCK',
  'intermediate',
  'general',
  12,
  true,
  75,
  4,
  true
);

-- Insert quiz questions for Module 4
WITH module AS (
  SELECT id FROM public.learning_modules WHERE title = 'Status Tiers and Multipliers' LIMIT 1
)
INSERT INTO public.quiz_questions (module_id, question_text, question_type, options, correct_answer, explanation, display_order)
SELECT 
  module.id,
  'Status tiers are determined by:',
  'multiple_choice',
  '["How much you spend buying NCTR", "Your 360LOCK balance and engagement", "Random lottery", "Social media followers"]'::jsonb,
  'Your 360LOCK balance and engagement',
  'Holding in 360LOCK shows commitment and unlocks status.',
  1
FROM module
UNION ALL
SELECT 
  module.id,
  'A higher status tier gives you:',
  'multiple_choice',
  '["Guaranteed profits", "Better reward multipliers and exclusive quests", "Free money", "Trading signals"]'::jsonb,
  'Better reward multipliers and exclusive quests',
  'More utility and access, not profit guarantees.',
  2
FROM module
UNION ALL
SELECT 
  module.id,
  'Why does consistency matter for status?',
  'multiple_choice',
  '["It doesn''t", "Regular engagement signals reliability and unlocks perks", "Only big one-time actions count", "Streaks are just for show"]'::jsonb,
  'Regular engagement signals reliability and unlocks perks',
  'Steady participation beats sporadic big moves.',
  3
FROM module
UNION ALL
SELECT 
  module.id,
  'The purpose of status is to:',
  'multiple_choice',
  '["Show off wealth", "Unlock better utility and access", "Guarantee returns", "Enable price manipulation"]'::jsonb,
  'Unlock better utility and access',
  'About engagement and trust, not wealth flex.',
  4
FROM module;
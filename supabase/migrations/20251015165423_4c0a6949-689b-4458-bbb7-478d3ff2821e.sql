-- Insert the new learning module for Status Tiers and Wings
INSERT INTO public.learning_modules (
  title,
  description,
  content_type,
  article_content,
  category,
  difficulty_level,
  duration_minutes,
  nctr_reward,
  lock_type,
  requires_quiz,
  min_quiz_score,
  display_order,
  is_active
) VALUES (
  'Status Tiers and Wings',
  'Understand how Wings and status tiers work, including 90LOCK vs 360LOCK and how to level up',
  'article',
  '<h3>Learning goals</h3>
<ul>
<li>Understand how Wings and status tiers work</li>
<li>Know how 360LOCK and 90LOCK relate to tiers</li>
<li>Identify the kinds of perks unlocked at higher tiers</li>
</ul>

<h3>Key concepts</h3>
<ul>
<li><strong>Wings:</strong> Your progress signal earned through completed actions, weekly streaks, and qualified holdings. More Wings push you toward higher status tiers.</li>
<li><strong>Status tiers:</strong> Higher tiers unlock additional perks such as priority access, partner baskets, allowlists, or boosted earn rates. Tier names and thresholds are shown in‑app.</li>
<li><strong>90LOCK vs. 360LOCK:</strong> 90LOCK is typically used for certain action or shopping payouts to prevent abuse. 360LOCK is a longer alignment lock used for status signaling and unlocking deeper perks. All locks display an unlock date and terms.</li>
<li><strong>Compliance:</strong> Tiers reflect access and benefits. They are not promises of profit. Always share clear disclosures for any lockups.</li>
</ul>

<h3>How to level up</h3>
<ol>
<li>Complete a first‑earn quest to start your Wings.</li>
<li>Maintain a weekly streak. Streak bonuses accelerate Wing growth.</li>
<li>Complete higher‑value actions or partner quests to reach new tiers.</li>
<li>If you opt into 360LOCK, review terms. It may unlock higher‑tier benefits while signaling long‑term alignment.</li>
</ol>',
  'general',
  'beginner',
  10,
  100,
  '90LOCK',
  true,
  80,
  3,
  true
);

-- Get the module ID for inserting quiz questions
DO $$
DECLARE
  v_module_id uuid;
BEGIN
  SELECT id INTO v_module_id
  FROM public.learning_modules
  WHERE title = 'Status Tiers and Wings'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Insert quiz questions
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
    v_module_id,
    'Wings represent:',
    'multiple_choice',
    '["A. Price predictions", "B. Your progress from actions, streaks, and holdings", "C. Mining power", "D. Referral clicks only"]'::jsonb,
    'B',
    'Wings are your progress signal earned through completed actions, weekly streaks, and qualified holdings.',
    1
  ),
  (
    v_module_id,
    'Higher status tiers primarily unlock:',
    'multiple_choice',
    '["A. Guaranteed yields", "B. Access, perks, and sometimes boosted earn rates", "C. Margin trading", "D. Tax write‑offs"]'::jsonb,
    'B',
    'Tiers unlock utility and perks like priority access, partner baskets, and boosted earn rates.',
    2
  ),
  (
    v_module_id,
    '360LOCK is best described as:',
    'multiple_choice',
    '["A. A secret fee", "B. A longer alignment lock that can unlock deeper perks", "C. A ban from using tokens", "D. An airdrop requirement"]'::jsonb,
    'B',
    'It signals long‑term alignment for deeper benefits and higher-tier perks.',
    3
  ),
  (
    v_module_id,
    '90LOCK is typically used to:',
    'multiple_choice',
    '["A. Prevent abuse on certain payouts with a clear 90‑day unlock", "B. Guarantee profit", "C. Remove all risk", "D. Hide eligibility rules"]'::jsonb,
    'A',
    '90LOCK is a time‑based anti‑abuse hold with a posted unlock date, typically used for shopping and action payouts.',
    4
  ),
  (
    v_module_id,
    'The compliant way to talk about tiers is to focus on:',
    'multiple_choice',
    '["A. ROI and price targets", "B. Access, status, benefits, and transparent lock disclosures", "C. Leveraged strategies", "D. None of the above"]'::jsonb,
    'B',
    'Focus on consumptive use, clear access benefits, and transparent disclosures about any lockups.',
    5
  );
END $$;
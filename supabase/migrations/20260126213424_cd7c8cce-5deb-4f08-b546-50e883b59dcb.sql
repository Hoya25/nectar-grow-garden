-- Update learning module title and content from "Wings" to "Crescendo Status"
UPDATE public.learning_modules
SET 
  title = 'Status Tiers and Crescendo',
  description = 'Understand how Crescendo Status and status tiers work, including 90LOCK vs 360LOCK and how to level up',
  article_content = '<h3>Learning goals</h3>
<ul>
<li>Understand how Crescendo Status and status tiers work</li>
<li>Know how 360LOCK and 90LOCK relate to tiers</li>
<li>Identify the kinds of perks unlocked at higher tiers</li>
</ul>

<h3>Key concepts</h3>
<ul>
<li><strong>Crescendo Status:</strong> Your progress signal earned through completed actions, weekly streaks, and qualified holdings. Building your status pushes you toward higher tiers: Bronze 🥉, Silver 🥈, Gold 🥇, Platinum 💎, and Diamond 💠.</li>
<li><strong>Status tiers:</strong> Higher tiers unlock additional perks such as priority access, partner baskets, allowlists, or boosted earn rates. Tier names and thresholds are shown in‑app.</li>
<li><strong>90LOCK vs. 360LOCK:</strong> 90LOCK is typically used for certain action or shopping payouts to prevent abuse. 360LOCK is a longer alignment lock used for status signaling and unlocking deeper perks. All locks display an unlock date and terms.</li>
<li><strong>Compliance:</strong> Tiers reflect access and benefits. They are not promises of profit. Always share clear disclosures for any lockups.</li>
</ul>

<h3>How to level up</h3>
<ol>
<li>Complete a first‑earn quest to start building your status.</li>
<li>Maintain a weekly streak. Streak bonuses accelerate status growth.</li>
<li>Complete higher‑value actions or partner quests to reach new tiers.</li>
<li>If you opt into 360LOCK, review terms. It may unlock higher‑tier benefits while signaling long‑term alignment.</li>
</ol>'
WHERE title = 'Status Tiers and Wings';

-- Update quiz questions to use "Crescendo Status" terminology
UPDATE public.quiz_questions
SET 
  question_text = 'Crescendo Status represents:',
  explanation = 'Crescendo Status is your progress signal earned through completed actions, weekly streaks, and qualified holdings.'
WHERE question_text = 'Wings represent:';

-- Update the correct answer for the Crescendo Status question
UPDATE public.quiz_questions
SET correct_answer = 'B. Your progress from actions, streaks, and holdings'
WHERE question_text = 'Crescendo Status represents:';
-- Fix the correct_answer format for the Status Tiers and Wings quiz
-- Update to match the full option text instead of just the letter

UPDATE public.quiz_questions
SET correct_answer = 'B. Your progress from actions, streaks, and holdings'
WHERE module_id IN (
  SELECT id FROM public.learning_modules 
  WHERE title = 'Status Tiers and Wings'
)
AND question_text = 'Wings represent:';

UPDATE public.quiz_questions
SET correct_answer = 'B. Access, perks, and sometimes boosted earn rates'
WHERE module_id IN (
  SELECT id FROM public.learning_modules 
  WHERE title = 'Status Tiers and Wings'
)
AND question_text = 'Higher status tiers primarily unlock:';

UPDATE public.quiz_questions
SET correct_answer = 'B. A longer alignment lock that can unlock deeper perks'
WHERE module_id IN (
  SELECT id FROM public.learning_modules 
  WHERE title = 'Status Tiers and Wings'
)
AND question_text = '360LOCK is best described as:';

UPDATE public.quiz_questions
SET correct_answer = 'A. Prevent abuse on certain payouts with a clear 90‑day unlock'
WHERE module_id IN (
  SELECT id FROM public.learning_modules 
  WHERE title = 'Status Tiers and Wings'
)
AND question_text = '90LOCK is typically used to:';

UPDATE public.quiz_questions
SET correct_answer = 'B. Access, status, benefits, and transparent lock disclosures'
WHERE module_id IN (
  SELECT id FROM public.learning_modules 
  WHERE title = 'Status Tiers and Wings'
)
AND question_text = 'The compliant way to talk about tiers is to focus on:';
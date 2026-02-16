-- Fix user_id to be NOT NULL (no rows exist so safe to do)
ALTER TABLE public.shopping_clicks ALTER COLUMN user_id SET NOT NULL;

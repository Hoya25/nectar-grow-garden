
-- Create referral milestones table for configurable reward tiers
CREATE TABLE public.referral_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_count integer NOT NULL,
  nctr_reward numeric NOT NULL DEFAULT 0,
  label text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read milestones
CREATE POLICY "Authenticated users can view milestones"
  ON public.referral_milestones FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can manage milestones
CREATE POLICY "Admins can manage milestones"
  ON public.referral_milestones FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default milestones
INSERT INTO public.referral_milestones (referral_count, nctr_reward, label) VALUES
  (3, 500, '3 Invites'),
  (5, 1000, '5 Invites'),
  (10, 2500, '10 Invites'),
  (25, 5000, '25 Invites'),
  (50, 10000, '50 Invites');

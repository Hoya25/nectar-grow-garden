-- Add NCTR Live verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nctr_live_user_id TEXT,
ADD COLUMN IF NOT EXISTS nctr_live_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nctr_live_email TEXT;

-- Add sync error tracking to nctr_portfolio
ALTER TABLE public.nctr_portfolio
ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- Add unique constraint to prevent duplicate wallet claims
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_address_unique 
ON public.profiles(wallet_address) 
WHERE wallet_address IS NOT NULL AND wallet_address != '';

-- Create rate limiting table for sync requests
CREATE TABLE IF NOT EXISTS public.nctr_sync_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on sync rate limits
ALTER TABLE public.nctr_sync_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own rate limits
CREATE POLICY "Users can view own sync rate limits"
ON public.nctr_sync_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for system to manage rate limits
CREATE POLICY "System can manage sync rate limits"
ON public.nctr_sync_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to check sync rate limit (max 1 per minute)
CREATE OR REPLACE FUNCTION public.check_nctr_sync_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_sync TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_sync_at INTO last_sync
  FROM public.nctr_sync_rate_limits
  WHERE user_id = p_user_id;
  
  -- If no previous sync, allow it
  IF last_sync IS NULL THEN
    INSERT INTO public.nctr_sync_rate_limits (user_id, last_sync_at)
    VALUES (p_user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET last_sync_at = now();
    RETURN true;
  END IF;
  
  -- Check if 1 minute has passed
  IF (now() - last_sync) >= interval '1 minute' THEN
    UPDATE public.nctr_sync_rate_limits
    SET last_sync_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;
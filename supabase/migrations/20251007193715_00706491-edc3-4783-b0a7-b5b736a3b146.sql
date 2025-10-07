-- Performance Optimization: Add critical indexes for high-volume queries

-- Indexes for nctr_transactions table (high write/read volume)
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_user_id ON public.nctr_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_external_id ON public.nctr_transactions(external_transaction_id) WHERE external_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_earning_source ON public.nctr_transactions(earning_source);
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_status ON public.nctr_transactions(status);
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_created_at ON public.nctr_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_user_created ON public.nctr_transactions(user_id, created_at DESC);

-- Indexes for nctr_locks table (critical for status calculations)
CREATE INDEX IF NOT EXISTS idx_nctr_locks_user_status ON public.nctr_locks(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_nctr_locks_category_status ON public.nctr_locks(lock_category, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_nctr_locks_unlock_date ON public.nctr_locks(unlock_date) WHERE status = 'active';

-- Indexes for affiliate_link_mappings (webhook performance)
CREATE INDEX IF NOT EXISTS idx_affiliate_mappings_tracking_id ON public.affiliate_link_mappings(tracking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_mappings_user_brand ON public.affiliate_link_mappings(user_id, brand_id);

-- Indexes for referrals table
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status ON public.referrals(referrer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON public.referrals(referred_user_id);

-- Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles(wallet_address) WHERE wallet_address IS NOT NULL;

-- Index for nctr_portfolio (frequently joined)
CREATE INDEX IF NOT EXISTS idx_portfolio_user_status ON public.nctr_portfolio(user_id, opportunity_status);

-- Create webhook rate limiting table
CREATE TABLE IF NOT EXISTS public.webhook_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  ip_address inet NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(endpoint, ip_address, window_start)
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_lookup ON public.webhook_rate_limits(endpoint, ip_address, window_start);

-- Enable RLS on webhook_rate_limits
ALTER TABLE public.webhook_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role manages rate limits"
ON public.webhook_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to check webhook rate limits
CREATE OR REPLACE FUNCTION public.check_webhook_rate_limit(
  p_endpoint text,
  p_ip_address inet,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  window_threshold timestamptz;
BEGIN
  window_threshold := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Clean up old entries
  DELETE FROM public.webhook_rate_limits
  WHERE window_start < window_threshold;
  
  -- Get current count for this endpoint/IP
  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM public.webhook_rate_limits
  WHERE endpoint = p_endpoint
    AND ip_address = p_ip_address
    AND window_start >= window_threshold;
  
  -- Check if over limit
  IF current_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Increment counter
  INSERT INTO public.webhook_rate_limits (endpoint, ip_address, request_count, window_start)
  VALUES (p_endpoint, p_ip_address, 1, date_trunc('minute', now()))
  ON CONFLICT (endpoint, ip_address, window_start)
  DO UPDATE SET request_count = webhook_rate_limits.request_count + 1;
  
  RETURN true;
END;
$$;

-- Create table for failed webhook retries
CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL,
  payload jsonb NOT NULL,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz DEFAULT now(),
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for retry processing
CREATE INDEX IF NOT EXISTS idx_webhook_retry_next_at ON public.webhook_retry_queue(next_retry_at, retry_count) WHERE retry_count < max_retries;

-- Enable RLS
ALTER TABLE public.webhook_retry_queue ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role manages retry queue"
ON public.webhook_retry_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON INDEX idx_nctr_transactions_user_id IS 'Critical for user transaction lookups';
COMMENT ON INDEX idx_nctr_locks_user_status IS 'Optimizes status calculation queries';
COMMENT ON INDEX idx_affiliate_mappings_tracking_id IS 'Critical for webhook processing performance';
COMMENT ON TABLE webhook_rate_limits IS 'Rate limiting for webhook endpoints to prevent abuse';
COMMENT ON TABLE webhook_retry_queue IS 'Queue for failed webhook processing with exponential backoff';
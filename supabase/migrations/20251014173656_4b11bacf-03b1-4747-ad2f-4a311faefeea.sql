-- Add Alliance Token tracking to user portfolios and transactions

-- Add Alliance Token fields to nctr_portfolio table
ALTER TABLE public.nctr_portfolio
ADD COLUMN IF NOT EXISTS alliance_tokens jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.nctr_portfolio.alliance_tokens IS 'Stores user Alliance Token balances as {"SOL": 100, "BASE": 250} format';

-- Add Alliance Token fields to nctr_transactions table  
ALTER TABLE public.nctr_transactions
ADD COLUMN IF NOT EXISTS alliance_token_symbol text,
ADD COLUMN IF NOT EXISTS alliance_token_amount numeric(20,8) DEFAULT 0;

COMMENT ON COLUMN public.nctr_transactions.alliance_token_symbol IS 'Alliance Token symbol earned in this transaction (e.g., SOL, BASE)';
COMMENT ON COLUMN public.nctr_transactions.alliance_token_amount IS 'Amount of Alliance Tokens earned in this transaction';

-- Create a table to track Alliance Token locks
CREATE TABLE IF NOT EXISTS public.alliance_token_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_symbol text NOT NULL,
  token_name text NOT NULL,
  token_amount numeric(20,8) NOT NULL,
  opportunity_id uuid REFERENCES earning_opportunities(id),
  lock_date timestamp with time zone NOT NULL DEFAULT now(),
  unlock_date timestamp with time zone NOT NULL,
  lock_days integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'unlocked', 'cancelled'))
);

-- Enable RLS on alliance_token_locks
ALTER TABLE public.alliance_token_locks ENABLE ROW LEVEL SECURITY;

-- RLS policies for alliance_token_locks
CREATE POLICY "Users can view their own alliance token locks"
  ON public.alliance_token_locks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alliance token locks"
  ON public.alliance_token_locks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all alliance token locks"
  ON public.alliance_token_locks
  FOR SELECT
  USING (is_admin());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_alliance_token_locks_user_id ON public.alliance_token_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_token_locks_status ON public.alliance_token_locks(status);
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_alliance_token ON public.nctr_transactions(alliance_token_symbol) WHERE alliance_token_symbol IS NOT NULL;
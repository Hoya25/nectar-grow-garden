
-- Create unmatched_transactions table for admin review
CREATE TABLE public.unmatched_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalize_transaction_id TEXT NOT NULL,
  tracking_id TEXT,
  shopper_id TEXT,
  merchant_name TEXT,
  amount NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  purchase_date TIMESTAMPTZ,
  raw_data JSONB DEFAULT '{}'::jsonb,
  matched BOOLEAN DEFAULT false,
  matched_user_id UUID,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on loyalize_transaction_id to prevent duplicates
ALTER TABLE public.unmatched_transactions
  ADD CONSTRAINT unmatched_transactions_loyalize_id_unique UNIQUE (loyalize_transaction_id);

-- Enable RLS
ALTER TABLE public.unmatched_transactions ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage unmatched transactions
CREATE POLICY "Admins can manage unmatched transactions"
  ON public.unmatched_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage unmatched transactions"
  ON public.unmatched_transactions FOR ALL
  USING (auth.role() = 'service_role'::text);

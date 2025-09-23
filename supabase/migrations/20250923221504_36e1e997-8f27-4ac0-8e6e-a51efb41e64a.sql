-- Add external_transaction_id column to track purchase confirmations from token.nctr.live
ALTER TABLE public.nctr_transactions 
ADD COLUMN external_transaction_id TEXT;

-- Add index for efficient lookup of external transactions
CREATE INDEX idx_nctr_transactions_external_id 
ON public.nctr_transactions(external_transaction_id) 
WHERE external_transaction_id IS NOT NULL;
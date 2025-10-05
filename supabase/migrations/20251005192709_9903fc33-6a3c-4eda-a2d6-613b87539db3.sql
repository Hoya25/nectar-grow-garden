-- Add metadata column to nctr_transactions table
ALTER TABLE public.nctr_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance on metadata
CREATE INDEX IF NOT EXISTS idx_nctr_transactions_metadata ON public.nctr_transactions USING gin(metadata);

-- Add comment to document the column
COMMENT ON COLUMN public.nctr_transactions.metadata IS 'Stores additional contextual data like opportunity_id for free trial claims and other transaction metadata';
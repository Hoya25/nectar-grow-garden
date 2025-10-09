-- Add foreign key relationship between nctr_transactions and profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'nctr_transactions_user_id_fkey' 
    AND table_name = 'nctr_transactions'
  ) THEN
    ALTER TABLE public.nctr_transactions 
    ADD CONSTRAINT nctr_transactions_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(user_id) 
    ON DELETE CASCADE;
  END IF;
END $$;
-- Update the transaction_type check constraint to include withdrawal and other missing types
ALTER TABLE nctr_transactions 
DROP CONSTRAINT nctr_transactions_transaction_type_check;

-- Add updated constraint with all valid transaction types
ALTER TABLE nctr_transactions 
ADD CONSTRAINT nctr_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['earned'::text, 'locked'::text, 'unlocked'::text, 'spent'::text, 'withdrawal'::text, 'lock_upgrade'::text]));
-- Allow 'revoked' status for NCTR transactions
ALTER TABLE nctr_transactions 
DROP CONSTRAINT nctr_transactions_status_check;

ALTER TABLE nctr_transactions 
ADD CONSTRAINT nctr_transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'revoked'));
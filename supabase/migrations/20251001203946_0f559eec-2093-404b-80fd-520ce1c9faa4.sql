-- Enhanced security for withdrawal_requests: Add audit logging for admin modifications

-- Create trigger function to log admin updates to withdrawal data
CREATE OR REPLACE FUNCTION public.log_withdrawal_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when admins update withdrawal status or details
  IF TG_OP = 'UPDATE' THEN
    -- Log if user is not the withdrawal owner (admin modification)
    IF auth.uid() IS NULL OR auth.uid() != OLD.user_id THEN
      PERFORM log_sensitive_access(
        'admin_withdrawal_modification',
        'withdrawal_requests',
        NEW.id,
        'critical'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger for withdrawal modification logging
DROP TRIGGER IF EXISTS audit_withdrawal_modifications ON public.withdrawal_requests;
CREATE TRIGGER audit_withdrawal_modifications
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_withdrawal_modifications();

-- Add check constraint to prevent suspicious wallet address patterns
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS check_wallet_address_format;

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT check_wallet_address_format
  CHECK (
    wallet_address IS NULL OR 
    (length(wallet_address) >= 26 AND length(wallet_address) <= 100)
  );

-- Add constraint to prevent suspicious withdrawal amounts
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS check_withdrawal_amount_range;

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT check_withdrawal_amount_range
  CHECK (
    nctr_amount > 0 AND 
    nctr_amount <= 1000000 -- Max 1M NCTR per withdrawal
  );

-- Add constraint to prevent negative gas fees
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS check_gas_fee_positive;

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT check_gas_fee_positive
  CHECK (gas_fee_nctr >= 0);

-- Add constraint to ensure net amount is reasonable
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS check_net_amount_reasonable;

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT check_net_amount_reasonable
  CHECK (net_amount_nctr > 0 AND net_amount_nctr <= nctr_amount);

-- Update table comment with security notice
COMMENT ON TABLE public.withdrawal_requests IS 
'CRITICAL FINANCIAL DATA: Contains cryptocurrency withdrawal information. All admin modifications are logged to security_audit_log. RLS strictly enforced - users can only access their own requests. Admin access requires treasury role validation.';

-- Add indexes for faster security audits and fraud detection
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_status 
  ON public.withdrawal_requests(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_suspicious_amounts
  ON public.withdrawal_requests(nctr_amount, created_at DESC)
  WHERE nctr_amount > 100000; -- Flag large withdrawals

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_pending
  ON public.withdrawal_requests(status, created_at)
  WHERE status IN ('pending', 'processing');
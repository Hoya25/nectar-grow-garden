-- Fix suspend_user_account function to correctly log admin activity
CREATE OR REPLACE FUNCTION public.suspend_user_account(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_record_id uuid;
BEGIN
  -- Verify admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get the admin_users.id for the current admin user
  SELECT id INTO admin_record_id 
  FROM admin_users 
  WHERE user_id = auth.uid();

  -- Update profile to suspended status
  UPDATE profiles
  SET account_status = 'suspended',
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the action only if we have a valid admin record
  IF admin_record_id IS NOT NULL THEN
    INSERT INTO admin_activity_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      admin_record_id,  -- Use admin_users.id, not auth.uid()
      'suspended_user',
      'profiles',
      p_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'suspended_at', now()
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User suspended successfully'
  );
END;
$function$;

-- Fix revoke_fraudulent_nctr function to correctly log admin activity
CREATE OR REPLACE FUNCTION public.revoke_fraudulent_nctr(
  p_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_record_id uuid;
  revoked_amount numeric;
BEGIN
  -- Verify admin access
  IF NOT get_admin_financial_access_secure() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get the admin_users.id for the current admin user
  SELECT id INTO admin_record_id 
  FROM admin_users 
  WHERE user_id = auth.uid();

  -- Get current available NCTR before revoking
  SELECT available_nctr INTO revoked_amount
  FROM nctr_portfolio
  WHERE user_id = p_user_id;

  -- Set all NCTR to 0
  UPDATE nctr_portfolio
  SET available_nctr = 0,
      pending_nctr = 0,
      lock_90_nctr = 0,
      lock_360_nctr = 0,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Deactivate all locks
  UPDATE nctr_locks
  SET status = 'revoked'
  WHERE user_id = p_user_id
    AND status = 'active';

  -- Record the revocation transaction
  INSERT INTO nctr_transactions (
    user_id,
    transaction_type,
    nctr_amount,
    description,
    status
  ) VALUES (
    p_user_id,
    'revoked',
    -revoked_amount,
    'NCTR revoked by admin: ' || p_reason,
    'completed'
  );

  -- Log the action only if we have a valid admin record
  IF admin_record_id IS NOT NULL THEN
    INSERT INTO admin_activity_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      admin_record_id,  -- Use admin_users.id, not auth.uid()
      'revoked_nctr',
      'nctr_portfolio',
      p_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'amount_revoked', revoked_amount,
        'revoked_at', now()
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'NCTR revoked successfully',
    'amount_revoked', revoked_amount
  );
END;
$function$;
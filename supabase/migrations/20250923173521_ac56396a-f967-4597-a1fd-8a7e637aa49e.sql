-- Create function to upgrade ALL 90LOCK balances to 360LOCK for a user
CREATE OR REPLACE FUNCTION public.upgrade_all_90locks_to_360(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lock_record RECORD;
  upgraded_count integer := 0;
  total_nctr_upgraded numeric := 0;
  new_lock_id uuid;
  upgrade_results jsonb := '[]'::jsonb;
BEGIN
  -- Get all upgradeable 90LOCK balances for the user
  FOR lock_record IN 
    SELECT * FROM public.nctr_locks 
    WHERE user_id = p_user_id 
      AND lock_category = '90LOCK'
      AND status = 'active' 
      AND can_upgrade = true
  LOOP
    -- Create new 360LOCK for each 90LOCK
    INSERT INTO public.nctr_locks (
      user_id,
      nctr_amount,
      lock_type,
      lock_category,
      commitment_days,
      unlock_date,
      can_upgrade,
      original_lock_type,
      upgraded_from_lock_id
    ) VALUES (
      lock_record.user_id,
      lock_record.nctr_amount,
      '360LOCK',
      '360LOCK',
      360,
      now() + '360 days'::interval,
      false,
      lock_record.original_lock_type,
      lock_record.id
    ) RETURNING id INTO new_lock_id;

    -- Deactivate the old 90LOCK
    UPDATE public.nctr_locks 
    SET status = 'upgraded' 
    WHERE id = lock_record.id;

    -- Track the upgrade
    upgraded_count := upgraded_count + 1;
    total_nctr_upgraded := total_nctr_upgraded + lock_record.nctr_amount;
    
    -- Add to results
    upgrade_results := upgrade_results || jsonb_build_object(
      'old_lock_id', lock_record.id,
      'new_lock_id', new_lock_id,
      'nctr_amount', lock_record.nctr_amount
    );

    -- Log the transaction
    INSERT INTO public.nctr_transactions (
      user_id,
      transaction_type,
      nctr_amount,
      description,
      earning_source,
      status
    ) VALUES (
      p_user_id,
      'lock_upgrade',
      lock_record.nctr_amount,
      'Batch upgraded 90LOCK to 360LOCK for enhanced alliance status',
      'batch_lock_upgrade',
      'completed'
    );
  END LOOP;

  -- Update portfolio balances (this will trigger the portfolio update function)
  PERFORM public.update_portfolio_lock_balances() FROM (SELECT p_user_id) AS t;

  -- Return summary of upgrades
  RETURN jsonb_build_object(
    'success', true,
    'upgraded_count', upgraded_count,
    'total_nctr_upgraded', total_nctr_upgraded,
    'upgrade_details', upgrade_results,
    'message', 
      CASE 
        WHEN upgraded_count = 0 THEN 'No 90LOCK balances available for upgrade'
        WHEN upgraded_count = 1 THEN 'Successfully upgraded 1 lock to 360LOCK'
        ELSE 'Successfully upgraded ' || upgraded_count || ' locks to 360LOCK'
      END
  );
END;
$function$;
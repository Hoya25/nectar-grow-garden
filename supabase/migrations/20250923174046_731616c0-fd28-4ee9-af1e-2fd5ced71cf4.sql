-- Create function to commit ALL NCTR (available + 90LOCK upgrades) to 360LOCK in one operation
CREATE OR REPLACE FUNCTION public.commit_all_nctr_to_360lock(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  available_amount numeric := 0;
  lock_record RECORD;
  upgraded_count integer := 0;
  total_nctr_from_locks numeric := 0;
  total_nctr_committed numeric := 0;
  new_lock_id uuid;
  available_lock_id uuid;
  upgrade_results jsonb := '[]'::jsonb;
BEGIN
  -- Get current available NCTR
  SELECT available_nctr INTO available_amount
  FROM public.nctr_portfolio
  WHERE user_id = p_user_id;
  
  available_amount := COALESCE(available_amount, 0);

  -- PART 1: Commit available NCTR to 360LOCK if any exists
  IF available_amount > 0 THEN
    -- Create 360LOCK commitment from available NCTR
    INSERT INTO public.nctr_locks (
      user_id,
      nctr_amount,
      lock_type,
      lock_category,
      commitment_days,
      unlock_date,
      can_upgrade,
      original_lock_type
    ) VALUES (
      p_user_id,
      available_amount,
      '360LOCK',
      '360LOCK',
      360,
      now() + '360 days'::interval,
      false,
      '360LOCK'
    ) RETURNING id INTO available_lock_id;
    
    -- Deduct from available balance
    UPDATE public.nctr_portfolio
    SET available_nctr = 0,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Record transaction for available commitment
    INSERT INTO public.nctr_transactions (
      user_id,
      transaction_type,
      nctr_amount,
      description,
      earning_source,
      status
    ) VALUES (
      p_user_id,
      'locked',
      available_amount,
      'Committed available NCTR to 360LOCK (batch operation)',
      'manual_commitment',
      'completed'
    );
    
    total_nctr_committed := total_nctr_committed + available_amount;
  END IF;

  -- PART 2: Upgrade all 90LOCK balances to 360LOCK
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
    total_nctr_from_locks := total_nctr_from_locks + lock_record.nctr_amount;
    
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
      'Upgraded 90LOCK to 360LOCK (batch operation)',
      'batch_lock_upgrade',
      'completed'
    );
  END LOOP;

  -- Update portfolio balances (this will trigger the portfolio update function)
  PERFORM public.update_portfolio_lock_balances() FROM (SELECT p_user_id) AS t;

  total_nctr_committed := total_nctr_committed + total_nctr_from_locks;

  -- Return comprehensive summary
  RETURN jsonb_build_object(
    'success', true,
    'available_nctr_committed', available_amount,
    'upgraded_locks_count', upgraded_count,
    'total_nctr_from_upgrades', total_nctr_from_locks,
    'total_nctr_committed', total_nctr_committed,
    'available_lock_id', available_lock_id,
    'upgrade_details', upgrade_results,
    'message', 
      CASE 
        WHEN available_amount > 0 AND upgraded_count > 0 THEN 
          'Successfully committed ' || total_nctr_committed::text || ' NCTR to 360LOCK (' || available_amount::text || ' available + ' || upgraded_count || ' lock upgrades)'
        WHEN available_amount > 0 AND upgraded_count = 0 THEN 
          'Successfully committed ' || available_amount::text || ' available NCTR to 360LOCK'
        WHEN available_amount = 0 AND upgraded_count > 0 THEN 
          'Successfully upgraded ' || upgraded_count || ' locks (' || total_nctr_from_locks::text || ' NCTR) to 360LOCK'
        ELSE 'No NCTR available to commit or upgrade'
      END
  );
END;
$function$;
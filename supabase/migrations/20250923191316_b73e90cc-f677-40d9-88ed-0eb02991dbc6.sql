-- Drop the existing check constraint
ALTER TABLE public.nctr_locks DROP CONSTRAINT nctr_locks_status_check;

-- Add the new check constraint that includes 'upgraded' status
ALTER TABLE public.nctr_locks ADD CONSTRAINT nctr_locks_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'withdrawn'::text, 'upgraded'::text]));

-- Update the commit_all_nctr_to_360lock function to handle the upgrade properly
CREATE OR REPLACE FUNCTION public.commit_all_nctr_to_360lock(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_portfolio_record record;
    v_lock_90_amount numeric := 0;
    v_available_amount numeric := 0;
    v_total_amount numeric := 0;
    v_new_unlock_date timestamp with time zone;
    v_locks_upgraded integer := 0;
    v_lock_record record;
BEGIN
    -- Get user's portfolio
    SELECT * INTO v_portfolio_record 
    FROM public.nctr_portfolio 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Portfolio not found'
        );
    END IF;
    
    v_lock_90_amount := COALESCE(v_portfolio_record.lock_90_nctr, 0);
    v_available_amount := COALESCE(v_portfolio_record.available_nctr, 0);
    v_total_amount := v_lock_90_amount + v_available_amount;
    
    -- Check if there's anything to commit
    IF v_total_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No NCTR available to commit'
        );
    END IF;
    
    -- Calculate new unlock date (360 days from now)
    v_new_unlock_date := now() + interval '360 days';
    
    -- Mark existing 90LOCK entries as upgraded (don't delete them for history)
    FOR v_lock_record IN 
        SELECT id FROM public.nctr_locks 
        WHERE user_id = p_user_id 
        AND lock_category = '90LOCK' 
        AND status = 'active'
    LOOP
        UPDATE public.nctr_locks 
        SET status = 'upgraded'
        WHERE id = v_lock_record.id;
        
        v_locks_upgraded := v_locks_upgraded + 1;
    END LOOP;
    
    -- Create new 360LOCK entry for the total amount
    IF v_total_amount > 0 THEN
        INSERT INTO public.nctr_locks (
            user_id,
            lock_type,
            lock_category,
            nctr_amount,
            lock_date,
            unlock_date,
            status,
            commitment_days,
            can_upgrade,
            original_lock_type
        ) VALUES (
            p_user_id,
            '360LOCK',
            '360LOCK',
            v_total_amount,
            now(),
            v_new_unlock_date,
            'active',
            360,
            false,  -- 360LOCK cannot be upgraded further
            '90LOCK'
        );
    END IF;
    
    -- Update portfolio: move all to lock_360_nctr and clear others
    UPDATE public.nctr_portfolio 
    SET 
        available_nctr = 0,
        lock_90_nctr = 0,
        lock_360_nctr = COALESCE(lock_360_nctr, 0) + v_total_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully upgraded to 360LOCK',
        'total_amount', v_total_amount,
        'locks_upgraded', v_locks_upgraded,
        'new_unlock_date', v_new_unlock_date
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
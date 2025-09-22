-- Helper function to move NCTR from pending to available
CREATE OR REPLACE FUNCTION public.move_pending_to_available(
  p_user_id uuid,
  p_amount numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nctr_portfolio
  SET 
    pending_nctr = GREATEST(pending_nctr - p_amount, 0),
    available_nctr = available_nctr + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Helper function to increment a numeric value (for pending NCTR)
CREATE OR REPLACE FUNCTION public.increment(x numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT x + 1;
$$;

-- Helper function to decrement a numeric value (for failed transactions)
CREATE OR REPLACE FUNCTION public.decrement(x numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(x - 1, 0);
$$;
-- Update is_daily_checkin_available to enforce true 24-hour cooldown
CREATE OR REPLACE FUNCTION public.is_daily_checkin_available(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_checkin_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the last checkin timestamp for this user
  SELECT created_at INTO last_checkin_timestamp
  FROM public.nctr_transactions
  WHERE user_id = p_user_id
    AND earning_source = 'daily_checkin'
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no previous checkin, it's available
  IF last_checkin_timestamp IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if 24 hours have passed since last checkin
  RETURN (now() - last_checkin_timestamp) >= interval '24 hours';
END;
$$;
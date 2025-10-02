-- Fix function search_path security issues
-- Update all custom functions to have explicit search_path

-- Update functions that don't have SET search_path
CREATE OR REPLACE FUNCTION public.monitor_referral_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_sensitive_access(
    TG_OP::text || '_referral',
    'referrals',
    COALESCE(NEW.id, OLD.id),
    'medium'
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_withdrawal_modifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.monitor_referral_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_sensitive_access(
    'referral_created',
    'referrals',
    NEW.id,
    'medium'
  );
  
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.referred_user_id
  ) THEN
    RAISE EXCEPTION 'Referred user does not exist';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrer_user_id = NEW.referrer_user_id 
    AND referred_user_id = NEW.referred_user_id
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Referral already exists for this user';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_profile_completion_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  completion_result jsonb;
BEGIN
  SELECT public.calculate_profile_completion(NEW.user_id) INTO completion_result;
  
  IF (completion_result->>'eligible_for_bonus')::boolean THEN
    PERFORM public.award_profile_completion_bonus(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$function$;
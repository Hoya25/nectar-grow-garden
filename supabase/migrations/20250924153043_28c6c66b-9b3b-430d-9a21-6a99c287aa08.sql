-- Fix function search path security issue
CREATE OR REPLACE FUNCTION update_click_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE public.independent_affiliate_links 
  SET click_count = click_count + 1,
      updated_at = now()
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;
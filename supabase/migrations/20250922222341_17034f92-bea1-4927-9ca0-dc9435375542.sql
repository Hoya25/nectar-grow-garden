-- Fix search path for helper functions
DROP FUNCTION IF EXISTS public.increment(numeric);
DROP FUNCTION IF EXISTS public.decrement(numeric);

-- Helper function to increment a numeric value with proper search path
CREATE OR REPLACE FUNCTION public.increment(x numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT x + 1;
$$;

-- Helper function to decrement a numeric value with proper search path  
CREATE OR REPLACE FUNCTION public.decrement(x numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(x - 1, 0);
$$;
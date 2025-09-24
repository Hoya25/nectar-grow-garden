-- Fix security warnings by restricting access to authenticated users only

-- Update NCTR price cache policies to require authentication
DROP POLICY IF EXISTS "Anyone can view NCTR price data" ON public.nctr_price_cache;

CREATE POLICY "Authenticated users can view NCTR price data" 
ON public.nctr_price_cache 
FOR SELECT 
TO authenticated
USING (true);

-- Update opportunity status levels to require authentication  
DROP POLICY IF EXISTS "Anyone can view status levels" ON public.opportunity_status_levels;

CREATE POLICY "Authenticated users can view status levels" 
ON public.opportunity_status_levels 
FOR SELECT 
TO authenticated
USING (true);
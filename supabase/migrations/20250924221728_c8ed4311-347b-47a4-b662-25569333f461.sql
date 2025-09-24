-- Fix security warnings by restricting public access

-- Fix NCTR price cache: Replace public system policy with service role policy
DROP POLICY IF EXISTS "System can update NCTR price data" ON public.nctr_price_cache;

CREATE POLICY "Service role can manage NCTR price data" 
ON public.nctr_price_cache 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Fix partner campaigns: Restrict public viewing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.partner_campaigns;

CREATE POLICY "Authenticated users can view active campaigns" 
ON public.partner_campaigns 
FOR SELECT 
TO authenticated
USING (is_active = true);
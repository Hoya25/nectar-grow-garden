-- Create table for NCTR price caching
CREATE TABLE IF NOT EXISTS public.nctr_price_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_usd numeric NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  source text DEFAULT 'onchain',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the price cache table
ALTER TABLE public.nctr_price_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read price data
CREATE POLICY "Anyone can view NCTR price data" 
ON public.nctr_price_cache 
FOR SELECT 
USING (true);

-- Create policy for system to update price data
CREATE POLICY "System can update NCTR price data" 
ON public.nctr_price_cache 
FOR ALL 
USING (true);

-- Create index on updated_at for faster queries
CREATE INDEX idx_nctr_price_cache_updated_at ON public.nctr_price_cache(updated_at DESC);

-- Insert initial price if none exists
INSERT INTO public.nctr_price_cache (price_usd, source) 
VALUES (0.01, 'initial') 
ON CONFLICT DO NOTHING;
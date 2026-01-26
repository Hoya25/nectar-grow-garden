-- Add is_big_brand column to brands table for Mall experience
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS is_big_brand boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brands_is_big_brand ON public.brands(is_big_brand) WHERE is_big_brand = true;
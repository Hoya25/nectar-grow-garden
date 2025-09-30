
-- Add brand_id column to earning_opportunities table to link opportunities to brands
ALTER TABLE public.earning_opportunities 
ADD COLUMN brand_id UUID REFERENCES public.brands(id);

-- Add index for performance
CREATE INDEX idx_earning_opportunities_brand_id ON public.earning_opportunities(brand_id);

-- Update existing NoBull opportunity to link to the NoBull brand
UPDATE public.earning_opportunities
SET brand_id = (SELECT id FROM public.brands WHERE loyalize_id = '30095' LIMIT 1),
    reward_per_dollar = 100.00,
    affiliate_link = 'https://link.loyalize.com/stores/30095?user_tracking_id={{TRACKING_ID}}'
WHERE partner_name ILIKE '%nobull%';

-- Add comment for documentation
COMMENT ON COLUMN public.earning_opportunities.brand_id IS 'Foreign key to brands table - links opportunities to actual brand configurations for proper tracking';

-- Add display_order column to earning_opportunities table
ALTER TABLE public.earning_opportunities 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing opportunities to have incremental order based on creation date
UPDATE public.earning_opportunities 
SET display_order = (
  SELECT ROW_NUMBER() OVER (ORDER BY created_at)
  FROM public.earning_opportunities e2 
  WHERE e2.id = earning_opportunities.id
);

-- Add index for better performance when ordering
CREATE INDEX idx_earning_opportunities_display_order ON public.earning_opportunities(display_order);

-- Add index for combined ordering (active status + display order)
CREATE INDEX idx_earning_opportunities_active_order ON public.earning_opportunities(is_active, display_order);

-- Add display_priority column to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS display_priority text NOT NULL DEFAULT 'standard';

-- Add comment for documentation
COMMENT ON COLUMN public.brands.display_priority IS 'Controls brand visibility: flagship, featured, standard, search_only';


-- Set big brands to search_only
UPDATE public.brands SET display_priority = 'search_only' WHERE is_big_brand = true;

-- Set Kroma Wellness to flagship
UPDATE public.brands SET display_priority = 'flagship' WHERE LOWER(name) = 'kroma wellness';

-- Set featured non-big-brand brands to 'featured'
UPDATE public.brands SET display_priority = 'featured' WHERE featured = true AND (is_big_brand = false OR is_big_brand IS NULL) AND display_priority = 'standard';

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_brands_display_priority ON public.brands(display_priority);

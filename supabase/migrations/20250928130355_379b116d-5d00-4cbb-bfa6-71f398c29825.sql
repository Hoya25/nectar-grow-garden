-- Create affiliate link mappings table for reliable tracking ID lookups
CREATE TABLE IF NOT EXISTS public.affiliate_link_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_link_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for affiliate link mappings
CREATE POLICY "Users can view their own affiliate mappings" 
ON public.affiliate_link_mappings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage affiliate mappings" 
ON public.affiliate_link_mappings 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can create mappings" 
ON public.affiliate_link_mappings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_mappings_tracking_id ON public.affiliate_link_mappings(tracking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_mappings_user_id ON public.affiliate_link_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_mappings_brand_id ON public.affiliate_link_mappings(brand_id);

-- Reactivate Uber Gift Cards brand
UPDATE public.brands 
SET is_active = true 
WHERE name = 'Uber Gift Cards' AND is_active = false;
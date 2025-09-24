-- Create table for independent affiliate links
CREATE TABLE public.independent_affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_affiliate_url TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  description TEXT,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  total_commissions NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.independent_affiliate_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own independent affiliate links" 
ON public.independent_affiliate_links 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own independent affiliate links" 
ON public.independent_affiliate_links 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own independent affiliate links" 
ON public.independent_affiliate_links 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create table for tracking link clicks
CREATE TABLE public.affiliate_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.independent_affiliate_links(id),
  user_id UUID NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- Enable RLS for clicks
ALTER TABLE public.affiliate_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clicks for their links" 
ON public.affiliate_link_clicks 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add trigger to update link click counts
CREATE OR REPLACE FUNCTION update_click_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.independent_affiliate_links 
  SET click_count = click_count + 1,
      updated_at = now()
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_click_count
  AFTER INSERT ON public.affiliate_link_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_click_count();
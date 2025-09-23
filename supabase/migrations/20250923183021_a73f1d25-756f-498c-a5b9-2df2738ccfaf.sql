-- Add social media fields to earning_opportunities table
ALTER TABLE public.earning_opportunities 
ADD COLUMN social_platform text,
ADD COLUMN social_handle text,
ADD COLUMN cta_text text;
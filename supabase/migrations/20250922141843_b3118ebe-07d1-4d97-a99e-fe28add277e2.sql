-- Add video support to earning opportunities
ALTER TABLE public.earning_opportunities 
ADD COLUMN video_url TEXT,
ADD COLUMN video_title TEXT,
ADD COLUMN video_description TEXT;
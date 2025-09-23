-- Add featured field to earning_opportunities table
ALTER TABLE public.earning_opportunities 
ADD COLUMN featured boolean NOT NULL DEFAULT false;
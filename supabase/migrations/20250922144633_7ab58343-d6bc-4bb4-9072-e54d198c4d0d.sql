-- Create table for site settings that can be managed from admin
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin-only access
CREATE POLICY "Only admins can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (check_user_is_admin(auth.uid()));

CREATE POLICY "Only admins can update site settings" 
ON public.site_settings 
FOR UPDATE 
USING (check_user_is_admin(auth.uid()));

CREATE POLICY "Only admins can insert site settings" 
ON public.site_settings 
FOR INSERT 
WITH CHECK (check_user_is_admin(auth.uid()));

-- Add trigger for timestamps
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial NCTR distribution settings
INSERT INTO public.site_settings (setting_key, setting_value, description) VALUES
('nctr_distribution_rate', '{"tokens_per_second": 50, "current_total": 2500000}', 'NCTR token distribution ticker settings - rate and current total'),
('site_stats', '{"brand_partners": "5K+"}', 'General site statistics displayed on footer');
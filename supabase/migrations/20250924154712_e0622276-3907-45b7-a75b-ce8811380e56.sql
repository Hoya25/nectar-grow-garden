-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true);

-- Create RLS policies for brand logo uploads
CREATE POLICY "Brand logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'brand-logos');

CREATE POLICY "Admins can upload brand logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'brand-logos' AND check_user_is_admin(auth.uid()));

CREATE POLICY "Admins can update brand logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'brand-logos' AND check_user_is_admin(auth.uid()));

CREATE POLICY "Admins can delete brand logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'brand-logos' AND check_user_is_admin(auth.uid()));

-- Create a public storage bucket for brand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-images', 'brand-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for brand images"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-images');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Admins can upload brand images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-images' AND auth.role() = 'authenticated');

-- Allow authenticated users (admins) to update
CREATE POLICY "Admins can update brand images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-images' AND auth.role() = 'authenticated');

-- Allow authenticated users (admins) to delete
CREATE POLICY "Admins can delete brand images"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-images' AND auth.role() = 'authenticated');

-- Create storage bucket for learning module videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-videos', 'learning-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for learning-videos bucket
CREATE POLICY "Admins can upload learning videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'learning-videos' 
  AND is_admin()
);

CREATE POLICY "Admins can update learning videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'learning-videos' AND is_admin());

CREATE POLICY "Admins can delete learning videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'learning-videos' AND is_admin());

CREATE POLICY "Anyone can view learning videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'learning-videos');
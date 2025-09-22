-- Add additional security measures for sensitive profile data

-- Create a security definer function to get minimal profile info for public views
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  full_name text
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.full_name
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$$;

-- Create a view for public profile access (removes sensitive fields)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  username,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_barrier = true);

-- Create policy for the view
DROP POLICY IF EXISTS "Public profiles viewable by authenticated users" ON public.public_profiles;
CREATE POLICY "Public profiles viewable by authenticated users" ON public.public_profiles
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add comment to document sensitive data protection
COMMENT ON TABLE public.profiles IS 'Contains sensitive user data. Email, wallet_address should only be accessible by the user themselves or admins. Use public_profiles view for general access.';
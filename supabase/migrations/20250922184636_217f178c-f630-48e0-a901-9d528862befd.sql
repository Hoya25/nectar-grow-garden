-- Add additional security measures for sensitive profile data

-- Create a security definer function to get minimal profile info for public views
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  full_name text,
  avatar_url text
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$$;

-- Add comment to document sensitive data protection
COMMENT ON TABLE public.profiles IS 'Contains sensitive user data. Email and wallet_address fields should only be accessible by the user themselves or admins. Use get_public_profile() function for safe public access to basic profile info.';
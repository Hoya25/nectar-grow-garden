-- Update RLS policies to restrict affiliate link creation to admins only
DROP POLICY IF EXISTS "Users can create their own independent affiliate links" ON public.independent_affiliate_links;

-- Create new admin-only policy for creating affiliate links
CREATE POLICY "Only admins can create independent affiliate links" 
ON public.independent_affiliate_links 
FOR INSERT 
WITH CHECK (check_user_is_admin(auth.uid()));

-- Update the existing select policy to allow users to view links created by admins
DROP POLICY IF EXISTS "Users can view their own independent affiliate links" ON public.independent_affiliate_links;

CREATE POLICY "Users can view all active independent affiliate links" 
ON public.independent_affiliate_links 
FOR SELECT 
USING (is_active = true);

-- Admins can view all links (active and inactive)
CREATE POLICY "Admins can view all independent affiliate links" 
ON public.independent_affiliate_links 
FOR SELECT 
USING (check_user_is_admin(auth.uid()));

-- Only admins can update affiliate links
DROP POLICY IF EXISTS "Users can update their own independent affiliate links" ON public.independent_affiliate_links;

CREATE POLICY "Only admins can update independent affiliate links" 
ON public.independent_affiliate_links 
FOR UPDATE 
USING (check_user_is_admin(auth.uid()));

-- Update clicks policy - anyone can view clicks for active links
DROP POLICY IF EXISTS "Users can view clicks for their links" ON public.affiliate_link_clicks;

CREATE POLICY "Anyone can view clicks for active links" 
ON public.affiliate_link_clicks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.independent_affiliate_links 
    WHERE id = affiliate_link_clicks.link_id 
    AND is_active = true
  )
);

-- Admins can view all clicks
CREATE POLICY "Admins can view all affiliate link clicks" 
ON public.affiliate_link_clicks 
FOR SELECT 
USING (check_user_is_admin(auth.uid()));
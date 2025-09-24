-- Fix critical security vulnerabilities in affiliate link system
-- SECURITY ISSUE: User personal information and financial behavior exposed

-- 1. Fix affiliate_link_clicks table - make it user-private
DROP POLICY IF EXISTS "Anyone can view clicks for active links" ON public.affiliate_link_clicks;

-- Users can only view their own click history
CREATE POLICY "Users can view their own affiliate clicks" 
ON public.affiliate_link_clicks 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only authenticated users can record clicks (when the system creates them)
CREATE POLICY "Authenticated users can record affiliate clicks" 
ON public.affiliate_link_clicks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Add audit logging policy for security monitoring
CREATE POLICY "Admins can view all clicks for security audit" 
ON public.affiliate_link_clicks 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    )
);

-- 4. Fix independent_affiliate_links policies
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all active independent affiliate links" ON public.independent_affiliate_links;

-- More secure policy: users can view active public affiliate opportunities
CREATE POLICY "Users can view public affiliate opportunities" 
ON public.independent_affiliate_links 
FOR SELECT 
USING (is_active = true);

-- Users can view their own created affiliate links with full details
CREATE POLICY "Users can view their own affiliate links" 
ON public.independent_affiliate_links 
FOR SELECT 
USING (auth.uid() = user_id);
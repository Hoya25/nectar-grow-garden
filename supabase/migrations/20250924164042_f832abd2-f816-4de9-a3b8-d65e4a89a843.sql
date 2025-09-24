-- CRITICAL SECURITY FIX: Remove public access to sensitive affiliate link data
-- ISSUE: Users can view other users' affiliate strategies, performance data, and sensitive URLs

-- Remove the overly permissive public viewing policy that exposes sensitive data
DROP POLICY IF EXISTS "Users can view public affiliate opportunities" ON public.independent_affiliate_links;

-- SECURITY PRINCIPLE: Users should only access their own affiliate data
-- This prevents:
-- 1. Stealing of affiliate strategies and URLs
-- 2. Exposure of user IDs linked to financial activities  
-- 3. Access to performance metrics (clicks, conversions, commissions)
-- 4. Competitor intelligence gathering

-- Keep existing secure policies:
-- ✅ "Users can view their own affiliate links" - users see only their own data
-- ✅ "Admins can view all independent affiliate links" - admin management access
-- ✅ "Only admins can create independent affiliate links" - controlled creation
-- ✅ "Only admins can update independent affiliate links" - controlled updates

-- Note: If users need to discover affiliate opportunities, this should be implemented
-- through a separate curated system (like the existing earning_opportunities table)
-- rather than exposing sensitive user affiliate data
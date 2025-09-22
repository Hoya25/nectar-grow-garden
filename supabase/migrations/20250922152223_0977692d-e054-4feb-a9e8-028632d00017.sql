-- SECURITY FIX: Remove the vulnerable view entirely
-- The secure function get_user_status_details() provides safe access instead
DROP VIEW IF EXISTS public.user_status_details;

-- Create a comment explaining why the view was removed
COMMENT ON FUNCTION public.get_user_status_details IS 
'Secure replacement for user_status_details view. Enforces proper access control - users can only access their own financial data.';
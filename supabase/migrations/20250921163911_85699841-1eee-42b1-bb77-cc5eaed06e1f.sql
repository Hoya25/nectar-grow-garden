-- Make anderson@projectbutterfly.io a super admin
SELECT public.make_user_admin_by_email('anderson@projectbutterfly.io', 'super_admin');

-- Add sample brand data
SELECT public.add_sample_brands();
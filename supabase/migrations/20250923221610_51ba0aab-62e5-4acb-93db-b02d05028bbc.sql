-- Fix function search path security issue by setting search_path on all functions that don't have it set

-- Update existing functions to have secure search_path
ALTER FUNCTION public.calculate_profile_completion(p_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.check_profile_completion_bonus() SET search_path TO 'public';
ALTER FUNCTION public.get_user_status_details(target_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.award_profile_completion_bonus(p_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.calculate_lock_balances(user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_portfolio_lock_balances() SET search_path TO 'public';
ALTER FUNCTION public.award_affiliate_nctr(p_user_id uuid, p_base_nctr_amount numeric, p_earning_source text) SET search_path TO 'public';
ALTER FUNCTION public.get_public_profile(profile_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.apply_reward_multiplier(p_user_id uuid, p_base_amount numeric) SET search_path TO 'public';
ALTER FUNCTION public.auto_lock_earned_nctr(p_user_id uuid, p_nctr_amount numeric, p_earning_source text, p_opportunity_type text) SET search_path TO 'public';
ALTER FUNCTION public.upgrade_all_90locks_to_360(p_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_admin_profiles_safe() SET search_path TO 'public';
ALTER FUNCTION public.get_sensitive_profile_data(target_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.check_admin_access_level(required_level text) SET search_path TO 'public';
ALTER FUNCTION public.commit_all_nctr_to_360lock(p_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_admin_safe_profiles() SET search_path TO 'public';
ALTER FUNCTION public.upgrade_lock_to_360(p_lock_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.move_pending_to_available(p_user_id uuid, p_amount numeric) SET search_path TO 'public';
ALTER FUNCTION public.increment(x numeric) SET search_path TO 'public';
ALTER FUNCTION public.decrement(x numeric) SET search_path TO 'public';
ALTER FUNCTION public.handle_referral_signup() SET search_path TO 'public';
ALTER FUNCTION public.process_referral_reward(p_referral_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.commit_available_to_360lock(p_user_id uuid, p_amount numeric) SET search_path TO 'public';  
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.update_user_status(user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.make_user_admin_by_email(user_email text, admin_role text) SET search_path TO 'public';
ALTER FUNCTION public.add_sample_brands() SET search_path TO 'public';
ALTER FUNCTION public.is_admin(user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.calculate_user_status(user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.trigger_update_user_status() SET search_path TO 'public';
ALTER FUNCTION public.check_user_is_admin(check_user_id uuid) SET search_path TO 'public';
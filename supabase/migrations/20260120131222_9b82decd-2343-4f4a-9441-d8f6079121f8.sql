-- Fix function search paths for security
ALTER FUNCTION validate_activity_platform() SET search_path = public;
ALTER FUNCTION calculate_unified_user_tier(uuid) SET search_path = public;
ALTER FUNCTION get_unified_user_with_tier(uuid) SET search_path = public;
ALTER FUNCTION trigger_recalculate_unified_tier() SET search_path = public;
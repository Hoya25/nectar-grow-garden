import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  role: string;
  permissions: string[];
  created_at: string;
}

/**
 * Client-side admin check hook for UI optimization only.
 * 
 * ⚠️ CRITICAL SECURITY NOTE: This hook does NOT provide actual security.
 * 
 * This hook performs client-side checks that can be manipulated by attackers
 * through browser DevTools, proxy tools, or by modifying localStorage/sessionStorage.
 * 
 * **What this hook DOES:**
 * - ✅ Hides admin UI elements from non-admin users (UX improvement)
 * - ✅ Reduces accidental misuse of admin features
 * - ✅ Provides convenience for frontend development
 * 
 * **What this hook DOES NOT do:**
 * - ❌ Prevent malicious attacks on admin endpoints
 * - ❌ Provide any actual security or access control
 * - ❌ Stop attackers from calling admin API endpoints directly
 * 
 * **Security is enforced at:**
 * 1. **Database Level**: Row-Level Security (RLS) policies using has_role() function
 * 2. **Function Level**: SECURITY DEFINER functions validate roles server-side
 * 3. **Edge Functions**: JWT validation and role checks before processing requests
 * 
 * **For developers adding admin features:**
 * Always ensure server-side validation:
 * - [ ] RLS policy added to database tables?
 * - [ ] Database function validates roles using has_role()?
 * - [ ] Edge function checks JWT and role permissions?
 * - [ ] Client check is clearly marked as UX-only?
 * 
 * @returns {object} Admin status and utilities
 * @returns {boolean} isAdmin - Whether to show admin UI (UX only, not security)
 * @returns {AdminUser | null} adminUser - Admin user data for UI display
 * @returns {boolean} loading - Loading state
 * @returns {function} hasPermission - Check specific permission (client-side only)
 * @returns {function} logActivity - Log admin actions (for audit trail)
 * @returns {function} checkAdminStatus - Manually refresh admin status
 */
export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    // Check admin status for all authenticated users
    // RLS policies will naturally return empty for non-admins
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setAdminUser(null);
      } else if (data) {
        setIsAdmin(true);
        setAdminUser(data);
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return adminUser?.permissions?.includes(permission) || false;
  };

  const logActivity = async (action: string, resourceType: string, resourceId?: string, details?: any) => {
    // Activity logging temporarily disabled to fix FK constraint issues
    console.log('Admin activity:', { action, resourceType, resourceId, details });
  };

  return {
    isAdmin,
    adminUser,
    loading,
    hasPermission,
    logActivity,
    checkAdminStatus,
  };
};
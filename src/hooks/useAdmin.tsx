import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  role: string;
  permissions: string[];
  created_at: string;
}

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
        .single();

      if (error && error.code !== 'PGRST116') {
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
    if (!adminUser) return;

    try {
      await supabase
        .from('admin_activity_log')
        .insert({
          admin_user_id: adminUser.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details: details || {}
        });
    } catch (error) {
      console.error('Error logging admin activity:', error);
    }
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
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Shield, Clock, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TreasuryAdminRole {
  id: string;
  user_id: string;
  role_type: string;
  granted_by: string;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
  access_reason: string;
  last_access_at: string | null;
  profiles?: {
    username: string;
    full_name: string;
  } | null;
}

export const TreasuryAdminManagement = () => {
  const [treasuryRoles, setTreasuryRoles] = useState<TreasuryAdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  
  // Form state for granting new access
  const [targetUserId, setTargetUserId] = useState('');
  const [roleType, setRoleType] = useState('treasury_admin');
  const [accessReason, setAccessReason] = useState('');
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);

  useEffect(() => {
    fetchTreasuryRoles();
    fetchUserProfiles();
  }, []);

  const fetchTreasuryRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('treasury_admin_roles')
        .select(`
          *,
          profiles!treasury_admin_roles_user_id_fkey(username, full_name)
        `)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      setTreasuryRoles((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching treasury roles:', error);
      toast({
        title: "Error",
        description: "Failed to load treasury admin roles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUserProfiles(data || []);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };

  const grantTreasuryAccess = async () => {
    if (!targetUserId || !accessReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a user and provide an access reason",
        variant: "destructive",
      });
      return;
    }

    setGranting(true);
    try {
      const { data, error } = await supabase.rpc('grant_treasury_admin_access', {
        target_user_id: targetUserId,
        role_type: roleType,
        access_reason: accessReason,
        expires_in_hours: expiresInHours
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Treasury Access Granted",
          description: `Successfully granted ${roleType} access`,
        });
        
        // Reset form
        setTargetUserId('');
        setAccessReason('');
        setExpiresInHours(null);
        
        // Refresh the list
        await fetchTreasuryRoles();
      } else {
        throw new Error(result?.error || 'Failed to grant access');
      }
    } catch (error: any) {
      console.error('Error granting treasury access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant treasury access",
        variant: "destructive",
      });
    } finally {
      setGranting(false);
    }
  };

  const revokeTreasuryAccess = async (userId: string, reason: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_treasury_access', {
        target_user_id: userId,
        revocation_reason: reason
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Treasury Access Revoked",
          description: "Successfully revoked treasury access",
        });
        await fetchTreasuryRoles();
      } else {
        throw new Error(result?.error || 'Failed to revoke access');
      }
    } catch (error: any) {
      console.error('Error revoking treasury access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke treasury access",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case 'treasury_admin':
        return <Shield className="w-4 h-4" />;
      case 'withdrawal_approver':
        return <UserCheck className="w-4 h-4" />;
      case 'financial_auditor':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getRoleColor = (roleType: string) => {
    switch (roleType) {
      case 'treasury_admin':
        return 'bg-red-100 text-red-800';
      case 'withdrawal_approver':
        return 'bg-blue-100 text-blue-800';
      case 'financial_auditor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grant Access Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Grant Treasury Admin Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>User</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {userProfiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || profile.username} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Role Type</Label>
              <Select value={roleType} onValueChange={setRoleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treasury_admin">Treasury Admin</SelectItem>
                  <SelectItem value="withdrawal_approver">Withdrawal Approver</SelectItem>
                  <SelectItem value="financial_auditor">Financial Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Access Reason (Required)</Label>
            <Textarea
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              placeholder="Explain why this user needs treasury access..."
              className="resize-none"
            />
          </div>

          <div>
            <Label>Expires After (Hours)</Label>
            <Input
              type="number"
              value={expiresInHours || ''}
              onChange={(e) => setExpiresInHours(e.target.value ? Number(e.target.value) : null)}
              placeholder="Leave empty for permanent access"
            />
          </div>

          <Button 
            onClick={grantTreasuryAccess} 
            disabled={granting}
            className="w-full"
          >
            {granting ? 'Granting Access...' : 'Grant Treasury Access'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Treasury Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Current Treasury Administrators</CardTitle>
        </CardHeader>
        <CardContent>
          {treasuryRoles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No treasury administrators found
            </p>
          ) : (
            <div className="space-y-4">
              {treasuryRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role.role_type)}
                      <Badge className={getRoleColor(role.role_type)}>
                        {role.role_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="font-semibold">
                        {role.profiles?.full_name || role.profiles?.username || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Granted: {format(new Date(role.granted_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                      {role.expires_at && (
                        <div className="text-sm text-orange-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires: {format(new Date(role.expires_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                      {role.last_access_at && (
                        <div className="text-sm text-muted-foreground">
                          Last access: {format(new Date(role.last_access_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!role.is_active ? (
                      <Badge variant="secondary">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Revoked
                      </Badge>
                    ) : role.expires_at && new Date(role.expires_at) < new Date() ? (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    
                    {role.is_active && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeTreasuryAccess(role.user_id, 'Manual revocation by super admin')}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TreasuryAdminManagement;
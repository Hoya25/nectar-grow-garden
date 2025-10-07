import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import UserDetailModal from './UserDetailModal';
import { 
  Users, 
  Search, 
  Shield,
  TrendingUp,
  Calendar,
  Mail,
  Eye,
  MoreHorizontal,
  Ban,
  AlertTriangle
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  wallet_address?: string;
  wallet_connected_at?: string;
  email?: string; // Only available when searching by email
}

interface UserPortfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  opportunity_status: string;
}

interface UserData extends UserProfile {
  portfolio?: UserPortfolio;
  is_admin?: boolean;
}

const UserManagement = () => {
  const { logActivity } = useAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailSearchTerm, setEmailSearchTerm] = useState('');
  const [searchByEmail, setSearchByEmail] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Use secure admin function instead of direct queries
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_admin_user_list');

      if (usersError) {
        throw usersError;
      }

      // Transform the data to match expected format
      const enrichedUsers: UserData[] = (usersData || []).map(user => ({
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
        wallet_address: user.wallet_address,
        wallet_connected_at: user.wallet_connected_at,
        portfolio: {
          available_nctr: user.available_nctr,
          pending_nctr: user.pending_nctr,
          total_earned: user.total_earned,
          opportunity_status: user.opportunity_status
        },
        is_admin: user.is_admin
      }));

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Access Denied",
        description: "Admin privileges required to view user data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsersByEmail = async () => {
    if (!emailSearchTerm.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email to search.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('Searching for email:', emailSearchTerm);
    try {
      const { data: usersData, error: usersError } = await supabase
        .rpc('search_users_by_email', { search_email: emailSearchTerm });

      console.log('Search results:', { usersData, usersError });

      if (usersError) throw usersError;

      const enrichedUsers: UserData[] = (usersData || []).map(user => ({
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        wallet_address: user.wallet_address,
        portfolio: {
          available_nctr: user.available_nctr,
          pending_nctr: 0,
          total_earned: user.total_earned,
          opportunity_status: user.opportunity_status
        },
        is_admin: user.is_admin
      }));

      setUsers(enrichedUsers);
      
      if (enrichedUsers.length === 0) {
        toast({
          title: "No Results",
          description: `No users found with email containing "${emailSearchTerm}".`,
        });
      } else {
        toast({
          title: "Search Complete",
          description: `Found ${enrichedUsers.length} user(s).`,
        });
      }
    } catch (error) {
      console.error('Error searching by email:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search users by email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = searchByEmail 
    ? users // When searching by email, show all results without additional filtering
    : users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const makeAdmin = async (user: UserData) => {
    if (!confirm(`Make ${user.full_name || user.username || 'this user'} an admin? They will have access to manage the platform.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.user_id,
          role: 'admin'
        });

      if (error) throw error;

      try {
        await logActivity('granted_admin', 'user', user.user_id, { 
          user_name: user.full_name || user.username,
          user_id: user.user_id
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }

      toast({
        title: "Admin Access Granted",
        description: `${user.full_name || user.username || 'User'} is now an admin.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error making user admin:', error);
      toast({
        title: "Error",
        description: "Failed to grant admin access.",
        variant: "destructive",
      });
    }
  };

  const removeAdmin = async (user: UserData) => {
    if (!confirm(`Remove admin access from ${user.full_name || user.username || 'this user'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', user.user_id);

      if (error) throw error;

      try {
        await logActivity('revoked_admin', 'user', user.user_id, { 
          user_name: user.full_name || user.username,
          user_id: user.user_id
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }

      toast({
        title: "Admin Access Revoked",
        description: `${user.full_name || user.username || 'User'} is no longer an admin.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error removing admin access:', error);
      toast({
        title: "Error",
        description: "Failed to remove admin access.",
        variant: "destructive",
      });
    }
  };

  const suspendUser = async (user: UserData) => {
    const reason = prompt(`Suspend ${user.full_name || user.username || 'this user'}?\n\nEnter reason for suspension:`);
    
    if (!reason) return;

    try {
      const { data, error } = await supabase.rpc('suspend_user_account', {
        p_user_id: user.user_id,
        p_reason: reason
      });

      if (error) throw error;

      try {
        await logActivity('suspended_user', 'user', user.user_id, { 
          user_name: user.full_name || user.username,
          user_id: user.user_id,
          reason
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }

      toast({
        title: "User Suspended",
        description: `${user.full_name || user.username || 'User'} has been suspended.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: "Error",
        description: "Failed to suspend user.",
        variant: "destructive",
      });
    }
  };

  const revokeNCTR = async (user: UserData) => {
    const reason = prompt(`Revoke NCTR from ${user.full_name || user.username || 'this user'}?\n\nEnter reason for revocation:`);
    
    if (!reason) return;

    try {
      const { data, error } = await supabase.rpc('revoke_fraudulent_nctr', {
        p_user_id: user.user_id,
        p_reason: reason
      });

      if (error) throw error;

      try {
        await logActivity('revoked_nctr', 'user', user.user_id, { 
          user_name: user.full_name || user.username,
          user_id: user.user_id,
          reason
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }

      toast({
        title: "NCTR Revoked",
        description: `All NCTR has been revoked from ${user.full_name || user.username || 'User'}.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error revoking NCTR:', error);
      toast({
        title: "Error",
        description: "Failed to revoke NCTR.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'premium': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      case 'platinum': return 'bg-gradient-to-r from-slate-300 to-slate-400';
      case 'advanced': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default: return 'bg-gradient-to-r from-green-400 to-green-600';
    }
  };

  const openUserDetail = (user: UserData) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
    setIsDetailModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold">User Management</h3>
            <p className="text-muted-foreground">View and manage platform users</p>
          </div>
        </div>

        {/* Search Controls */}
        <div className="flex gap-2 items-center">
          <Button
            variant={!searchByEmail ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSearchByEmail(false);
              setEmailSearchTerm('');
              fetchUsers();
            }}
          >
            Search by Name
          </Button>
          <Button
            variant={searchByEmail ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchByEmail(true)}
          >
            <Mail className="w-4 h-4 mr-1" />
            Search by Email
          </Button>
        </div>

        {searchByEmail ? (
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter email to search..."
                value={emailSearchTerm}
                onChange={(e) => setEmailSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsersByEmail()}
                className="pl-10"
              />
            </div>
            <Button onClick={searchUsersByEmail}>
              <Search className="w-4 h-4 mr-1" />
              Search
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setEmailSearchTerm('');
                fetchUsers();
              }}
            >
              Clear
            </Button>
          </div>
        ) : (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="animate-pulse flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No users match your search.' : 'No users found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="bg-card/80 backdrop-blur-sm hover:shadow-glow transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url} alt={user.full_name} />
                      <AvatarFallback>
                        {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : 
                         user.username ? user.username[0].toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">
                          {user.full_name || user.username || 'Anonymous User'}
                        </h4>
                        {user.is_admin && (
                          <Badge variant="secondary" className="bg-gradient-hero text-foreground border-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.portfolio && (
                          <Badge className={`${getStatusColor(user.portfolio.opportunity_status)} text-foreground border-0`}>
                            {user.portfolio.opportunity_status.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {user.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        )}
                        {user.username && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            @{user.username}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        {user.wallet_address && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Wallet Connected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Stats */}
                  {user.portfolio && (
                    <div className="grid grid-cols-3 gap-4 text-center mr-6">
                      <div>
                        <div className="text-sm text-muted-foreground">Available</div>
                        <div className="font-semibold text-foreground">
                          {user.portfolio.available_nctr.toFixed(2)} NCTR
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Locked</div>
                        <div className="font-semibold text-orange-500">
                          {user.portfolio.pending_nctr.toFixed(2)} NCTR
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Earned</div>
                        <div className="font-semibold text-green-500">
                          {user.portfolio.total_earned.toFixed(2)} NCTR
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openUserDetail(user)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => suspendUser(user)}
                      className="flex items-center gap-1"
                    >
                      <Ban className="w-4 h-4" />
                      Suspend
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => revokeNCTR(user)}
                      className="flex items-center gap-1 text-orange-600 border-orange-600 hover:bg-orange-50"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Revoke NCTR
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.is_admin ? (
                          <DropdownMenuItem 
                            onClick={() => removeAdmin(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Remove Admin Access
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => makeAdmin(user)}>
                            <Shield className="w-4 h-4 mr-2" />
                            Grant Admin Access
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isOpen={isDetailModalOpen}
          onClose={closeUserDetail}
        />
      )}
    </div>
  );
};

export default UserManagement;
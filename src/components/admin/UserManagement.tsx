import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  MoreHorizontal
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
  // Note: email is no longer included for security reasons
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
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch user profiles using secure admin function (no email access)
      const { data: profiles, error: profilesError } = await supabase
        .rpc('get_admin_safe_profiles');

      if (profilesError) throw profilesError;

      // Fetch portfolios for all users
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('nctr_portfolio')
        .select('*');

      if (portfoliosError) throw portfoliosError;

      // Fetch admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id');

      if (adminError && adminError.code !== 'PGRST116') {
        console.error('Error fetching admin users:', adminError);
      }

      // Combine data
      const enrichedUsers: UserData[] = profiles.map(profile => {
        const portfolio = portfolios.find(p => p.user_id === profile.user_id);
        const isAdmin = adminUsers?.some(admin => admin.user_id === profile.user_id);
        
        return {
          ...profile,
          portfolio,
          is_admin: isAdmin
        };
      });

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. This may be due to security restrictions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
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

      await logActivity('granted_admin', 'user', user.user_id, { 
        user_name: user.full_name || user.username,
        user_id: user.user_id
      });

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

      await logActivity('revoked_admin', 'user', user.user_id, { 
        user_name: user.full_name || user.username,
        user_id: user.user_id
      });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">User Management</h3>
          <p className="text-muted-foreground">View and manage platform users</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openUserDetail(user)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                    {user.is_admin ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeAdmin(user)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove Admin
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => makeAdmin(user)}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Make Admin
                      </Button>
                    )}
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
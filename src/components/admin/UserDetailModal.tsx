import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  User, 
  Wallet, 
  Activity, 
  TrendingUp, 
  Lock, 
  Calendar, 
  Mail,
  Shield,
  Copy,
  ExternalLink,
  Users,
  Gift
} from 'lucide-react';
import { format } from 'date-fns';
import UserActivityView from './UserActivityView';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  email: string;
  created_at: string;
  updated_at: string;
  wallet_address?: string;
  wallet_connected_at?: string;
}

interface UserPortfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  lock_90_nctr: number;
  lock_360_nctr: number;
  opportunity_status: string;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  total_transactions: number;
  total_referrals: number;
  successful_referrals: number;
  active_locks: number;
  last_activity?: string;
}

interface UserDetailModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

const UserDetailModal = ({ user, isOpen, onClose }: UserDetailModalProps) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPortfolio, setUserPortfolio] = useState<UserPortfolio | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserDetails();
    }
  }, [isOpen, user]);

  const fetchUserDetails = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch detailed profile using secure function
      const { data: sensitiveProfile, error: profileError } = await supabase
        .rpc('get_sensitive_profile_data', { target_user_id: user.user_id });

      if (profileError) {
        console.error('Error fetching sensitive profile:', profileError);
        // Fallback to basic profile data
        setUserProfile({
          id: user.id,
          user_id: user.user_id,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          email: 'Access restricted',
          created_at: user.created_at,
          updated_at: user.updated_at,
          wallet_address: user.wallet_address,
          wallet_connected_at: user.wallet_connected_at
        });
      } else if (sensitiveProfile && sensitiveProfile.length > 0) {
        const profile = sensitiveProfile[0];
        setUserProfile({
          id: user.id,
          user_id: profile.user_id,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          email: profile.email || 'No email',
          created_at: user.created_at,
          updated_at: user.updated_at,
          wallet_address: profile.wallet_address,
          wallet_connected_at: profile.wallet_connected_at
        });
      }

      // Fetch portfolio details
      const { data: portfolio, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('*')
        .eq('user_id', user.user_id)
        .single();

      if (!portfolioError && portfolio) {
        setUserPortfolio(portfolio);
      }

      // Fetch user statistics
      const [transactionsResult, referralsResult, locksResult] = await Promise.all([
        supabase
          .from('nctr_transactions')
          .select('id, created_at')
          .eq('user_id', user.user_id),
        supabase
          .from('referrals')
          .select('id, status, reward_credited')
          .eq('referrer_user_id', user.user_id),
        supabase
          .from('nctr_locks')
          .select('id, status')
          .eq('user_id', user.user_id)
          .eq('status', 'active')
      ]);

      const transactions = transactionsResult.data || [];
      const referrals = referralsResult.data || [];
      const locks = locksResult.data || [];

      const successfulReferrals = referrals.filter(r => r.status === 'completed' && r.reward_credited).length;
      const lastActivity = transactions.length > 0 
        ? transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : undefined;

      setUserStats({
        total_transactions: transactions.length,
        total_referrals: referrals.length,
        successful_referrals: successfulReferrals,
        active_locks: locks.length,
        last_activity: lastActivity
      });

    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: "Error",
        description: "Failed to load user details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'vip': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'premium': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      case 'platinum': return 'bg-gradient-to-r from-slate-300 to-slate-400';
      case 'advanced': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default: return 'bg-gradient-to-r from-green-400 to-green-600';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>
                {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : 
                 user.username ? user.username[0].toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span>{user.full_name || user.username || 'Anonymous User'}</span>
                {user.is_admin && (
                  <Badge variant="secondary" className="bg-gradient-hero text-foreground border-0">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {userPortfolio && (
                  <Badge className={`${getStatusColor(userPortfolio.opportunity_status)} text-foreground border-0`}>
                    {userPortfolio.opportunity_status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">User Details & Activity</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userProfile?.full_name && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Full Name:</span>
                        <span className="font-medium">{userProfile.full_name}</span>
                      </div>
                    )}
                    {userProfile?.username && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Username:</span>
                        <span className="font-medium">@{userProfile.username}</span>
                      </div>
                    )}
                    {userProfile?.email && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{userProfile.email}</span>
                          {userProfile.email !== 'Access restricted' && userProfile.email !== 'No email' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(userProfile.email, 'Email')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">User ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{user.user_id.substring(0, 8)}...</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(user.user_id, 'User ID')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Joined:</span>
                      <span className="font-medium">{format(new Date(user.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    {userStats?.last_activity && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Last Activity:</span>
                        <span className="font-medium">{format(new Date(userStats.last_activity), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Wallet Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Wallet Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userProfile?.wallet_address ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Connected
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Address:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {userProfile.wallet_address.substring(0, 6)}...{userProfile.wallet_address.substring(-4)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(userProfile.wallet_address!, 'Wallet Address')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://basescan.org/address/${userProfile.wallet_address}`, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {userProfile.wallet_connected_at && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Connected:</span>
                            <span className="font-medium">{format(new Date(userProfile.wallet_connected_at), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No wallet connected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              {userStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{userStats.total_transactions}</div>
                        <div className="text-sm text-muted-foreground">Transactions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">{userStats.successful_referrals}</div>
                        <div className="text-sm text-muted-foreground">Successful Referrals</div>
                      </div>
                      <div className="text-2xl font-bold text-orange-500 text-center">
                        <div>{userStats.active_locks}</div>
                        <div className="text-sm text-muted-foreground">Active Locks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">{userStats.total_referrals}</div>
                        <div className="text-sm text-muted-foreground">Total Referrals</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-6">
              {userPortfolio ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        Available NCTR
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {userPortfolio.available_nctr.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">Ready for withdrawal</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Lock className="w-4 h-4" />
                        Locked NCTR
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {(userPortfolio.lock_90_nctr + userPortfolio.lock_360_nctr).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>90LOCK: {userPortfolio.lock_90_nctr.toFixed(2)}</div>
                        <div>360LOCK: {userPortfolio.lock_360_nctr.toFixed(2)}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <Gift className="w-4 h-4" />
                        Total Earned
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        {userPortfolio.total_earned.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">Lifetime earnings</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No portfolio data found</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity">
              <UserActivityView userId={user.user_id} />
            </TabsContent>

            <TabsContent value="referrals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Referral Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userStats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{userStats.total_referrals}</div>
                        <div className="text-sm text-muted-foreground">Total Referrals</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{userStats.successful_referrals}</div>
                        <div className="text-sm text-muted-foreground">Successful Referrals</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No referral data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailModal;
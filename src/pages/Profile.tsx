import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, Mail, Calendar, Wallet, Shield, Lock, Eye, EyeOff, TrendingUp, ExternalLink, History, Users, Check, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import WalletConnection from '@/components/WalletConnection';
import { CrescendoStatusBar } from '@/components/CrescendoStatusBar';
import { LevelUpModal } from '@/components/LevelUpModal';
import { CollapsibleDashboard } from '@/components/CollapsibleDashboard';
import { BuyNCTRButton } from '@/components/BuyNCTRButton';
import { PortfolioStory } from '@/components/PortfolioStory';
import ReferralSystem from '@/components/ReferralSystem';
import { BaseBadge } from '@/components/BaseBadge';
import { WithdrawalModal } from '@/components/WithdrawalModal';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  wallet_connected_at: string | null;
  crescendo_user_id: string | null;
  crescendo_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Portfolio {
  opportunity_status: string;
  available_nctr: number;
  total_earned: number;
  lock_360_nctr: number;
  lock_90_nctr: number;
  pending_nctr: number;
  alliance_tokens?: Record<string, {
    name: string;
    symbol: string;
    amount: number;
    logo_url?: string;
  }> | null;
}

interface StatusLevel {
  status_name: string;
  min_locked_nctr: number;
  reward_multiplier: number;
  description: string;
  benefits: string[];
}

interface WithdrawalRequest {
  id: string;
  nctr_amount: number;
  net_amount_nctr: number;
  gas_fee_nctr: number;
  wallet_address: string;
  status: string;
  transaction_hash: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [locks, setLocks] = useState<any[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);
  const [statusLevels, setStatusLevels] = useState<StatusLevel[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    avatar_url: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfileData();
  }, [user, navigate]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('opportunity_status, available_nctr, total_earned, lock_360_nctr, lock_90_nctr, pending_nctr, alliance_tokens')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (portfolioError && portfolioError.code !== 'PGRST116') {
        console.error('Portfolio error:', portfolioError);
      }

      // Fetch lock commitments
      const { data: locksData, error: locksError } = await supabase
        .from('nctr_locks')
        .select('*, lock_category, commitment_days')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (locksError) {
        console.error('Locks error:', locksError);
      } else {
        setLocks(locksData || []);
      }

      // Fetch status levels
      const { data: statusLevelsData, error: statusLevelsError } = await supabase
        .from('opportunity_status_levels')
        .select('*')
        .order('min_locked_nctr', { ascending: true });

      if (statusLevelsError) {
        console.error('Status levels error:', statusLevelsError);
      }

      // Fetch withdrawal history
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (withdrawalError) {
        console.error('Withdrawal history error:', withdrawalError);
      } else {
        setWithdrawalHistory(withdrawalData || []);
      }

      // Check admin status
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      setProfile(profileData);
      setPortfolio(portfolioData as Portfolio);
      setStatusLevels(statusLevelsData || []);
      setIsAdmin(!!adminData);

      if (profileData) {
        setFormData({
          username: profileData.username || '',
          full_name: profileData.full_name || '',
          avatar_url: profileData.avatar_url || ''
        });
      }

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error Loading Profile",
        description: error.message || "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          username: formData.username || null,
          full_name: formData.full_name || null,
          avatar_url: formData.avatar_url || null,
          email: user.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });

      setEditMode(false);
      fetchProfileData(); // Refresh data

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setChangingPassword(true);
    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordForm.currentPassword
      });

      if (verifyError) {
        toast({
          title: "Current Password Incorrect",
          description: "Please enter your current password correctly",
          variant: "destructive"
        });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed",
      });

      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswords({
        current: false,
        new: false,
        confirm: false
      });

    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'processing': return 'outline';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const openTransactionInExplorer = (txHash: string) => {
    window.open(`https://basescan.org/tx/${txHash}`, '_blank');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'starter': return 'bg-gray-600';
      case 'bronze': return 'bg-amber-700';
      case 'silver': return 'bg-gray-400';
      case 'gold': return 'bg-yellow-500';
      case 'platinum': return 'bg-slate-400';
      case 'diamond': return 'bg-blue-500';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/garden')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Garden
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="default"
                onClick={() => {
                  toast({
                    title: "Action Triggered!",
                    description: "Your new button is working",
                  });
                }}
              >
                New Action
              </Button>
              <Button 
                variant="outline"
                onClick={() => signOut()}
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* PRIORITY: Invite Friends - Best Way to Earn NCTR */}
        <div className="mb-8">
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="text-primary">Best Way to Earn NCTR:</span> Invite Friends
                </div>
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Earn the most NCTR by inviting friends to join The Garden! You and your friends both get rewarded.
              </p>
            </CardHeader>
            <CardContent>
              <ReferralSystem />
            </CardContent>
          </Card>
        </div>

        {/* Wings Status Bar - Prominent Position */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <CrescendoStatusBar
                currentStatus={portfolio?.opportunity_status || 'starter'}
                current360NCTR={parseFloat(portfolio?.lock_360_nctr?.toString() || '0')}
                statusLevels={statusLevels}
              />
            </div>
            
            {/* Buy NCTR Button */}
            <BuyNCTRButton
              variant="default"
              size="lg"
              className="whitespace-nowrap"
              currentStatus={portfolio?.opportunity_status || 'starter'}
              current360Lock={portfolio?.lock_360_nctr || 0}
              onPurchaseComplete={fetchProfileData}
            />
          </div>
        </div>

        {/* Portfolio Story - Prominent Position */}
        <div className="mb-8">
          <Card className="bg-card/80 backdrop-blur-sm">
            <PortfolioStory userId={user?.id || ''} refreshKey={refreshKey} />
          </Card>
        </div>

        {/* Wallet Connection - Only show prominently if not connected */}
        {!profile?.wallet_address && (
          <div className="mb-8">
            <Card className="bg-card/80 backdrop-blur-sm border-2 border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Connect Your Coinbase Wallet
                  </CardTitle>
                  <BaseBadge size="sm" variant="light" />
                </div>
              </CardHeader>
              <CardContent>
                <WalletConnection />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-foreground" />
                    Personal Information
                  </CardTitle>
                  {!editMode ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditMode(false);
                          if (profile) {
                            setFormData({
                              username: profile.username || '',
                              full_name: profile.full_name || '',
                              avatar_url: profile.avatar_url || ''
                            });
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                      {profile?.full_name ? getInitials(profile.full_name) : 
                       profile?.username ? getInitials(profile.username) : 
                       user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {profile?.full_name || profile?.username || 'Anonymous User'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Member since {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    {editMode ? (
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="p-2 text-sm">{profile?.full_name || 'Not set'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    {editMode ? (
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
                        placeholder="Enter your username"
                      />
                    ) : (
                      <p className="p-2 text-sm">{profile?.username || 'Not set'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-2 p-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{user?.email}</p>
                    </div>
                  </div>

                  {editMode && (
                    <div className="space-y-2">
                      <Label htmlFor="avatar_url">Avatar URL</Label>
                      <Input
                        id="avatar_url"
                        value={formData.avatar_url}
                        onChange={(e) => setFormData(prev => ({...prev, avatar_url: e.target.value}))}
                        placeholder="Enter avatar image URL"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-foreground" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Change Password</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                          placeholder="Enter current password"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                          placeholder="Enter new password"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                          placeholder="Confirm new password"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="w-full"
                  >
                    {changingPassword ? "Changing Password..." : "Change Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-foreground" />
                  Withdrawal History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalHistory.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No withdrawal requests yet</p>
                    <p className="text-sm">Your withdrawal history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Transaction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawalHistory.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{withdrawal.nctr_amount.toFixed(2)} NCTR</div>
                                <div className="text-xs text-muted-foreground">
                                  Net: {withdrawal.net_amount_nctr.toFixed(2)} NCTR
                                  {withdrawal.gas_fee_nctr > 0 && (
                                    <span> (Gas: {withdrawal.gas_fee_nctr.toFixed(2)} NCTR)</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(withdrawal.status)}>
                                {withdrawal.status.toUpperCase()}
                              </Badge>
                              {withdrawal.failure_reason && (
                                <div className="text-xs text-destructive mt-1">
                                  {withdrawal.failure_reason}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm">{formatDate(withdrawal.created_at)}</div>
                                {withdrawal.processed_at && (
                                  <div className="text-xs text-muted-foreground">
                                    Processed: {formatDate(withdrawal.processed_at)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {withdrawal.transaction_hash ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openTransactionInExplorer(withdrawal.transaction_hash!)}
                                  className="h-auto p-1 text-xs hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View on BaseScan
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {withdrawal.status === 'pending' ? 'Waiting...' : 'No transaction'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-foreground" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status Level</span>
                    <Badge className={`${getStatusColor(portfolio?.opportunity_status || 'starter')} text-white border-0`}>
                      {portfolio?.opportunity_status?.toUpperCase() || 'STARTER'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Type</span>
                    <Badge variant={isAdmin ? "default" : "secondary"}>
                      {isAdmin ? "Admin" : "Member"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Wallet Status</span>
                    <Badge variant={profile?.wallet_address ? "default" : "outline"}>
                      {profile?.wallet_address ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Crescendo Sync</span>
                    {profile?.crescendo_user_id ? (
                      <div className="flex items-center text-green-600 text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        Synced
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600 text-sm">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Not Synced
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NCTR Summary */}
            {portfolio && (
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5 text-foreground" />
                    NCTR Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-3">
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-muted-foreground">Available</span>
                       <span className="font-semibold text-foreground">
                         {portfolio.available_nctr.toFixed(2)} NCTR
                       </span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-muted-foreground">360LOCK Balance</span>
                       <span className="font-semibold text-primary">
                         {(portfolio.lock_360_nctr || 0).toFixed(2)} NCTR
                       </span>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-muted-foreground">Total Earned</span>
                       <span className="font-semibold text-green-600">
                         {portfolio.total_earned.toFixed(2)} NCTR
                       </span>
                     </div>
                   </div>

                   <Separator />

                   <Button 
                     variant="default" 
                     className="w-full"
                     onClick={() => setWithdrawalModalOpen(true)}
                     disabled={!portfolio.available_nctr || portfolio.available_nctr <= 0 || !profile?.wallet_address}
                   >
                     <Wallet className="h-4 w-4 mr-2" />
                     Withdraw NCTR
                   </Button>

                   {(!profile?.wallet_address) && (
                     <p className="text-xs text-muted-foreground text-center">
                       Connect wallet to enable withdrawals
                     </p>
                   )}
                 </CardContent>
               </Card>
             )}

             {/* Alliance Tokens */}
             {portfolio && portfolio.alliance_tokens && Object.keys(portfolio.alliance_tokens).length > 0 && (
               <Card className="bg-card/80 backdrop-blur-sm border-2 border-primary/20">
                 <CardHeader className="pb-4">
                   <CardTitle className="flex items-center gap-2 text-lg">
                     <TrendingUp className="h-5 w-5 text-primary" />
                     Alliance Token Bonuses
                   </CardTitle>
                   <p className="text-xs text-muted-foreground">
                     {Object.values(portfolio.alliance_tokens).map(t => t.name).join(', ')} earned through partnerships
                   </p>
                 </CardHeader>
                 <CardContent className="space-y-3">
                   {Object.entries(portfolio.alliance_tokens).map(([key, token]) => (
                     <div key={key} className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                       <div className="flex items-center gap-3">
                         {token.logo_url && (
                           <img 
                             src={token.logo_url} 
                             alt={token.name}
                             className="w-10 h-10 rounded-full"
                           />
                         )}
                         <div>
                           <div className="font-bold text-foreground text-base">{token.name}</div>
                           <div className="text-sm text-muted-foreground font-medium">{token.symbol}</div>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="font-bold text-primary text-lg">
                           {token.amount.toFixed(4)}
                         </div>
                         <div className="text-sm text-muted-foreground font-medium">{token.symbol}</div>
                       </div>
                     </div>
                   ))}
                 </CardContent>
               </Card>
             )}

             {/* Wallet Connection if connected */}
             {profile?.wallet_address && (
               <Card className="bg-card/80 backdrop-blur-sm">
                 <CardHeader className="pb-4">
                   <div className="flex items-center justify-between">
                     <CardTitle className="flex items-center gap-2 text-lg">
                       <Wallet className="h-5 w-5 text-foreground" />
                       Coinbase Wallet
                     </CardTitle>
                     <BaseBadge size="sm" variant="light" />
                   </div>
                  </CardHeader>
                  <CardContent>
                    <WalletConnection />
                  </CardContent>
                </Card>
              )}

            {/* NCTR Contract Information */}
            <Card className="bg-card/80 backdrop-blur-sm border-2 border-amber-500/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-amber-600">
                  <Shield className="h-5 w-5" />
                  Official NCTR Contract
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ OFFICIAL CONTRACT ADDRESS
                  </p>
                  <div className="bg-white dark:bg-gray-900 p-3 rounded border font-mono text-sm break-all">
                    0x973104fAa7F2B11787557e85953ECA6B4e262328
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                    This is the ONLY official NCTR token contract. Do not confuse with any other crypto tokens that may have the same name. Always verify the contract address before any transactions.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Connected Wallet Management - Lower Priority */}
            {profile?.wallet_address && (
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      Wallet Management
                    </CardTitle>
                    <BaseBadge size="sm" variant="light" />
                  </div>
                </CardHeader>
                <CardContent>
                  <WalletConnection />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={withdrawalModalOpen}
        onClose={() => {
          setWithdrawalModalOpen(false);
          fetchProfileData(); // Refresh data after withdrawal
        }}
        availableNCTR={portfolio?.available_nctr || 0}
        walletAddress={profile?.wallet_address || undefined}
      />
    </div>
  );
};

export default Profile;
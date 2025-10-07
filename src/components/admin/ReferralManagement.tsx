import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, TrendingUp, Gift, Clock, CheckCircle, AlertTriangle, Shield, UserCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ReferralData {
  id: string;
  referral_code: string;
  status: string;
  reward_credited: boolean;
  created_at: string;
  rewarded_at: string | null;
  referrer_name: string | null;
  referrer_email: string;
  referee_name: string | null;
  referee_email: string;
  referee_profile_complete: boolean;
  referee_has_transactions: boolean;
  referee_transaction_count: number;
  referee_nctr_earned: number;
  referee_account_age_days: number;
  referee_wallet_connected: boolean;
  same_day_signup: boolean;
}

interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_rewards_paid: number;
}

const ReferralManagement = () => {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    completed_referrals: 0,
    pending_referrals: 0,
    total_rewards_paid: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);

      // Use the new verification function to get referrals with verification data
      const { data: referralsData, error } = await supabase.rpc('get_referral_verification_data');

      if (error) {
        console.error('Error fetching referral data with verification:', error);
        throw error;
      }

      console.log('Fetched referrals with verification data:', referralsData);

      // Transform data for display
      const transformedReferrals: ReferralData[] = (referralsData || []).map(referral => ({
        id: referral.referral_id,
        referral_code: referral.referral_code,
        status: referral.status,
        reward_credited: referral.reward_credited,
        created_at: referral.created_at,
        rewarded_at: referral.rewarded_at,
        referrer_name: referral.referrer_name || null,
        referrer_email: referral.referrer_email || '',
        referee_name: referral.referee_name || null,
        referee_email: referral.referee_email || '',
        referee_profile_complete: referral.referee_profile_complete || false,
        referee_has_transactions: referral.referee_has_transactions || false,
        referee_transaction_count: referral.referee_transaction_count || 0,
        referee_nctr_earned: referral.referee_nctr_earned || 0,
        referee_account_age_days: referral.referee_account_age_days || 0,
        referee_wallet_connected: referral.referee_wallet_connected || false,
        same_day_signup: referral.same_day_signup || false
      }));

      setReferrals(transformedReferrals);

      // Calculate stats
      const totalReferrals = transformedReferrals.length;
      const completedReferrals = transformedReferrals.filter(r => r.reward_credited).length;
      const pendingReferrals = totalReferrals - completedReferrals;
      const totalRewardsPaid = completedReferrals * 2000; // 1000 NCTR each for referrer and referee

      setStats({
        total_referrals: totalReferrals,
        completed_referrals: completedReferrals,
        pending_referrals: pendingReferrals,
        total_rewards_paid: totalRewardsPaid
      });

    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(referral =>
    referral.referrer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.referrer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.referee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.referee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (referral: ReferralData) => {
    if (referral.reward_credited) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Rewarded
      </Badge>;
    } else if (referral.status === 'completed') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>;
    } else {
      return <Badge variant="secondary">
        {referral.status}
      </Badge>;
    }
  };

  const getRiskLevel = (referral: ReferralData) => {
    let riskScore = 0;
    
    // Risk indicators
    if (!referral.referee_profile_complete) riskScore += 2;
    if (!referral.referee_has_transactions) riskScore += 2;
    if (!referral.referee_wallet_connected) riskScore += 1;
    if (referral.referee_account_age_days < 1) riskScore += 2;
    if (referral.same_day_signup) riskScore += 1;
    
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  };

  const getVerificationBadge = (referral: ReferralData) => {
    const riskLevel = getRiskLevel(referral);
    
    if (riskLevel === 'high') {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        High Risk
      </Badge>;
    } else if (riskLevel === 'medium') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
        <Shield className="w-3 h-3" />
        Medium Risk
      </Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
        <UserCheck className="w-3 h-3" />
        Verified
      </Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NCTR Rewarded</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.total_rewards_paid.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Referral Activity
            </CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search referrals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchReferralData} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReferrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No referrals match your search.' : 'No referrals found.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rewarded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {referral.referrer_name?.charAt(0) || referral.referrer_email?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {referral.referrer_name || 'No name'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {referral.referrer_email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {referral.referee_name?.charAt(0) || referral.referee_email?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {referral.referee_name || 'No name'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {referral.referee_email}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Age: {referral.referee_account_age_days}d
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getVerificationBadge(referral)}
                          <div className="flex gap-1 mt-1">
                            {referral.referee_profile_complete && (
                              <Badge variant="outline" className="text-xs">Profile ✓</Badge>
                            )}
                            {referral.referee_wallet_connected && (
                              <Badge variant="outline" className="text-xs">Wallet ✓</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1">
                            {referral.referee_has_transactions ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-yellow-600" />
                            )}
                            <span className="text-xs">
                              {referral.referee_transaction_count} txns
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {referral.referee_nctr_earned.toFixed(2)} NCTR
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {referral.referral_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(referral.created_at)}
                        </div>
                        {referral.same_day_signup && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Same day
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(referral)}
                      </TableCell>
                      <TableCell>
                        {referral.rewarded_at ? (
                          <div className="text-sm text-green-600">
                            {formatDate(referral.rewarded_at)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
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
  );
};

export default ReferralManagement;
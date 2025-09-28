import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users,
  Search,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface SuperAdminReferral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  reward_credited: boolean;
  created_at: string;
  rewarded_at?: string;
  referrer_email: string;
  referrer_name: string;
  referee_email: string;
  referee_name: string;
  referrer_ip_address: string;
  referrer_user_agent: string;
  total_referrals_by_user: number;
}

interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  total_rewards_paid: number;
  top_referrers: Array<{
    email: string;
    name: string;
    count: number;
  }>;
}

const SuperAdminReferralTracking = () => {
  const [referrals, setReferrals] = useState<SuperAdminReferral[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    completed_referrals: 0,
    total_rewards_paid: 0,
    top_referrers: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReferralTracking();
  }, []);

  const fetchReferralTracking = async (targetUserId?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_super_admin_referral_tracking', {
        target_user_id: targetUserId || null
      });

      if (error) {
        throw error;
      }

      setReferrals(data || []);
      
      // Calculate stats
      const totalReferrals = data?.length || 0;
      const completedReferrals = data?.filter((r: SuperAdminReferral) => r.reward_credited).length || 0;
      const totalRewardsPaid = completedReferrals * 2000; // 1000 NCTR each for referrer and referee

      // Calculate top referrers
      const referrerCounts = new Map();
      data?.forEach((r: SuperAdminReferral) => {
        const key = r.referrer_email;
        if (!referrerCounts.has(key)) {
          referrerCounts.set(key, { 
            email: r.referrer_email, 
            name: r.referrer_name, 
            count: 0 
          });
        }
        if (r.reward_credited) {
          referrerCounts.get(key).count++;
        }
      });

      const topReferrers = Array.from(referrerCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        total_referrals: totalReferrals,
        completed_referrals: completedReferrals,
        total_rewards_paid: totalRewardsPaid,
        top_referrers: topReferrers
      });

      toast({
        title: "Referral Tracking Loaded",
        description: `Loaded ${totalReferrals} referrals with super admin access`,
      });

    } catch (error: any) {
      console.error('Error fetching referral tracking:', error);
      toast({
        title: "Access Denied", 
        description: error.message || "Super admin privileges required for referral tracking access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(ref =>
    ref.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referrer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (referral: SuperAdminReferral) => {
    if (referral.reward_credited) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Rewarded
      </Badge>;
    } else if (referral.status === 'completed') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending Reward
      </Badge>;
    } else {
      return <Badge variant="secondary">
        {referral.status}
      </Badge>;
    }
  };

  const exportReferrals = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Referrer Email,Referrer Name,Referee Email,Referee Name,Code,Status,Rewarded,Created,Rewarded Date,Total Referrals\n"
      + filteredReferrals.map(ref => 
          `${ref.id},${ref.referrer_email},${ref.referrer_name},${ref.referee_email},${ref.referee_name},${ref.referral_code},${ref.status},${ref.reward_credited},${ref.created_at},${ref.rewarded_at || ''},${ref.total_referrals_by_user}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `referral_tracking_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Security Warning */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <Shield className="w-5 h-5" />
            <strong>SUPER ADMIN ACCESS ONLY</strong>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-sm text-red-600 mt-1">
            This sensitive referral data is restricted to anderson@projectbutterfly.io only. 
            All access is logged for security audit.
          </p>
        </CardContent>
      </Card>

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
            <CardTitle className="text-sm font-medium">Completed & Rewarded</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed_referrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NCTR Paid Out</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.total_rewards_paid.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Referrer</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-600">
              {stats.top_referrers[0]?.count || 0} referrals
            </div>
            {stats.top_referrers[0] && (
              <div className="text-xs text-muted-foreground">
                {stats.top_referrers[0].name}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Referral Tracking ({filteredReferrals.length})
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
              <Button onClick={exportReferrals} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
              <Button onClick={() => fetchReferralTracking()} variant="outline" size="sm">
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
            <div className="space-y-3">
              {filteredReferrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Referrer */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {referral.referrer_name?.charAt(0) || referral.referrer_email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{referral.referrer_name}</div>
                        <div className="text-xs text-muted-foreground">{referral.referrer_email}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {referral.total_referrals_by_user} total referrals
                        </Badge>
                      </div>
                    </div>

                    <div className="text-muted-foreground">→</div>

                    {/* Referee */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {referral.referee_name?.charAt(0) || referral.referee_email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{referral.referee_name}</div>
                        <div className="text-xs text-muted-foreground">{referral.referee_email}</div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {referral.referral_code}
                        </Badge>
                        {getStatusBadge(referral)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {format(new Date(referral.created_at), 'MMM dd, yyyy')}
                        {referral.rewarded_at && (
                          <> • Rewarded: {format(new Date(referral.rewarded_at), 'MMM dd, yyyy')}</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reward Info */}
                  <div className="text-right">
                    {referral.reward_credited && (
                      <div className="text-lg font-bold text-green-600">
                        +2000 NCTR
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {referral.reward_credited ? 'Paid Out' : 'Pending'}
                    </div>
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

export default SuperAdminReferralTracking;
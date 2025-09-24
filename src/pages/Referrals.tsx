import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Award, Copy, Share2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ReferralData {
  id: string;
  referred_user_id: string;
  created_at: string;
  rewarded_at: string | null;
  referral_code: string;
  referred_name: string;
  referred_email?: string;
  join_date?: string;
  status: string;
  reward_credited: boolean;
}

const Referrals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    totalRewards: 0
  });

  useEffect(() => {
    if (user) {
      const userCode = user.id.substring(0, 8).toUpperCase();
      setReferralCode(userCode);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchUserReferrals();
    }
  }, [user?.id]);

  const fetchUserReferrals = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    
    try {
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) {
        console.error('Error fetching referrals:', referralsError);
        throw referralsError;
      }

      if (!referralsData || referralsData.length === 0) {
        setReferrals([]);
        setStats({ total: 0, completed: 0, pending: 0, totalRewards: 0 });
        return;
      }

      const userIds = referralsData.map(r => r.referred_user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const enrichedReferrals = referralsData.map(referral => {
        const profile = profilesData?.find(p => p.user_id === referral.referred_user_id);
        return {
          ...referral,
          referred_name: profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Unknown User',
          referred_email: profile?.email || '',
          join_date: profile?.created_at || referral.created_at,
        };
      });

      setReferrals(enrichedReferrals);

      const completed = enrichedReferrals.filter(r => r.status === 'completed' && r.reward_credited).length;
      const pending = enrichedReferrals.length - completed;
      
      setStats({
        total: enrichedReferrals.length,
        completed,
        pending,
        totalRewards: completed * 1000
      });

    } catch (error) {
      console.error('Error in fetchUserReferrals:', error);
      toast({
        title: "Error",
        description: "Failed to load your invites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copied!",
      description: "Your referral code has been copied to clipboard.",
    });
  };

  const shareReferralLink = () => {
    const referralUrl = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(referralUrl);
    toast({
      title: "Link Copied!",
      description: "Your referral link has been copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/garden')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Garden
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              My Invites ({stats.total})
            </h1>
            <p className="text-muted-foreground">Track your referrals and rewards</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading your referrals...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Referral Code Section */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Your Invite Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-mono font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
                    {referralCode}
                  </div>
                  <Button variant="outline" size="sm" onClick={copyReferralCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={shareReferralLink}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with friends to earn 1000 NCTR for each successful signup!
                </p>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-foreground mb-2">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Invites</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{stats.totalRewards.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">NCTR Earned</div>
                </CardContent>
              </Card>
            </div>

            {/* Referrals List */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Invite History</h2>
              {referrals.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-16">
                    <Users className="w-16 h-16 mx-auto mb-6 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No invites yet</h3>
                    <p className="text-muted-foreground">Share your invite code with friends to get started!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {referrals.map((referral) => (
                    <Card key={referral.id} className="bg-card/50 hover:bg-card/70 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{referral.referred_name}</div>
                              {referral.referred_email && (
                                <div className="text-sm text-muted-foreground">{referral.referred_email}</div>
                              )}
                              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <Calendar className="w-4 h-4" />
                                Joined {format(new Date(referral.join_date || referral.created_at), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {referral.status === 'completed' && referral.reward_credited ? (
                              <>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 px-3 py-1">
                                  Rewarded
                                </Badge>
                                <div className="text-lg font-semibold text-green-600">
                                  +1000 NCTR
                                </div>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-yellow-700 px-3 py-1">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                        {referral.rewarded_at && (
                          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            Reward credited on {format(new Date(referral.rewarded_at), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Referrals;
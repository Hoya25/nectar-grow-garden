import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useInviteReward } from '@/hooks/useInviteReward';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Award, Loader2, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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

interface UserReferralsModalProps {
  children: React.ReactNode;
}

const UserReferralsModal = ({ children }: UserReferralsModalProps) => {
  const { user } = useAuth();
  const { inviteReward } = useInviteReward();
  const [isOpen, setIsOpen] = useState(false);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    totalRewards: 0
  });

  // Initialize referral code immediately when user is available
  useEffect(() => {
    if (user) {
      const userCode = user.id.substring(0, 8).toUpperCase();
      setReferralCode(userCode);
    }
  }, [user]);

  // Simplified data fetching function
  const fetchUserReferrals = async () => {
    if (!user?.id) {
      return;
    }
    setLoading(true);
    
    try {
      // Direct query to get referrals with profile data
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

      // Get secure profile data for referred users using the safe function
      const userIds = referralsData.map(r => r.referred_user_id);
      const profilePromises = userIds.map(async (userId) => {
        const { data, error } = await supabase
          .rpc('get_safe_referral_profile', { target_user_id: userId });
        
        if (error) {
          console.error('Error fetching safe profile for user:', userId, error);
          return null;
        }
        return data?.[0] || null;
      });

      const profilesData = await Promise.all(profilePromises);

      // Combine referral and profile data (no sensitive information exposed)
      const enrichedReferrals = referralsData.map((referral, index) => {
        const profile = profilesData[index];
        return {
          ...referral,
          referred_name: profile?.full_name || profile?.username || 'Member',
          referred_email: '', // No longer expose email addresses for security
          join_date: profile?.created_at || referral.created_at,
        };
      });

      
      setReferrals(enrichedReferrals);

      // Calculate stats
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
      setReferrals([]);
      setStats({ total: 0, completed: 0, pending: 0, totalRewards: 0 });
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

  // Handle modal opening and data fetching
  const handleModalOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    // Fetch data immediately when modal opens
    if (open && user?.id) {
      fetchUserReferrals();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Invites ({stats.total})
          </DialogTitle>
          <div className="sr-only">View your invite history and track referral rewards</div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading your referrals...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Referral Code Section */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">Your Invite Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded">
                    {referralCode}
                  </div>
                  <Button variant="outline" size="sm" onClick={copyReferralCode}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={shareReferralLink}>
                    <Share2 className="w-4 h-4 mr-1" />
                    Copy Link
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with friends to earn {inviteReward} NCTR for each successful signup!
                </p>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Invites</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalRewards.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</div>
                  <div className="text-sm text-muted-foreground">NCTR Earned</div>
                </CardContent>
              </Card>
            </div>

            {/* Referrals List */}
            <div className="space-y-4">
              <h3 className="font-semibold">Invite History</h3>
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No invites yet.</p>
                  <p className="text-sm">Share your invite code with friends to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <Card key={referral.id} className="bg-card/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-primary" />
                             <div>
                               <div className="font-medium">{referral.referred_name}</div>
                               <div className="text-sm text-muted-foreground flex items-center gap-1">
                                 <Calendar className="w-3 h-3" />
                                 Joined {format(new Date(referral.join_date || referral.created_at), 'MMM dd, yyyy')}
                               </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {referral.status === 'completed' && referral.reward_credited ? (
                              <>
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  Rewarded
                                </Badge>
                                <div className="text-sm font-medium text-green-600">
                                  +{inviteReward} NCTR
                                </div>
                              </>
                            ) : (
                              <>
                                <Badge variant="outline" className="text-amber-700 border-amber-400">
                                  Awaiting First Purchase
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {inviteReward} NCTR pending
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {referral.rewarded_at && (
                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                            <Award className="w-3 h-3" />
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
      </DialogContent>
    </Dialog>
  );
};

export default UserReferralsModal;
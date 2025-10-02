import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Copy, Check, Share2, Mail, MessageCircle, Users } from 'lucide-react';
import nctrLogo from "@/assets/nctr-logo-grey.png";

interface ReferralStats {
  total_referrals: number;
  pending_rewards: number;
  total_earned_from_referrals: number;
}

interface UserStatus {
  opportunity_status: string;
  reward_multiplier: number;
}

const ReferralSystem = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    total_referrals: 0,
    pending_rewards: 0,
    total_earned_from_referrals: 0
  });
  const [userStatus, setUserStatus] = useState<UserStatus>({
    opportunity_status: 'starter',
    reward_multiplier: 1.0
  });
  const [copied, setCopied] = useState(false);

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'vip': return 'text-yellow-500';
      case 'premium': return 'text-purple-500';
      case 'platinum': return 'text-slate-400';
      case 'advanced': return 'text-blue-500';
      case 'bronze': return 'text-amber-600';
      case 'silver': return 'text-gray-500';
      case 'gold': return 'text-yellow-500';
      case 'diamond': return 'text-blue-500';
      default: return 'text-primary';
    }
  };

  useEffect(() => {
    if (user) {
      generateReferralCode();
      fetchUserStatus();
    }
  }, [user]);

  // Separate effect for fetching stats when multiplier changes
  useEffect(() => {
    if (user && userStatus.reward_multiplier) {
      fetchReferralStats();
    }
  }, [user, userStatus.reward_multiplier]);

  const generateReferralCode = () => {
    if (user) {
      const code = user.id.slice(0, 8).toUpperCase();
      setReferralCode(code);
    }
  };

  const fetchUserStatus = async () => {
    if (!user) return;

    try {
      // First get the portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('opportunity_status')
        .eq('user_id', user.id)
        .single();

      if (portfolioError) throw portfolioError;

      // Then get the status level details
      const { data: statusLevel, error: statusError } = await supabase
        .from('opportunity_status_levels')
        .select('reward_multiplier')
        .eq('status_name', portfolio?.opportunity_status || 'starter')
        .single();

      if (statusError) throw statusError;

      const newStatus = {
        opportunity_status: portfolio?.opportunity_status || 'starter',
        reward_multiplier: statusLevel?.reward_multiplier || 1.0
      };

      setUserStatus(newStatus);
    } catch (error) {
      console.error('Error fetching user status:', error);
      // Default to starter status
      setUserStatus({
        opportunity_status: 'starter',
        reward_multiplier: 1.0
      });
    }
  };

  const fetchReferralStats = async () => {
    if (!user) return;

    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id);

      if (error) throw error;

      const { data: transactions, error: transError } = await supabase
        .from('nctr_transactions')
        .select('nctr_amount')
        .eq('user_id', user.id)
        .eq('earning_source', 'referral');

      if (transError) throw transError;

      const totalEarned = transactions?.reduce((sum, t) => sum + Number(t.nctr_amount), 0) || 0;
      const completedReferrals = referrals?.filter(r => r.reward_credited).length || 0;
      const pendingReferrals = referrals?.filter(r => !r.reward_credited).length || 0;

      setReferralStats({
        total_referrals: completedReferrals,
        pending_rewards: pendingReferrals * (1000 * userStatus.reward_multiplier),
        total_earned_from_referrals: totalEarned
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      setReferralStats({
        total_referrals: 0,
        pending_rewards: 0,
        total_earned_from_referrals: 0
      });
    }
  };

  const getReferralLink = () => {
    return `${window.location.origin}/auth?ref=${referralCode}`;
  };

  const copyReferralLink = async () => {
    const link = getReferralLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Your referral link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Please manually copy the link.",
        variant: "destructive",
      });
    }
  };

  const shareViaEmail = () => {
    const userReward = Math.round(1000 * userStatus.reward_multiplier);
    const subject = "Join The Garden and Start Earning NCTR!";
    const body = `Hey! I wanted to invite you to join The Garden, where you can earn NCTR tokens through everyday activities like shopping.

Use my referral link to get started: ${getReferralLink()}

I earn ${userReward} NCTR and you get 1000 NCTR in 360LOCK when you sign up and start participating!`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaText = () => {
    const message = `Join The Garden and earn NCTR tokens! Use my referral link: ${getReferralLink()}`;
    window.open(`sms:?body=${encodeURIComponent(message)}`);
  };

  const shareViaWhatsApp = () => {
    const userReward = Math.round(1000 * userStatus.reward_multiplier);
    const message = `🌱 Join The Garden and start earning NCTR tokens through everyday activities! I earn ${userReward} NCTR and you get 1000 NCTR when you join! Use my referral link: ${getReferralLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardContent className="p-6 space-y-6">
        
        {/* Header with Badge and Title */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-1 bg-primary text-primary-foreground">
              🚀 TOP EARNER
            </Badge>
            <h2 className="text-xl font-bold text-foreground">Invite Friends & Earn Together</h2>
          </div>
        </div>

        {/* Reward Info */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-bold text-primary">
              {Math.round(1000 * userStatus.reward_multiplier)} NCTR
            </span>
            <span className="text-lg text-foreground">for you,</span>
            <span className="text-2xl font-bold text-secondary">1000 NCTR</span>
            <span className="text-lg text-foreground">for them</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {userStatus.reward_multiplier > 1 ? (
              <span>
                Wings <span className={`font-semibold ${getStatusTextColor(userStatus.opportunity_status)}`}>{userStatus.opportunity_status}</span> bonus: <span className={`font-bold ${getStatusTextColor(userStatus.opportunity_status)}`}>{userStatus.reward_multiplier}x</span> multiplier
              </span>
            ) : 'Most popular way to earn'}
          </p>
        </div>

        {/* Action Button */}
        <Button 
          onClick={copyReferralLink}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg font-semibold"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Start Inviting Friends
        </Button>

        {/* Quick Share Options */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            onClick={copyReferralLink}
            variant="outline" 
            className="h-14 flex flex-col items-center justify-center space-y-1 border-primary/20 hover:bg-primary/5"
          >
            {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
          </Button>
          
          <Button 
            onClick={shareViaWhatsApp}
            variant="outline" 
            className="h-14 flex flex-col items-center justify-center space-y-1 border-primary/20 hover:bg-primary/5"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          
          <Button 
            onClick={shareViaEmail}
            variant="outline" 
            className="h-14 flex flex-col items-center justify-center space-y-1 border-primary/20 hover:bg-primary/5"
          >
            <Mail className="w-5 h-5" />
          </Button>
        </div>

        {/* Earnings Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center py-4 bg-primary/5 rounded-xl">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-2xl font-bold text-primary">
                {Math.round(1000 * (userStatus.reward_multiplier || 1))}
              </span>
              <img src={nctrLogo} alt="NCTR" className="h-4 w-auto" />
            </div>
            <div className="text-xs text-muted-foreground">
              for you {userStatus.reward_multiplier > 1 && (
                <span className={`${getStatusTextColor(userStatus.opportunity_status)}`}>
                  ({userStatus.reward_multiplier}x)
                </span>
              )}
            </div>
          </div>
          
          <div className="text-center py-4 bg-secondary/5 rounded-xl">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-2xl font-bold text-secondary">1000</span>
              <img src={nctrLogo} alt="NCTR" className="h-4 w-auto" />
            </div>
            <div className="text-xs text-muted-foreground">for friend</div>
          </div>
        </div>

        {/* Referral Code - Simplified */}
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Referral code</div>
          <Badge variant="outline" className="font-mono text-primary border-primary/30 px-3 py-1">
            {referralCode}
          </Badge>
        </div>

        {/* Stats (only show if there are any) */}
        {(referralStats.total_referrals > 0 || referralStats.total_earned_from_referrals > 0) && (
          <div className="pt-4 border-t border-border/30">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-primary">{referralStats.total_referrals}</div>
                <div className="text-xs text-muted-foreground">Friends Invited</div>
              </div>
              <div>
                <div className="text-xl font-bold text-secondary">
                  {referralStats.total_earned_from_referrals.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className="text-xs text-muted-foreground">NCTR Earned</div>
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default ReferralSystem;
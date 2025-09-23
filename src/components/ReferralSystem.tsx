import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Copy, Check, Share2, Mail, MessageCircle } from 'lucide-react';
import nctrLogo from "@/assets/nctr-logo-grey.png";

interface ReferralStats {
  total_referrals: number;
  pending_rewards: number;
  total_earned_from_referrals: number;
}

const ReferralSystem = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    total_referrals: 0,
    pending_rewards: 0,
    total_earned_from_referrals: 0
  });
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      generateReferralCode();
      fetchReferralStats();
    }
  }, [user]);

  const generateReferralCode = () => {
    if (user) {
      // Generate a simple referral code based on user ID
      const code = user.id.slice(0, 8).toUpperCase();
      setReferralCode(code);
    }
  };

  const fetchReferralStats = async () => {
    if (!user) return;

    try {
      // Fetch real referral stats
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id);

      if (error) throw error;

      // Fetch referral transactions
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
        pending_rewards: pendingReferrals * 1000, // 1000 NCTR per pending referral
        total_earned_from_referrals: totalEarned
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      // Fallback to empty stats
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
    const subject = "Join The Garden and Start Earning NCTR!";
    const body = `Hey! I wanted to invite you to join The Garden, where you can earn NCTR tokens through everyday activities like shopping.

Use my referral link to get started: ${getReferralLink()}

We both earn 1000 NCTR in 360LOCK when you sign up and start participating!

Check it out: The Garden is democratizing crypto by removing financial barriers and making it accessible to everyone.`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaText = () => {
    const message = `Join The Garden and earn NCTR tokens! Use my referral link: ${getReferralLink()}`;
    window.open(`sms:?body=${encodeURIComponent(message)}`);
  };

  const shareViaWhatsApp = () => {
    const message = `🌱 Join The Garden and start earning NCTR tokens through everyday activities! Use my referral link: ${getReferralLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 overflow-hidden">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Share2 className="w-8 h-8 text-primary" />
            </div>
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-2 bg-primary/20 text-primary border-primary/30">
                🚀 TOP EARNER
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Invite Friends</h2>
              <h3 className="text-lg sm:text-xl font-semibold text-muted-foreground">& Earn Together</h3>
            </div>
          </div>
          
          <Button 
            onClick={() => setShareModalOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 h-auto"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Start Inviting Friends
          </Button>
        </div>

        {/* Rewards Display */}
        <div className="mb-8">
          <div className="mb-3">
            <div className="flex flex-wrap items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-primary">1000 NCTR</span>
              <span className="text-lg text-foreground">each in</span>
              <span className="text-2xl font-bold text-secondary">360LOCK</span>
            </div>
            <p className="text-sm text-muted-foreground">Most popular way to earn</p>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex flex-col items-center justify-center py-6 bg-primary/5 rounded-xl space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary">1000</span>
              <img src={nctrLogo} alt="NCTR" className="h-5 w-auto" />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">for</div>
              <div className="text-sm font-medium text-foreground">you</div>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6 bg-secondary/5 rounded-xl space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-secondary">1000</span>
              <img src={nctrLogo} alt="NCTR" className="h-5 w-auto" />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">for</div>
              <div className="text-sm font-medium text-foreground">friend</div>
            </div>
          </div>
        </div>

        {/* Referral Code */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Referral code:</span>
            <Badge variant="outline" className="font-mono text-primary border-primary/30 px-3 py-1">
              {referralCode}
            </Badge>
          </div>
          
          {/* Share Link */}
          <div className="flex gap-2">
            <Input
              value={getReferralLink()}
              readOnly
              className="flex-1 text-xs font-mono bg-muted/50"
            />
            <Button 
              onClick={copyReferralLink}
              variant="outline"
              size="sm"
              className="px-4 min-w-[44px]"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Share Options */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            onClick={copyReferralLink}
            variant="outline" 
            size="sm" 
            className="h-12 flex flex-col items-center justify-center space-y-1"
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          <Button 
            onClick={shareViaWhatsApp}
            variant="outline" 
            size="sm" 
            className="h-12 flex flex-col items-center justify-center space-y-1"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          
          <Button 
            onClick={shareViaEmail}
            variant="outline" 
            size="sm" 
            className="h-12 flex flex-col items-center justify-center space-y-1"
          >
            <Mail className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats Row */}
        {(referralStats.total_referrals > 0 || referralStats.total_earned_from_referrals > 0) && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{referralStats.total_referrals}</div>
                <div className="text-xs text-muted-foreground">Friends Invited</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">
                  {referralStats.total_earned_from_referrals.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">NCTR Earned</div>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Your Referral Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                <p className="mb-2">🌱 <strong>Join The Garden and Start Earning NCTR!</strong></p>
                <p className="mb-2">
                  I wanted to invite you to The Garden, where you can earn NCTR tokens through everyday activities like shopping - no investment required!
                </p>
                <p className="mb-2">
                  Use my referral link: <span className="font-mono text-xs break-all">{getReferralLink()}</span>
                </p>
                <p>
                We both earn 1000 NCTR in 360LOCK when you sign up. It's a great way to get started with crypto without any risk! 🚀
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={shareViaEmail} variant="outline" className="h-auto py-3 flex flex-col">
                  <Mail className="w-5 h-5 mb-1" />
                  <span className="text-xs">Email</span>
                </Button>
                <Button onClick={shareViaText} variant="outline" className="h-auto py-3 flex flex-col">
                  <MessageCircle className="w-5 h-5 mb-1" />
                  <span className="text-xs">Text</span>
                </Button>
              </div>

              <Button 
                onClick={() => {
                  copyReferralLink();
                  setShareModalOpen(false);
                }}
                className="w-full"
              >
                Copy Message & Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ReferralSystem;
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Users, Copy, Check, Gift, Share2, Mail, MessageCircle } from 'lucide-react';

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
      // In a real implementation, you'd fetch actual referral data
      // For now, we'll use mock data
      const mockStats = {
        total_referrals: 3,
        pending_rewards: 150,
        total_earned_from_referrals: 450
      };
      setReferralStats(mockStats);
    } catch (error) {
      console.error('Error fetching referral stats:', error);
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

We both earn rewards when you sign up and start participating!

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
    <div className="space-y-6">
      {/* Referral Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {referralStats.total_referrals}
            </div>
            <p className="text-xs text-muted-foreground">Active community members</p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {referralStats.pending_rewards.toLocaleString()} NCTR
            </div>
            <p className="text-xs text-muted-foreground">Processing rewards</p>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {referralStats.total_earned_from_referrals.toLocaleString()} NCTR
            </div>
            <p className="text-xs text-muted-foreground">From referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Program Info */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">How It Works</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Share your unique referral link</li>
                <li>• Friends join The Garden using your link</li>
                <li>• You both earn 1000 NCTR when they sign up</li>
                <li>• Earn 10% of their earning activity</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Bonus Rewards</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 5 referrals: +100 NCTR bonus</li>
                <li>• 10 referrals: +500 NCTR bonus</li>
                <li>• 25 referrals: Opportunity status boost</li>
                <li>• 50+ referrals: VIP partner benefits</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Link Section */}
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Code: {referralCode}</Badge>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="referral-link">Share this link with friends:</Label>
            <div className="flex space-x-2">
              <Input
                id="referral-link"
                value={getReferralLink()}
                readOnly
                className="flex-1"
              />
              <Button 
                onClick={copyReferralLink}
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={shareViaEmail} variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button onClick={shareViaText} variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Text
            </Button>
            <Button onClick={shareViaWhatsApp} variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  More Options
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Your Referral Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <Gift className="h-4 w-4" />
                    <AlertDescription>
                      Share this message with your friends to help them discover The Garden:
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 bg-muted/50 rounded-lg text-sm">
                    <p className="mb-2">🌱 <strong>Join The Garden and Start Earning NCTR!</strong></p>
                    <p className="mb-2">
                      I wanted to invite you to The Garden, where you can earn NCTR tokens through everyday activities like shopping - no investment required!
                    </p>
                    <p className="mb-2">
                      Use my referral link: <span className="font-mono text-xs">{getReferralLink()}</span>
                    </p>
                    <p>
                      We both earn 1000 NCTR when you sign up. It's a great way to get started with crypto without any risk! 🚀
                    </p>
                  </div>

                  <Button 
                    onClick={() => {
                      copyReferralLink();
                      setShareModalOpen(false);
                    }}
                    className="w-full bg-white border-2 border-primary text-foreground hover:bg-section-highlight"
                  >
                    Copy Message & Link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralSystem;
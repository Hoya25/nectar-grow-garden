import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Gift, Users, LogOut, ExternalLink, Copy, User, Play, Settings, Mail, MessageCircle, Share2, Check, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LockCommitmentModal from '@/components/LockCommitmentModal';
import ReferralSystem from '@/components/ReferralSystem';
import UserAffiliateLinks from '@/components/UserAffiliateLinks';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useAdmin } from '@/hooks/useAdmin';
import { MemberStatusShowcase } from '@/components/MemberStatusShowcase';
import { MemberStatusBanner } from '@/components/MemberStatusBanner';
import { CollapsibleDashboard } from '@/components/CollapsibleDashboard';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { RewardDisplay } from '@/components/RewardDisplay';
import nctrLogo from "@/assets/nctr-logo-grey.png";
import nctrNLogo from "@/assets/nctr-n-yellow.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  opportunity_status: string;
  lock_90_nctr: number;
  lock_360_nctr: number;
}

interface LockCommitment {
  id: string;
  lock_type: string;
  nctr_amount: number;
  lock_date: string;
  unlock_date: string;
  status: string;
  lock_category?: string;
  can_upgrade?: boolean;
}

interface EarningOpportunity {
  id: string;
  title: string;
  description: string;
  opportunity_type: string;
  nctr_reward: number;
  reward_per_dollar: number;
  partner_name: string;
  partner_logo_url: string;
  affiliate_link?: string;
  video_url?: string;
  video_title?: string;
  video_description?: string;
  // New reward structure fields
  available_nctr_reward?: number;
  lock_90_nctr_reward?: number;
  lock_360_nctr_reward?: number;
  reward_distribution_type?: string;
  reward_structure?: any;
}

import ProfileModal from '@/components/ProfileModal';

const Garden = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { currentPrice, priceChange24h, formatPrice, formatChange, getChangeColor, calculatePortfolioValue, contractAddress } = useNCTRPrice();
  const { getSetting, loading: settingsLoading } = useSiteSettings(['earning_opportunities_banner_title', 'earning_opportunities_banner_subtitle']);
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [locks, setLocks] = useState<LockCommitment[]>([]);
  const [opportunities, setOpportunities] = useState<EarningOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (!user) {
      // Store the current path for redirect after auth
      sessionStorage.setItem('authRedirect', '/garden');
      navigate('/auth');
      return;
    }
    
    fetchUserData();
    generateReferralCode();
  }, [user, navigate]);

  const generateReferralCode = () => {
    if (user) {
      // Generate a simple referral code based on user ID
      const code = user.id.slice(0, 8).toUpperCase();
      setReferralCode(code);
    }
  };

  const getReferralLink = () => {
    return `${window.location.origin}/auth?ref=${referralCode}`;
  };

  const copyInviteLink = async () => {
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
    const body = `Hey! I wanted to invite you to join The Garden, where you can earn NCTR tokens through everyday activities.

Use my referral link to get started: ${getReferralLink()}

We both earn 1000 NCTR in 360LOCK when you sign up!`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaText = () => {
    const message = `Join The Garden and earn NCTR tokens! Use my referral link: ${getReferralLink()}`;
    window.open(`sms:?body=${encodeURIComponent(message)}`);
  };

  const shareViaWhatsApp = () => {
    const message = `🌱 Join The Garden and start earning NCTR tokens! Use my referral link: ${getReferralLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const fetchUserData = async () => {
    try {
      // Fetch portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('available_nctr, pending_nctr, total_earned, opportunity_status, lock_90_nctr, lock_360_nctr')
        .eq('user_id', user?.id)
        .single();

      if (portfolioError && portfolioError.code !== 'PGRST116') {
        console.error('Portfolio error:', portfolioError);
      } else {
        setPortfolio(portfolioData);
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

      // Fetch earning opportunities
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('earning_opportunities')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (opportunitiesError) {
        console.error('Opportunities error:', opportunitiesError);
      } else {
        // Sort opportunities: Live (shopping) first, then Complete (bonus, invite)
        const sortedOpportunities = (opportunitiesData || []).sort((a, b) => {
          // Define priority: shopping (Live) = 1, bonus/invite (Complete) = 2
          const getPriority = (type: string) => {
            if (type === 'shopping') return 1; // Live opportunities first
            return 2; // Complete opportunities (bonus, invite) second
          };
          
          const priorityA = getPriority(a.opportunity_type);
          const priorityB = getPriority(b.opportunity_type);
          
          // If same priority, sort by created_at (newest first)
          if (priorityA === priorityB) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          return priorityA - priorityB;
        });
        
        setOpportunities(sortedOpportunities);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your garden data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatNCTR = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(amount));
  };

  const handleOpportunityClick = async (opportunity: EarningOpportunity) => {
    console.log('Opportunity clicked:', opportunity.title, opportunity.opportunity_type);
    
    switch (opportunity.opportunity_type) {
      case 'invite':
        handleInviteOpportunity(opportunity);
        break;
      case 'bonus':
        handleBonusOpportunity(opportunity);
        break;
      case 'shopping':
      case 'partner':
        handleShoppingOpportunity(opportunity);
        break;
      default:
        handleGenericOpportunity(opportunity);
        break;
    }
  };

  const handleInviteOpportunity = (opportunity: EarningOpportunity) => {
    // For invite opportunities, open a direct share link modal
    setInviteModalOpen(true);
    toast({
      title: "🎉 Invite Friends",
      description: "Share your link and earn 1000 NCTR in 360LOCK for each friend who joins!",
    });
  };

  const handleBonusOpportunity = async (opportunity: EarningOpportunity) => {
    if (opportunity.title.includes('Profile')) {
      // Navigate to profile page for profile completion
      navigate('/profile');
      toast({
        title: "Complete Your Profile",
        description: "Fill out your profile to earn NCTR automatically locked in 360LOCK!",
      });
    } else if (opportunity.title.includes('Daily Check-in')) {
      // Handle daily check-in with auto-lock
      await awardDailyBonus(opportunity);
    } else {
      // Generic bonus handling with auto-lock
      await awardBonus(opportunity);
    }
  };

  const handleShoppingOpportunity = (opportunity: EarningOpportunity) => {
    if (opportunity.affiliate_link) {
      // Open affiliate link in new tab
      window.open(opportunity.affiliate_link, '_blank');
      toast({
        title: "Redirecting...",
        description: `Opening ${opportunity.partner_name || 'partner'} - NCTR from purchases locked in 90LOCK (upgradeable to 360LOCK anytime)!`,
      });
    } else {
      toast({
        title: "Coming Soon!",
        description: "This shopping opportunity will be available soon. NCTR from purchases are locked in 90LOCK by default.",
      });
    }
  };

  const handleGenericOpportunity = (opportunity: EarningOpportunity) => {
    toast({
      title: "Opportunity Details",
      description: opportunity.description || "More details coming soon!",
    });
  };

  const awardDailyBonus = async (opportunity: EarningOpportunity) => {
    try {
      // Check if user already claimed today's bonus
      const today = new Date().toISOString().split('T')[0];
      const { data: existingTransaction } = await supabase
        .from('nctr_transactions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('opportunity_id', opportunity.id)
        .gte('created_at', today + 'T00:00:00')
        .maybeSingle();

      if (existingTransaction) {
        toast({
          title: "Already Claimed!",
          description: "You've already claimed today's daily bonus. Come back tomorrow!",
          variant: "destructive",
        });
        return;
      }

      await awardNCTR(opportunity, 'Daily check-in bonus');
    } catch (error) {
      console.error('Error awarding daily bonus:', error);
      toast({
        title: "Error",
        description: "Failed to award daily bonus. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'premium': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      case 'advanced': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default: return 'bg-gradient-to-r from-green-400 to-green-600';
    }
  };

  const awardBonus = async (opportunity: EarningOpportunity) => {
    try {
      // Check if user already completed this bonus opportunity
      const { data: existingTransaction } = await supabase
        .from('nctr_transactions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('opportunity_id', opportunity.id)
        .maybeSingle();

      if (existingTransaction) {
        toast({
          title: "Already Completed!",
          description: "You've already completed this bonus opportunity.",
          variant: "destructive",
        });
        return;
      }

      await awardNCTR(opportunity, 'Bonus opportunity completed');
    } catch (error) {
      console.error('Error awarding bonus:', error);
      toast({
        title: "Error",
        description: "Failed to award bonus. Please try again.",
        variant: "destructive",
      });
    }
  };

  const awardNCTR = async (opportunity: EarningOpportunity, description: string) => {
    try {
      const rewardAmount = opportunity.nctr_reward || 0;
      
      if (rewardAmount <= 0) {
        toast({
          title: "No Reward",
          description: "This opportunity doesn't have an immediate NCTR reward.",
        });
        return;
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('nctr_transactions')
        .insert({
          user_id: user?.id,
          transaction_type: 'earned',
          nctr_amount: rewardAmount,
          opportunity_id: opportunity.id,
          description: description,
          partner_name: opportunity.partner_name,
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Update user portfolio
      const { error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: (portfolio?.available_nctr || 0) + rewardAmount,
          total_earned: (portfolio?.total_earned || 0) + rewardAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (portfolioError) throw portfolioError;

      // Refresh user data
      await fetchUserData();

      toast({
        title: "🎉 NCTR Earned!",
        description: `You've earned ${formatNCTR(rewardAmount)} NCTR from ${opportunity.title}!`,
      });

    } catch (error) {
      console.error('Error awarding NCTR:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your garden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      {/* Header with Wings Status */}
      <header className="section-highlight backdrop-blur-sm border-b border-section-border">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <h1 className="text-xl sm:text-2xl font-bold nctr-text">
                  The Garden
                </h1>
                <img 
                  src={nctrLogo} 
                  alt="NCTR" 
                  className="h-16 sm:h-28 w-auto opacity-90"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1 sm:gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-1 sm:gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                  >
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
            
            {/* Compact Status Display in Header */}
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2">
                <img 
                  src={nctrLogo} 
                  alt="NCTR" 
                  className="h-6 w-auto opacity-70"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Total NCTR</p>
                  <p className="text-sm font-semibold text-section-accent">
                    {formatNCTR((portfolio?.available_nctr || 0) + (portfolio?.lock_90_nctr || 0) + (portfolio?.lock_360_nctr || 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
        {/* Wings Status - Prominent Section */}
        <div className="mb-8">
          <MemberStatusBanner 
            currentStatus={portfolio?.opportunity_status || 'starter'}
            current360NCTR={parseFloat(portfolio?.lock_360_nctr?.toString() || '0')}
            availableNCTR={portfolio?.available_nctr || 0}
            onUpgradeClick={() => {
              // Scroll to lock commitment modal or trigger it
              const lockButton = document.querySelector('[data-lock-commitment]');
              if (lockButton) {
                (lockButton as HTMLElement).click();
              }
            }}
            onEarnMoreClick={() => {
              // Scroll to earning opportunities
              const opportunitiesSection = document.querySelector('[data-earning-opportunities]');
              if (opportunitiesSection) {
                opportunitiesSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        </div>

        {/* Profile Completion Banner */}
        <div className="mb-6">
          <ProfileCompletionBanner />
        </div>

        {/* Main Earning Opportunities - Front and Center */}
        <div data-earning-opportunities>
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold section-heading mb-3 sm:mb-4">
              {getSetting('earning_opportunities_banner_title') || 'Turn Your Everyday Activities Into NCTR Rewards'}
            </h2>
            <p className="text-base sm:text-lg section-text max-w-3xl mx-auto">
              {getSetting('earning_opportunities_banner_subtitle') || 'Simple activities, real rewards – start earning today'}
            </p>
          </div>

          {/* Invite Section - Premium Design */}
          <div className="mb-8">
            {opportunities.filter(op => op.opportunity_type === 'invite').map(opportunity => (
              <Card key={opportunity.id} className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 shadow-premium hover:shadow-premium-hover transition-all duration-500 cursor-pointer group" onClick={() => handleOpportunityClick(opportunity)}>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-1">{opportunity.title}</h3>
                      <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                    </div>
                  </div>

                  <div className="text-center py-2">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-2xl font-bold text-primary">{formatNCTR(opportunity.nctr_reward)} NCTR</span>
                      <Badge className="bg-primary text-primary-foreground">360LOCK</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Locked for maximum alliance benefits</p>
                  </div>

                  <Button 
                    className="w-full bg-primary hover:bg-primary-glow text-primary-foreground text-base py-6 group-hover:scale-[1.02] transition-all duration-300"
                    size="lg"
                  >
                    {opportunity.title} →
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center py-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-lg font-bold text-green-600">{formatNCTR(opportunity.nctr_reward)}</span>
                        <span className="text-xs text-green-600 font-semibold">NCTR</span>
                      </div>
                      <div className="text-xs text-muted-foreground">for you</div>
                    </div>

                    <div className="text-center py-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-lg font-bold text-green-600">{formatNCTR(opportunity.nctr_reward)}</span>
                        <span className="text-xs text-green-600 font-semibold">NCTR</span>
                      </div>
                      <div className="text-xs text-muted-foreground">for friend</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button onClick={(e) => { e.stopPropagation(); shareViaEmail(); }} variant="outline" size="sm" className="text-xs">
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </Button>
                      <Button onClick={(e) => { e.stopPropagation(); shareViaText(); }} variant="outline" size="sm" className="text-xs">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Text
                      </Button>
                      <Button onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(); }} variant="outline" size="sm" className="text-xs">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Code</div>
                      <div className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                        {referralCode}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Shopping Opportunities */}
          {opportunities.filter(op => op.opportunity_type === 'shopping').length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold section-heading mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                🟢 Live Opportunities
              </h3>
              {opportunities.filter(op => op.opportunity_type === 'shopping').map((opportunity) => (
                <Card 
                  key={opportunity.id} 
                  className="mb-4 cursor-pointer hover:shadow-medium transition-all duration-300 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent"
                  onClick={() => handleOpportunityClick(opportunity)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      <div className="relative">
                        {opportunity.partner_logo_url && (
                          <img 
                            src={opportunity.partner_logo_url} 
                            alt={opportunity.partner_name}
                            className="w-full lg:w-48 h-32 lg:h-auto object-cover rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none"
                          />
                        )}
                        <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                          <Badge className="bg-green-600 text-white font-bold">
                            LIVE
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 lg:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-4">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            {opportunity.partner_logo_url && (
                              <img 
                                src={opportunity.partner_logo_url} 
                                alt={opportunity.partner_name}
                                className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-lg bg-white p-2 shadow-sm"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg sm:text-xl font-semibold section-heading mb-1 truncate">
                                {opportunity.title}
                              </h3>
                              <p className="text-sm sm:text-base section-text line-clamp-2">
                                {opportunity.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                          <div className="bg-section-highlight rounded-xl p-4 sm:p-6 text-center">
                            <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                              {opportunity.reward_per_dollar}% NCTR
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">Cashback on purchases</div>
                            <div className="text-xs text-primary mt-1">Automatically locked in 90LOCK</div>
                          </div>
                        </div>

                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-6"
                          size="lg"
                        >
                          🛍️ Shop & Earn →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Bonus Opportunities */}
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-semibold section-heading mb-2">Complete & Earn</h3>
              <p className="section-text">Simple tasks for instant NCTR rewards</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
              {opportunities.filter(op => op.opportunity_type === 'bonus').map((opportunity) => (
                <Card 
                  key={opportunity.id}
                  className="cursor-pointer hover:shadow-medium transition-all duration-300 group bg-gradient-to-br from-white to-section-highlight border border-section-border hover:border-primary/30"
                  onClick={() => handleOpportunityClick(opportunity)}
                >
                  <CardContent className="p-6 sm:p-8">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
                        <Gift className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold section-heading mb-2">{opportunity.title}</h3>
                      <p className="section-text text-sm leading-relaxed">
                        {opportunity.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-center mb-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-1">
                          {formatNCTR(opportunity.nctr_reward)}
                        </div>
                        <div className="text-sm text-muted-foreground">NCTR Reward</div>
                        <Badge variant="outline" className="mt-2 border-primary text-primary">
                          360LOCK
                        </Badge>
                      </div>
                    </div>

                    {opportunity.video_url && (
                      <div className="mb-8">
                        <div className="relative rounded-2xl overflow-hidden shadow-large">
                          <video 
                            className="w-full aspect-video object-cover"
                            controls
                            poster={opportunity.partner_logo_url}
                          >
                            <source src={opportunity.video_url} type="video/mp4" />
                          </video>
                        </div>
                        {opportunity.video_title && (
                          <div className="mt-4 text-center">
                            <h4 className="font-semibold text-sm mb-1">{opportunity.video_title}</h4>
                            {opportunity.video_description && (
                              <p className="text-xs text-muted-foreground">{opportunity.video_description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <Button 
                      className="w-full bg-primary hover:bg-primary-glow text-primary-foreground py-6 group-hover:scale-105 transition-all duration-300"
                      size="lg"
                    >
                      Complete Task →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Affiliate Links Section */}
          <Card className="bg-gradient-to-br from-section-highlight to-white border border-section-border shadow-medium">
            <CardHeader>
              <CardTitle className="text-xl section-heading flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Partner Links & Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserAffiliateLinks />
            </CardContent>
          </Card>
        </div>

        {/* Community Section */}
        <div className="mt-12" data-referral-system>
          <ReferralSystem />
        </div>

        {/* Portfolio Section - Secondary Priority */}
        <div className="mt-12 bg-section-highlight/50 rounded-xl p-6 border border-section-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold section-heading">Portfolio Overview</h2>
              <p className="text-sm text-muted-foreground">Manage your NCTR holdings and commitments</p>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 border-primary/50 hover:bg-primary/10"
            >
              <User className="w-4 h-4" />
              Manage in Profile
            </Button>
          </div>
          
          {/* Simplified Portfolio Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Available</span>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">
                  {formatNCTR(portfolio?.available_nctr || 0)}
                </p>
                <p className="text-xs text-muted-foreground">NCTR Ready to commit</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/20">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">360LOCK</span>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">
                  {formatNCTR(portfolio?.lock_360_nctr || 0)}
                </p>
                <p className="text-xs text-primary/80">Alliance Benefits</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-muted-foreground">Total Earned</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mb-1">
                  {formatNCTR(portfolio?.total_earned || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Lifetime NCTR</p>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <LockCommitmentModal onLockCreated={fetchUserData} availableNCTR={portfolio?.available_nctr || 0} />
            
            <Button 
              variant="outline"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Portfolio Details & Sync
            </Button>
          </div>
        </div>
      </main>

      {/* Invite Friends Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base sm:text-lg">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              🎉 Invite Friends & Earn 1000 NCTR in 360LOCK
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 sm:p-4 border border-primary/20">
              <h4 className="font-semibold text-primary mb-2 text-sm sm:text-base">How it works:</h4>
              <ul className="text-xs sm:text-sm space-y-1 text-muted-foreground">
                <li>• Share your unique link below</li>
                <li>• Friends join using your link</li>
                <li>• You both earn 1000 NCTR in 360LOCK instantly!</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invite-link" className="text-sm">Your Personal Invite Link:</Label>
              <div className="flex space-x-2">
                <Input
                  id="invite-link"
                  value={getReferralLink()}
                  readOnly
                  className="flex-1 text-xs sm:text-sm min-h-[44px]"
                />
                <Button 
                  onClick={copyInviteLink}
                  variant="outline"
                  className="flex-shrink-0 min-h-[44px] px-3"
                  size="sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={shareViaEmail} variant="outline" size="sm" className="text-xs min-h-[44px] flex-col gap-1 p-2">
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </Button>
              <Button onClick={shareViaText} variant="outline" size="sm" className="text-xs min-h-[44px] flex-col gap-1 p-2">
                <MessageCircle className="w-4 h-4" />
                <span>Text</span>
              </Button>
              <Button onClick={shareViaWhatsApp} variant="outline" size="sm" className="text-xs min-h-[44px] flex-col gap-1 p-2">
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>
            </div>

            <Button 
              onClick={() => setInviteModalOpen(false)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px] text-sm sm:text-base"
            >
              Start Sharing!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Garden;
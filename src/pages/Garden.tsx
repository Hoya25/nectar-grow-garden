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
import SimpleWalletConnection from '@/components/SimpleWalletConnection';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useAdmin } from '@/hooks/useAdmin';
import { MemberStatusShowcase } from '@/components/MemberStatusShowcase';
import { MemberStatusBanner } from '@/components/MemberStatusBanner';
import { CollapsibleDashboard } from '@/components/CollapsibleDashboard';
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
        setOpportunities(opportunitiesData || []);
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
      {/* Header */}
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
              </div>{/* End of flex items-center space-x-2 */}
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">{/* Status badge removed */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1 sm:gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Profile</span>
                  <span className="sm:hidden">Profile</span>
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
                  <span className="sm:hidden">Adm</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
              </div>{/* End of flex items-center gap-2 */}
            </div>{/* End of flex items-center justify-between */}
          </div>{/* End of flex flex-col sm:flex-row */}
        </div>{/* End of container */}
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        {/* Collapsible Dashboard */}
        <div className="lg:w-80 xl:w-96">
        <CollapsibleDashboard 
          portfolio={portfolio}
          locks={locks as any} // Type compatibility fix
          onLockCreated={fetchUserData}
        />
        </div>

        {/* Main Content - Earning Opportunities */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Member Status Banner - Compact */}
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

            {/* Earning Opportunities Section */}
            <div data-earning-opportunities>
              <div className="mb-8 sm:mb-12 text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 nctr-glow">
                  {getSetting?.('earning_opportunities_banner_title', 'Earning Opportunities') || 'Earning Opportunities'}
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-section-text/90 max-w-2xl mx-auto px-4 sm:px-0">
                  {getSetting?.('earning_opportunities_banner_subtitle', 'Support NCTR Alliance partners and earn NCTR with every transaction') || 'Support NCTR Alliance partners and earn NCTR with every transaction'}
                </p>
              </div>

              {/* TOP PRIORITY: Invite Friends Opportunity */}
              <div className="mb-12">
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 shadow-large hover:shadow-glow-intense transition-all duration-300">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Left Side - Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-primary/20 rounded-xl">
                            <Users className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <Badge className="bg-primary text-primary-foreground border-0 mb-2 px-3 py-1 text-sm font-semibold">
                              🚀 TOP EARNER
                            </Badge>
                            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                              Invite Friends & Earn Together
                            </h2>
                            <p className="text-muted-foreground mt-1">
                              <strong className="text-primary">1000 NCTR each in 360LOCK</strong> • Most popular way to earn
                            </p>
                          </div>
                        </div>
                        
                        {/* Value Display */}
                        <div className="flex items-center gap-6 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-primary">1000</span>
                            <img src={nctrLogo} alt="NCTR" className="h-10 w-auto" />
                            <span className="text-sm text-muted-foreground">for you</span>
                          </div>
                          <div className="text-muted-foreground">+</div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-primary">1000</span>
                            <img src={nctrLogo} alt="NCTR" className="h-10 w-auto" />
                            <span className="text-sm text-muted-foreground">for friend</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          Referral code: <span className="font-mono font-semibold text-primary">{referralCode}</span>
                        </p>
                      </div>
                      
                      {/* Right Side - Action */}
                      <div className="lg:w-72">
                        <Button 
                          onClick={() => setInviteModalOpen(true)}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-4 h-14 rounded-xl shadow-large hover:shadow-glow-intense transition-all duration-300 font-semibold mb-3"
                        >
                          <Share2 className="w-5 h-5 mr-3" />
                          Start Inviting Friends
                        </Button>
                        
                        {/* Quick Share */}
                        <div className="grid grid-cols-3 gap-2">
                          <Button 
                            onClick={copyInviteLink}
                            variant="outline" 
                            size="sm" 
                            className="flex items-center justify-center gap-1 py-3 border-primary/30 hover:bg-primary/10"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={shareViaWhatsApp}
                            variant="outline" 
                            size="sm" 
                            className="flex items-center justify-center gap-1 py-3 border-primary/30 hover:bg-primary/10"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={shareViaEmail}
                            variant="outline" 
                            size="sm" 
                            className="flex items-center justify-center gap-1 py-3 border-primary/30 hover:bg-primary/10"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Other Earning Opportunities */}
              {opportunities.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-foreground">
                    Partner Shopping Opportunities
                  </h2>
                  <p className="text-center text-muted-foreground mb-8">
                    Earn NCTR from your everyday purchases with our brand partners
                  </p>
                </div>
              )}

            {opportunities.length === 0 ? (
              <Card className="bg-white border border-section-border shadow-soft">
                <CardContent className="p-12 text-center">
                  <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-2 text-foreground">No Partner Opportunities Available</h3>
                  <p className="text-muted-foreground mb-4">We're working on bringing you amazing earning opportunities with top brands!</p>
                  <p className="text-sm text-muted-foreground">Check back soon for exciting partnership launches.</p>
                </CardContent>
              </Card>
            ) : opportunities.length === 1 ? (
              // Single opportunity - Featured layout
              <Card className="bg-white border-2 border-primary shadow-large hover:shadow-glow-intense transition-all duration-500 max-w-4xl mx-auto">
                <CardContent className="p-0">
                  {opportunities[0].video_url && (
                    <div className="relative">
                      <video 
                        className="w-full h-48 sm:h-64 md:h-80 object-cover rounded-t-lg"
                        controls
                        poster={opportunities[0].partner_logo_url}
                      >
                        <source src={opportunities[0].video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                        <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-0 text-xs sm:text-sm">
                          FEATURED
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-4">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        {opportunities[0].partner_logo_url ? (
                          <img 
                            src={opportunities[0].partner_logo_url} 
                            alt={`${opportunities[0].partner_name} logo`}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shadow-soft flex-shrink-0"
                          />
                        ) : (
                          <img 
                            src={nctrNLogo}
                            alt="The Garden Logo"
                            className="w-15 h-15 sm:w-20 sm:h-20 rounded-xl object-contain shadow-soft flex-shrink-0 scale-125"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-1 truncate">{opportunities[0].title}</h2>
                          {opportunities[0].partner_name && (
                            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground truncate">{opportunities[0].partner_name}</p>
                          )}
                          <Badge variant="outline" className="mt-2 bg-section-highlight text-xs sm:text-sm">
                            {opportunities[0].opportunity_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                      <div className="bg-section-highlight rounded-xl p-4 sm:p-6 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 mb-2">
                          <div className="text-2xl sm:text-3xl font-bold text-section-accent">
                            {formatNCTR(opportunities[0].reward_per_dollar || 0)}
                          </div>
                              <img 
                                src={nctrLogo} 
                                alt="NCTR" 
                                className="h-24 sm:h-32 lg:h-40 w-auto"
                              />
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground font-medium">per $1 spent</div>
                      </div>
                      
                      {opportunities[0].nctr_reward > 0 && (
                        <div className="bg-primary/10 rounded-xl p-4 sm:p-6 text-center border border-primary/20">
                          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                            <div className="text-2xl sm:text-3xl font-bold text-primary">
                              {formatNCTR(opportunities[0].nctr_reward)}
                            </div>
                            <img 
                              src={nctrLogo} 
                              alt="NCTR" 
                              className="h-20 sm:h-24 lg:h-28 w-auto"
                            />
                          </div>
                          <div className="text-xs sm:text-sm text-primary font-medium">Welcome Bonus</div>
                        </div>
                      )}
                    </div>

                    {opportunities[0].description && (
                      <p className="text-sm sm:text-base lg:text-lg text-foreground leading-relaxed mb-4 sm:mb-6">
                        {opportunities[0].description}
                      </p>
                    )}

                    <Button 
                      onClick={() => handleOpportunityClick(opportunities[0])}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-4 rounded-xl shadow-medium hover:shadow-large transition-all duration-300"
                    >
                      <ExternalLink className="w-5 h-5 mr-3" />
                      Start Earning with {opportunities[0].partner_name || 'This Brand'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : opportunities.length <= 3 ? (
              // Few opportunities - Showcase layout with elegant spacing
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mb-4 px-6 py-2 text-sm">
                    {opportunities.length} Premium Opportunities Available
                  </Badge>
                </div>
                
                <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
                  {opportunities.map((opportunity, index) => (
                    <Card key={opportunity.id} className={`bg-white shadow-large hover:shadow-glow-intense transition-all duration-500 border-2 ${index === 0 ? 'border-primary' : 'border-section-border'} group flex flex-col h-full`}>
                      <CardContent className="p-8 flex flex-col h-full">
                        {/* Header with elegant spacing */}
                        <div className="text-center mb-8">
                          {index === 0 && (
                            <Badge className="bg-primary text-primary-foreground border-0 mb-4 px-4 py-1">
                              FEATURED OPPORTUNITY
                            </Badge>
                          )}
                          
                          <div className="flex items-center justify-center mb-4">
                            {opportunity.partner_logo_url ? (
                              <img 
                                src={opportunity.partner_logo_url} 
                                alt={`${opportunity.partner_name} logo`}
                                className="w-16 h-16 rounded-2xl object-cover shadow-medium"
                              />
                            ) : (
                              <img 
                                src={nctrNLogo}
                                alt="The Garden Logo"
                                className="w-20 h-20 rounded-2xl object-contain shadow-medium scale-125"
                              />
                            )}
                          </div>
                          
                          <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {opportunity.title}
                          </h3>
                          {opportunity.partner_name && (
                            <p className="text-lg text-muted-foreground">{opportunity.partner_name}</p>
                          )}
                        </div>

                        {/* Video Section with elegant presentation */}
                        {opportunity.video_url && (
                          <div className="mb-8">
                            <div className="relative rounded-2xl overflow-hidden shadow-large">
                              <video 
                                className="w-full h-56 object-cover"
                                controls
                                poster={opportunity.partner_logo_url}
                              >
                                <source src={opportunity.video_url} type="video/mp4" />
                              </video>
                            </div>
                            {(opportunity.video_title || opportunity.video_description) && (
                              <div className="mt-4 text-center">
                                {opportunity.video_title && (
                                  <p className="font-medium text-foreground mb-1">{opportunity.video_title}</p>
                                )}
                                {opportunity.video_description && (
                                  <p className="text-sm text-muted-foreground">{opportunity.video_description}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Earning Display - Consistent height and alignment */}
                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-6 text-center border border-primary/20 min-h-[140px] flex flex-col justify-center">
                          <div className="flex items-center justify-center space-x-4 mb-3">
                            <div className="text-3xl font-bold text-primary">
                              {formatNCTR(opportunity.reward_per_dollar || 0)}
                            </div>
                            <img src={nctrLogo} alt="NCTR" className="h-24 w-auto" />
                          </div>
                          <div className="text-base text-muted-foreground font-medium mb-3">per $1 spent</div>
                          
                          {opportunity.nctr_reward > 0 && (
                            <div className="bg-white rounded-xl p-3 shadow-soft">
                              <div className="flex items-center justify-center space-x-2 text-primary">
                                <Gift className="w-4 h-4" />
                                <span className="font-bold text-sm">
                                  +{formatNCTR(opportunity.nctr_reward)} NCTR Welcome Bonus
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Description with elegant typography */}
                        <div className="flex-grow mb-6">
                          {opportunity.description && (
                            <p className="text-foreground leading-relaxed text-center">
                              {opportunity.description}
                            </p>
                          )}
                        </div>

                         {/* CTA Button - Consistent size and alignment */}
                         <div className="mt-auto">
                           <Button 
                             onClick={() => handleOpportunityClick(opportunity)}
                             className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3 h-12 rounded-2xl shadow-large hover:shadow-glow-intense transition-all duration-300 group-hover:scale-[1.02]"
                           >
                             <ExternalLink className="w-5 h-5 mr-2 flex-shrink-0" />
                             <span className="truncate">Start Earning</span>
                           </Button>
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              // Many opportunities - Grid layout with filters
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-center sm:text-left">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {opportunities.length} Opportunities Available
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">All</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">Shopping</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">Partner</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">Bonus</Badge>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {opportunities.map((opportunity, index) => (
                    <Card key={opportunity.id} className="bg-white border border-section-border shadow-soft hover:shadow-medium transition-all duration-300 group flex flex-col">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {opportunity.partner_logo_url ? (
                              <img 
                                src={opportunity.partner_logo_url} 
                                alt={`${opportunity.partner_name} logo`}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <img 
                                src={nctrNLogo}
                                alt="The Garden Logo"
                                className="w-12 h-12 rounded-lg object-contain scale-125"
                              />
                            )}
                            <div>
                              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {opportunity.title}
                              </h4>
                              {opportunity.partner_name && (
                                <p className="text-xs text-muted-foreground">{opportunity.partner_name}</p>
                              )}
                            </div>
                          </div>
                          {opportunity.video_url && (
                            <div className="text-section-accent">
                              <Play className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        {/* NCTR Display - Consistent height and alignment */}
                        <div className="bg-section-highlight rounded-lg p-4 mb-4 text-center min-h-[80px] flex flex-col justify-center flex-grow">
                          <div className="flex items-center justify-center space-x-2 mb-1">
                            <span className="text-lg font-bold text-section-accent">
                              {formatNCTR(opportunity.reward_per_dollar || 0)}
                            </span>
                            <img src={nctrLogo} alt="NCTR" className="h-14 w-auto" />
                          </div>
                          <div className="text-xs text-muted-foreground">per $1 spent</div>
                          {opportunity.nctr_reward > 0 && (
                            <div className="text-xs text-primary font-medium mt-2">
                              +{formatNCTR(opportunity.nctr_reward)} NCTR bonus
                            </div>
                          )}
                        </div>

                         {/* Button - Consistent alignment */}
                         <div className="mt-auto">
                           <Button 
                             onClick={() => handleOpportunityClick(opportunity)}
                             className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 h-10 rounded-lg group-hover:shadow-medium transition-all duration-300"
                           >
                             <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" />
                             <span className="truncate">Earn Now</span>
                           </Button>
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliate Links Section */}
            <div className="mt-12" data-affiliate-links>
              <Card className="bg-white border-2 border-primary shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                    <Link className="w-5 h-5" />
                    Your Personalized Affiliate Links
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Generate trackable links that credit earnings directly to your Garden account
                  </p>
                </CardHeader>
                <CardContent>
                  <UserAffiliateLinks />
                </CardContent>
              </Card>
            </div>

            {/* Community Section */}
            <div className="mt-12" data-referral-system>
              <Card className="bg-white border-2 border-primary shadow-soft">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">Join the Community</CardTitle>
                  <p className="text-muted-foreground">Invite friends and earn together</p>
                </CardHeader>
                <CardContent>
                  <ReferralSystem />
                </CardContent>
              </Card>
            </div>
            </div>
          </div>
        </main>
      </div>

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
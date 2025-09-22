import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Gift, Users, LogOut, ExternalLink, Copy, User, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LockCommitmentModal from '@/components/LockCommitmentModal';
import ReferralSystem from '@/components/ReferralSystem';
import SimpleWalletConnection from '@/components/SimpleWalletConnection';
import ProfileModal from '@/components/ProfileModal';
import nctrLogo from "@/assets/nctr-logo.png";

interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  opportunity_status: string;
}

interface LockCommitment {
  id: string;
  lock_type: string;
  nctr_amount: number;
  lock_date: string;
  unlock_date: string;
  status: string;
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
  video_url?: string;
  video_title?: string;
  video_description?: string;
}

const Garden = () => {
  const { user, signOut } = useAuth();
  const { currentPrice, priceChange24h, formatPrice, formatChange, getChangeColor, calculatePortfolioValue, contractAddress } = useNCTRPrice();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [locks, setLocks] = useState<LockCommitment[]>([]);
  const [opportunities, setOpportunities] = useState<EarningOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    try {
      // Fetch portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('*')
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
        .select('*')
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'premium': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      case 'advanced': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default: return 'bg-gradient-to-r from-green-400 to-green-600';
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
      <header className="bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                The Garden
              </h1>
            <img 
              src={nctrLogo} 
              alt="NCTR" 
              className="h-14 w-auto opacity-90 bg-white/80 rounded-lg px-2 py-1 shadow-soft"
            />
            </div>
            <Badge className={`${getStatusColor(portfolio?.opportunity_status || 'starter')} text-white border-0`}>
              {portfolio?.opportunity_status?.toUpperCase() || 'STARTER'}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <ProfileModal>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Quick Profile
              </Button>
            </ProfileModal>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Profile
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Dashboard Sidebar */}
        <aside className="w-80 bg-card/60 backdrop-blur-sm border-r border-border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-primary">Your Dashboard</h2>
            
            {/* Portfolio Overview Cards */}
            <div className="space-y-4">
              <Card className="bg-gradient-card shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <p className="text-sm text-muted-foreground">Available</p>
                        <img 
                          src={nctrLogo} 
                          alt="NCTR" 
                          className="h-5 w-auto opacity-70 bg-white/60 rounded px-1"
                        />
                      </div>
                      <p className="text-xl font-bold text-primary">
                        {formatNCTR(portfolio?.available_nctr || 0)}
                      </p>
                    </div>
                    <Coins className="h-8 w-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <img 
                          src={nctrLogo} 
                          alt="NCTR" 
                          className="h-5 w-auto opacity-70 bg-white/60 rounded px-1"
                        />
                      </div>
                      <p className="text-xl font-bold text-warning">
                        {formatNCTR(portfolio?.pending_nctr || 0)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-warning/60" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <p className="text-sm text-muted-foreground">Total Earned</p>
                        <img 
                          src={nctrLogo} 
                          alt="NCTR" 
                          className="h-5 w-auto opacity-70 bg-white/60 rounded px-1"
                        />
                      </div>
                      <p className="text-xl font-bold text-success">
                        {formatNCTR(portfolio?.total_earned || 0)}
                      </p>
                    </div>
                    <Gift className="h-8 w-8 text-success/60" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* NCTR Price Info */}
          <Card className="bg-gradient-depth shadow-medium">
            <CardContent className="p-4">
              <div className="text-center text-white">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <img 
                    src={nctrLogo} 
                    alt="NCTR" 
                    className="h-8 w-auto"
                  />
                  <p className="text-sm opacity-80">Price</p>
                </div>
                <p className="text-2xl font-bold">${formatPrice(currentPrice)}</p>
                <p className={`text-sm ${getChangeColor(priceChange24h)}`}>
                  {formatChange(priceChange24h)} (24h)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Lock Commitments Summary */}
          {locks.length > 0 && (
            <Card className="bg-gradient-card shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lock Commitments</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {locks.slice(0, 2).map((lock) => {
                    const unlockDate = new Date(lock.unlock_date);
                    const lockDate = new Date(lock.lock_date);
                    const totalDuration = unlockDate.getTime() - lockDate.getTime();
                    const elapsed = Date.now() - lockDate.getTime();
                    const progress = Math.min((elapsed / totalDuration) * 100, 100);
                    
                    return (
                      <div key={lock.id} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span>{lock.lock_type}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    );
                  })}
                  {locks.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{locks.length - 2} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="space-y-3">
            <LockCommitmentModal 
              availableNCTR={portfolio?.available_nctr || 0}
              onLockCreated={fetchUserData}
            />
            <Button variant="outline" className="w-full" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              View Full Profile
            </Button>
          </div>

          {/* Wallet Connection */}
          <div>
            <h3 className="text-sm font-medium mb-2">Wallet Connection</h3>
            <SimpleWalletConnection />
          </div>
        </aside>

        {/* Main Content - Earning Opportunities */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                Earning Opportunities
              </h1>
              <p className="text-muted-foreground">
                Discover amazing brands and earn NCTR with every purchase
              </p>
            </div>

            {opportunities.length === 0 ? (
              <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
                <CardContent className="p-12 text-center">
                  <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-2">No Opportunities Available</h3>
                  <p className="text-muted-foreground mb-4">We're working on bringing you amazing earning opportunities with top brands!</p>
                  <p className="text-sm text-muted-foreground">Check back soon for exciting partnership launches.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {opportunities.map((opportunity) => (
                  <Card key={opportunity.id} className="bg-card/90 backdrop-blur-sm shadow-medium hover:shadow-glow transition-all duration-300 animate-fade-in">
                    <CardContent className="p-0">
                      {/* Brand Header with Logo */}
                      <div className="bg-gradient-accent p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {opportunity.partner_logo_url ? (
                              <img 
                                src={opportunity.partner_logo_url} 
                                alt={`${opportunity.partner_name} logo`}
                                className="w-12 h-12 rounded-lg object-cover bg-white/10 p-2"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                                <Gift className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <h3 className="text-lg font-bold">{opportunity.title}</h3>
                              {opportunity.partner_name && (
                                <p className="text-sm opacity-80">{opportunity.partner_name}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-white/20 text-white border-0">
                            {opportunity.opportunity_type.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Earning Rate - Prominent Display */}
                        <div className="bg-white/10 rounded-lg p-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-1">
                              <div className="text-2xl font-bold">
                                {formatNCTR(opportunity.reward_per_dollar || 0)}
                              </div>
                              <img 
                                src={nctrLogo} 
                                alt="NCTR" 
                                className="h-10 w-auto bg-white/80 rounded px-1"
                              />
                            </div>
                            <div className="text-sm opacity-80">per $1 spent</div>
                            {opportunity.nctr_reward > 0 && (
                              <div className="flex items-center justify-center space-x-1 text-xs opacity-70 mt-2">
                                <span>+ {formatNCTR(opportunity.nctr_reward)}</span>
                                <img 
                                  src={nctrLogo} 
                                  alt="NCTR" 
                                  className="h-5 w-auto bg-white/60 rounded px-1"
                                />
                                <span>signup bonus</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Video Section */}
                        {opportunity.video_url && (
                          <div className="mb-6">
                            <div className="relative rounded-lg overflow-hidden">
                              <video 
                                className="w-full h-48 object-cover"
                                controls
                                poster={opportunity.partner_logo_url}
                              >
                                <source src={opportunity.video_url} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                              {opportunity.video_title && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                  <p className="text-white font-medium text-sm">{opportunity.video_title}</p>
                                </div>
                              )}
                            </div>
                            {opportunity.video_description && (
                              <p className="text-sm text-muted-foreground mt-2">{opportunity.video_description}</p>
                            )}
                          </div>
                        )}

                        {/* Description */}
                        <p className="text-muted-foreground mb-6 leading-relaxed">
                          {opportunity.description}
                        </p>

                        {/* Action Button */}
                        <Button className="w-full bg-gradient-hero hover:opacity-90 text-lg py-3">
                          <ExternalLink className="w-5 h-5 mr-2" />
                          Start Earning Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Community Section */}
            <div className="mt-12">
              <Card className="bg-gradient-card shadow-large">
                <CardHeader>
                  <CardTitle className="text-xl">Join the Community</CardTitle>
                  <p className="text-muted-foreground">Invite friends and earn together</p>
                </CardHeader>
                <CardContent>
                  <ReferralSystem />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Garden;
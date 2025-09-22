import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Gift, Users, LogOut, ExternalLink, Copy, User, Play, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LockCommitmentModal from '@/components/LockCommitmentModal';
import ReferralSystem from '@/components/ReferralSystem';
import SimpleWalletConnection from '@/components/SimpleWalletConnection';
import { useAdmin } from '@/hooks/useAdmin';
import nctrLogo from "@/assets/nctr-logo-grey.png";

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

import ProfileModal from '@/components/ProfileModal';

const Garden = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
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
      <header className="section-highlight backdrop-blur-sm border-b border-section-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold nctr-text">
                The Garden
              </h1>
            <img 
              src={nctrLogo} 
              alt="NCTR" 
              className="h-28 w-auto opacity-90"
            />
            </div>
          <Badge className={`${getStatusColor(portfolio?.opportunity_status || 'starter')} text-foreground border-0`}>
            {portfolio?.opportunity_status?.toUpperCase() || 'STARTER'} • {portfolio?.lock_360_nctr && parseFloat(portfolio.lock_360_nctr.toString()) > 0 ? '360LOCK MEMBER' : 'STANDARD'}
          </Badge>
          </div>
          <div className="flex items-center gap-3">
            <ProfileModal>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 section-text hover:bg-primary/10 hover:text-primary">
                <User className="w-4 h-4" />
                Quick Profile
              </Button>
            </ProfileModal>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary"
            >
              <User className="w-4 h-4" />
              Profile
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary"
              >
                <Settings className="w-4 h-4" />
                Admin
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="border-primary/50 section-text hover:bg-primary/10 hover:text-primary"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Compact Dashboard Sidebar */}
        <aside className="section-highlight backdrop-blur-sm border-r border-section-border p-4 space-y-4 w-72 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold mb-3 section-heading">Dashboard</h2>
            
            {/* Portfolio Overview Cards - Compact */}
            <div className="space-y-3">
              <Card className="bg-white shadow-soft border border-section-border/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-section-text/70">Available</p>
                        <img 
                          src={nctrLogo} 
                          alt="NCTR" 
                          className="h-14 w-auto opacity-70"
                        />
                      </div>
                      <p className="text-lg font-bold text-section-accent">
                        {formatNCTR(portfolio?.available_nctr || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Ready to commit</p>
                    </div>
                    <Coins className="h-6 w-6 text-foreground/60 ml-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-soft border border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-blue-700">90LOCK</p>
                        <div className="flex items-center space-x-1">
                          <img 
                            src={nctrLogo} 
                            alt="NCTR" 
                            className="h-14 w-auto opacity-70"
                          />
                          <span className="text-xs text-blue-600 font-bold">90D</span>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-blue-800">
                        {formatNCTR(portfolio?.lock_90_nctr || 0)}
                      </p>
                      <p className="text-xs text-blue-600">90 Day Commitment</p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-blue-600 ml-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/20 shadow-soft border border-primary/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-primary">360LOCK</p>
                        <div className="flex items-center space-x-1">
                          <img 
                            src={nctrLogo} 
                            alt="NCTR" 
                            className="h-14 w-auto opacity-90"
                          />
                          <span className="text-xs text-primary font-bold">360D</span>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {formatNCTR(portfolio?.lock_360_nctr || 0)}
                      </p>
                      <p className="text-xs text-primary/80">Alliance Status Builder</p>
                    </div>
                    <Gift className="h-6 w-6 text-primary ml-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-soft border border-section-border/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-section-text/70">Total Earned</p>
                        <img 
                          src={nctrLogo} 
                          alt="NCTR" 
                          className="h-14 w-auto opacity-70"
                        />
                      </div>
                      <p className="text-lg font-bold text-section-accent">
                        {formatNCTR(portfolio?.total_earned || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                    </div>
                    <Users className="h-6 w-6 text-success/60 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* NCTR Price Info - Compact */}
          <Card className="bg-white shadow-medium border border-section-border">
            <CardContent className="p-3">
              <div className="text-center text-foreground">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <img 
                    src={nctrLogo} 
                    alt="NCTR" 
                    className="h-22 w-auto"
                  />
                </div>
                <p className="text-xl font-bold text-section-accent">${formatPrice(currentPrice)}</p>
                <p className={`text-xs ${getChangeColor(priceChange24h)}`}>
                  {formatChange(priceChange24h)} (24h)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Lock Status Summary - Compact */}
          {(locks.length > 0 || (portfolio?.lock_90_nctr || 0) > 0 || (portfolio?.lock_360_nctr || 0) > 0) && (
            <Card className="bg-white shadow-soft border border-section-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-foreground">Alliance Commitments</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  {portfolio?.lock_360_nctr && parseFloat(portfolio.lock_360_nctr.toString()) > 0 && (
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-2 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-primary">360LOCK Status</span>
                        <span className="text-xs text-primary">Elite Commitment</span>
                      </div>
                      <div className="text-sm font-bold text-primary">{formatNCTR(parseFloat(portfolio.lock_360_nctr.toString()))} NCTR</div>
                    </div>
                  )}
                  
                  {portfolio?.lock_90_nctr && parseFloat(portfolio.lock_90_nctr.toString()) > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-2 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-blue-700">90LOCK Active</span>
                        <span className="text-xs text-blue-600">Standard</span>
                      </div>
                      <div className="text-sm font-bold text-blue-800">{formatNCTR(parseFloat(portfolio.lock_90_nctr.toString()))} NCTR</div>
                    </div>
                  )}
                  
                  {locks.slice(0, 1).map((lock) => {
                    const unlockDate = new Date(lock.unlock_date);
                    const lockDate = new Date(lock.lock_date);
                    const totalDuration = unlockDate.getTime() - lockDate.getTime();
                    const elapsed = Date.now() - lockDate.getTime();
                    const progress = Math.min((elapsed / totalDuration) * 100, 100);
                    const isLongTerm = totalDuration >= (300 * 24 * 60 * 60 * 1000); // 300+ days
                    
                    return (
                      <div key={lock.id} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className={`font-medium ${isLongTerm ? 'text-primary' : 'text-blue-700'}`}>
                            {isLongTerm ? '360LOCK' : '90LOCK'} Progress
                          </span>
                          <span className={`font-bold ${isLongTerm ? 'text-primary' : 'text-blue-700'}`}>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    );
                  })}
                  {locks.length > 1 && (
                    <p className="text-xs text-muted-foreground">+{locks.length - 1} more commitments</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions - Compact */}
          <div className="space-y-2">
            <LockCommitmentModal 
              availableNCTR={portfolio?.available_nctr || 0}
              onLockCreated={fetchUserData}
            />
            <Button variant="outline" size="sm" className="w-full text-xs border-primary/50 text-primary hover:bg-primary/10" onClick={() => navigate('/profile')}>
              <User className="w-3 h-3 mr-2" />
              Alliance Profile
            </Button>
          </div>

          {/* Wallet Connection - Compact */}
          <div>
            <h3 className="text-xs font-medium mb-2">Wallet</h3>
            <SimpleWalletConnection />
          </div>
        </aside>

        {/* Main Content - Earning Opportunities with More Space */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 nctr-glow">
                Earning Opportunities
              </h1>
              <p className="text-xl text-section-text/90 max-w-2xl mx-auto">
                Support NCTR Alliance partners and earn NCTR with every transaction
              </p>
            </div>

            {opportunities.length === 0 ? (
              <Card className="bg-white border border-section-border shadow-soft">
                <CardContent className="p-12 text-center">
                  <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                  <h3 className="text-xl font-semibold mb-2 text-foreground">No Opportunities Available</h3>
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
                        className="w-full h-64 md:h-80 object-cover rounded-t-lg"
                        controls
                        poster={opportunities[0].partner_logo_url}
                      >
                        <source src={opportunities[0].video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-0">
                          FEATURED
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        {opportunities[0].partner_logo_url && (
                          <img 
                            src={opportunities[0].partner_logo_url} 
                            alt={`${opportunities[0].partner_name} logo`}
                            className="w-16 h-16 rounded-xl object-cover shadow-soft"
                          />
                        )}
                        <div>
                          <h2 className="text-2xl font-bold text-foreground mb-1">{opportunities[0].title}</h2>
                          {opportunities[0].partner_name && (
                            <p className="text-lg text-muted-foreground">{opportunities[0].partner_name}</p>
                          )}
                          <Badge variant="outline" className="mt-2 bg-section-highlight">
                            {opportunities[0].opportunity_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-section-highlight rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center space-x-4 mb-2">
                          <div className="text-3xl font-bold text-section-accent">
                            {formatNCTR(opportunities[0].reward_per_dollar || 0)}
                          </div>
                              <img 
                                src={nctrLogo} 
                                alt="NCTR" 
                                className="h-40 w-auto"
                              />
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">per $1 spent</div>
                      </div>
                      
                      {opportunities[0].nctr_reward > 0 && (
                        <div className="bg-primary/10 rounded-xl p-6 text-center border border-primary/20">
                          <div className="flex items-center justify-center space-x-3 mb-2">
                            <div className="text-3xl font-bold text-primary">
                              {formatNCTR(opportunities[0].nctr_reward)}
                            </div>
                            <img 
                              src={nctrLogo} 
                              alt="NCTR" 
                              className="h-28 w-auto"
                            />
                          </div>
                          <div className="text-sm text-primary font-medium">Welcome Bonus</div>
                        </div>
                      )}
                    </div>

                    {opportunities[0].description && (
                      <p className="text-foreground leading-relaxed mb-6 text-lg">
                        {opportunities[0].description}
                      </p>
                    )}

                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-4 rounded-xl shadow-medium hover:shadow-large transition-all duration-300">
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
                            {opportunity.partner_logo_url && (
                              <img 
                                src={opportunity.partner_logo_url} 
                                alt={`${opportunity.partner_name} logo`}
                                className="w-16 h-16 rounded-2xl object-cover shadow-medium"
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
                          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base py-3 h-12 rounded-2xl shadow-large hover:shadow-glow-intense transition-all duration-300 group-hover:scale-[1.02]">
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
                              <div className="w-10 h-10 rounded-lg bg-section-highlight flex items-center justify-center">
                                <Gift className="w-5 h-5 text-foreground" />
                              </div>
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
                          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2 h-10 rounded-lg group-hover:shadow-medium transition-all duration-300">
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

            {/* Community Section */}
            <div className="mt-12">
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
        </main>
      </div>
    </div>
  );
};

export default Garden;
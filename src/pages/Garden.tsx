import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Gift, Users, LogOut, Plus, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LockCommitmentModal from '@/components/LockCommitmentModal';
import ReferralSystem from '@/components/ReferralSystem';
import SimpleWalletConnection from '@/components/SimpleWalletConnection';

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
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Welcome to The Garden
            </h1>
            <Badge className={`${getStatusColor(portfolio?.opportunity_status || 'starter')} text-white border-0`}>
              {portfolio?.opportunity_status?.toUpperCase() || 'STARTER'}
            </Badge>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available NCTR</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatNCTR(portfolio?.available_nctr || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Ready to use</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending NCTR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {formatNCTR(portfolio?.pending_nctr || 0)}
              </div>
              <p className="text-xs text-muted-foreground">In lock commitments</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatNCTR(portfolio?.total_earned || 0)}
              </div>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="earn" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="earn">Earn NCTR</TabsTrigger>
            <TabsTrigger value="locks">Lock Commitments</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>

          <TabsContent value="earn" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Earning Opportunities</h3>
                <LockCommitmentModal 
                  availableNCTR={portfolio?.available_nctr || 0}
                  onLockCreated={fetchUserData}
                />
              </div>
              
              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold mb-1">Invite Friends</h4>
                        <p className="text-sm text-muted-foreground">Earn 50 NCTR per referral</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        Invite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold mb-1">Shop & Earn</h4>
                        <p className="text-sm text-muted-foreground">Get NCTR from purchases</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Gift className="w-4 h-4 mr-2" />
                        Shop
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {opportunities.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No brand partnerships available right now.</p>
                    <p className="text-sm text-muted-foreground">We're working on bringing you amazing earning opportunities with top brands!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {opportunities.map((opportunity) => (
                    <Card key={opportunity.id} className="bg-card/80 backdrop-blur-sm hover:shadow-glow transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                        <Badge variant="secondary" className="w-fit">
                          {opportunity.opportunity_type.toUpperCase()}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {opportunity.description}
                        </p>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            {opportunity.nctr_reward && (
                              <span className="text-lg font-bold text-primary">
                                +{formatNCTR(opportunity.nctr_reward)} NCTR
                              </span>
                            )}
                            {opportunity.reward_per_dollar && (
                              <span className="text-sm text-muted-foreground block">
                                {formatNCTR(opportunity.reward_per_dollar)} NCTR per $1
                              </span>
                            )}
                          </div>
                          <Button className="bg-gradient-hero hover:opacity-90">
                            Start Earning
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="locks" className="space-y-4">
            <h3 className="text-xl font-semibold">Your Lock Commitments</h3>
            
            {locks.length === 0 ? (
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No active lock commitments.</p>
                  <p className="text-sm text-muted-foreground mt-2">Lock your NCTR to increase your opportunity status!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {locks.map((lock) => {
                  const unlockDate = new Date(lock.unlock_date);
                  const lockDate = new Date(lock.lock_date);
                  const totalDuration = unlockDate.getTime() - lockDate.getTime();
                  const elapsed = Date.now() - lockDate.getTime();
                  const progress = Math.min((elapsed / totalDuration) * 100, 100);
                  
                  return (
                    <Card key={lock.id} className="bg-card/80 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{lock.lock_type}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Locked: {formatNCTR(lock.nctr_amount)} NCTR
                            </p>
                          </div>
                          <Badge variant={lock.status === 'active' ? 'default' : 'secondary'}>
                            {lock.status.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Unlock Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Locked: {new Date(lock.lock_date).toLocaleDateString()}</span>
                            <span>Unlocks: {unlockDate.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <h3 className="text-xl font-semibold">Portfolio Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>NCTR Price</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(contractAddress)}
                      className="text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      CA
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-2">
                    ${formatPrice(currentPrice)}
                  </div>
                  <div className={`text-sm ${getChangeColor(priceChange24h)}`}>
                    {formatChange(priceChange24h)} (24h)
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                    <span>Base Network</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => window.open(`https://basescan.org/token/${contractAddress}`, '_blank')}
                      className="text-xs p-0 h-auto"
                    >
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Portfolio Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-2">
                    ${calculatePortfolioValue(portfolio?.available_nctr || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Available balance</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Total Holdings: ${calculatePortfolioValue((portfolio?.available_nctr || 0) + (portfolio?.pending_nctr || 0)).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Wallet Connection */}
            <SimpleWalletConnection />

            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Network:</span>
                    <p className="font-medium">Base (Chain ID: 8453)</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contract:</span>
                    <p className="font-medium font-mono text-xs break-all">{contractAddress}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Symbol:</span>
                    <p className="font-medium">NCTR</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <h3 className="text-xl font-semibold">Grow The Community</h3>
            <ReferralSystem />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Garden;
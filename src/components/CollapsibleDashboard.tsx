import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  TrendingUp, 
  Gift, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  User,
  Wallet,
  BarChart3,
  Lock
} from 'lucide-react';
import LockCommitmentModal from '@/components/LockCommitmentModal';
import WalletConnection from '@/components/WalletConnection';
import { useNavigate } from 'react-router-dom';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { useWallet } from '@/hooks/useWallet';
import LockUpgradeModal from '@/components/LockUpgradeModal';
import BatchLockUpgrade from '@/components/BatchLockUpgrade';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Lock360InfoTooltip } from '@/components/ui/info-tooltip';
import nctrLogo from "@/assets/nctr-logo-transparent.png";

interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  lock_90_nctr: number;
  lock_360_nctr: number;
  opportunity_status: string;
}

interface Lock {
  id: string;
  lock_date: string;
  unlock_date: string;
  nctr_amount: number;
  lock_category: string;
  can_upgrade?: boolean;
  status: string;
}

interface CollapsibleDashboardProps {
  portfolio: Portfolio | null;
  locks: Lock[];
  onLockCreated: () => void;
}

const formatNCTR = (amount: number): string => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
  if (amount >= 10000) return (amount / 1000).toFixed(2) + 'K';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const CollapsibleDashboard: React.FC<CollapsibleDashboardProps> = ({
  portfolio,
  locks,
  onLockCreated
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed on mobile
  const [isCommitting, setIsCommitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected } = useWallet();
  const { currentPrice, priceChange24h, formatPrice, formatChange, getChangeColor, calculatePortfolioValue, formatUSD } = useNCTRPrice();

  const handleCommitTo360LOCK = async () => {
    if (!user || !portfolio?.available_nctr || portfolio.available_nctr <= 0) {
      toast({
        title: "No NCTR Available",
        description: "You don't have any available NCTR to commit.",
        variant: "destructive",
      });
      return;
    }

    setIsCommitting(true);
    try {
      const { data, error } = await supabase.rpc('commit_available_to_360lock', {
        p_user_id: user.id,
        p_amount: portfolio.available_nctr
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result?.success) {
        toast({
          title: "🎉 Committed to 360LOCK!",
          description: `Successfully committed ${formatNCTR(portfolio.available_nctr)} NCTR to 360LOCK for maximum alliance benefits.`,
        });
        onLockCreated(); // Refresh data
      } else {
        throw new Error(result?.error || 'Failed to commit to 360LOCK');
      }
    } catch (error) {
      console.error('Error committing to 360LOCK:', error);
      toast({
        title: "Commitment Failed",
        description: error instanceof Error ? error.message : "Failed to commit NCTR to 360LOCK. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="lg:w-80 xl:w-96">
      {/* Mobile Toggle Button */}
      <div className="lg:hidden bg-section-highlight border-b border-section-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-between hover:bg-primary/10 text-sm"
        >
          <span className="font-medium">Portfolio {isCollapsed ? '▼' : '▲'}</span>
          <div className="flex flex-col items-end text-xs text-muted-foreground">
            <span>
              {formatNCTR((portfolio?.available_nctr || 0) + (portfolio?.lock_360_nctr || 0) + (portfolio?.lock_90_nctr || 0))} NCTR
            </span>
            <span className="text-green-600 font-medium">
              ${formatPrice(calculatePortfolioValue(
                (portfolio?.available_nctr || 0) + (portfolio?.lock_90_nctr || 0) + (portfolio?.lock_360_nctr || 0)
              ))}
            </span>
          </div>
        </Button>
      </div>

      {/* Dashboard Content */}
      <aside className={`
        section-highlight backdrop-blur-sm border-r border-section-border 
        ${isCollapsed ? 'hidden lg:block' : 'block'} 
        lg:block p-3 sm:p-4 space-y-3 sm:space-y-4 w-full flex-shrink-0 animate-slide-in-right
      `}>
      <div className="hidden lg:flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold section-heading">Dashboard</h2>
      </div>
      
      {/* Portfolio Overview Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:space-y-0">
        <Card className="bg-white shadow-soft border border-section-border/30 col-span-2 sm:col-span-1 lg:col-span-1">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <p className="text-xs sm:text-sm text-section-text/70 font-medium">Available</p>
                  <img 
                    src={nctrLogo} 
                    alt="NCTR" 
                    className="h-8 sm:h-12 w-auto opacity-70"
                  />
                </div>
                <p className="text-lg sm:text-xl font-bold text-section-accent mb-1">
                  {formatNCTR(portfolio?.available_nctr || 0)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground">Ready to commit</p>
                    <p className="text-xs text-green-600 font-medium">
                      ${formatPrice(calculatePortfolioValue(portfolio?.available_nctr || 0))}
                    </p>
                  </div>
                  {portfolio?.available_nctr && portfolio.available_nctr > 0 && (
                    <Button
                      onClick={handleCommitTo360LOCK}
                      disabled={isCommitting}
                      size="sm"
                      variant="360lock"
                      className="h-6 px-2 text-xs"
                    >
                      {isCommitting ? 'Committing...' : '→ 360LOCK'}
                    </Button>
                  )}
                </div>
              </div>
              <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-foreground/60 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-soft border border-blue-200">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="text-xs sm:text-sm font-semibold text-blue-700">90</span>
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">LOCK</span>
                  </div>
                  <img 
                    src={nctrLogo} 
                    alt="NCTR" 
                    className="h-8 sm:h-12 w-auto opacity-70"
                  />
                </div>
                <p className="text-base sm:text-lg font-bold text-blue-800 mb-1">
                  {formatNCTR(portfolio?.lock_90_nctr || 0)}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-blue-600">Standard</p>
                  {portfolio?.lock_90_nctr && portfolio.lock_90_nctr > 0 && (
                      <Button
                        onClick={handleCommitTo360LOCK}
                        disabled={isCommitting}
                        size="sm"
                        variant="360lock"
                        className="h-6 px-2 text-xs"
                      >
                      {isCommitting ? 'Upgrading...' : '→ 360LOCK'}
                    </Button>
                  )}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/20 shadow-soft border border-primary/30">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-primary">360</span>
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    <span className="text-xs font-bold text-primary">LOCK</span>
                  </div>
                  <img 
                    src={nctrLogo} 
                    alt="NCTR" 
                    className="h-8 sm:h-12 w-auto opacity-90"
                  />
                </div>
                <p className="text-base sm:text-lg font-bold text-primary mb-1">
                  {formatNCTR(portfolio?.lock_360_nctr || 0)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-xs text-primary/80">Alliance</p>
                    <p className="text-xs text-primary font-medium">
                      ${formatPrice(calculatePortfolioValue(portfolio?.lock_360_nctr || 0))}
                    </p>
                  </div>
                </div>
              </div>
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-primary ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-soft border border-section-border/30">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <p className="text-xs sm:text-sm text-section-text/70 font-medium">Total Earned</p>
                  <img 
                    src={nctrLogo} 
                    alt="NCTR" 
                    className="h-8 sm:h-12 w-auto opacity-70"
                  />
                </div>
                <p className="text-lg sm:text-xl font-bold text-section-accent mb-1">
                  {formatNCTR(portfolio?.total_earned || 0)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground">Lifetime</p>
                    <p className="text-xs text-green-600 font-medium">
                      ${formatPrice(calculatePortfolioValue(portfolio?.total_earned || 0))}
                    </p>
                  </div>
                </div>
              </div>
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-success/60 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NCTR Price Info & Total Portfolio Value - Mobile Compact */}
      <Card className="bg-white shadow-medium border border-section-border">
        <CardContent className="p-3 sm:p-4">
          <div className="text-center text-foreground">
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <img 
                src={nctrLogo} 
                alt="NCTR" 
                className="h-12 sm:h-16 w-auto"
              />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-section-accent mb-1">${formatPrice(currentPrice)}</p>
            <p className={`text-xs sm:text-sm mb-2 ${getChangeColor(priceChange24h)}`}>
              {formatChange(priceChange24h)} (24h)
            </p>
            
            {/* Total Portfolio Value */}
            <div className="mt-3 pt-3 border-t border-section-border">
              <p className="text-xs text-muted-foreground mb-1">Total Portfolio Value</p>
              <p className="text-lg font-bold text-primary">
                {formatUSD(
                  (portfolio?.available_nctr || 0) + 
                  (portfolio?.lock_90_nctr || 0) + 
                  (portfolio?.lock_360_nctr || 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNCTR(
                  (portfolio?.available_nctr || 0) + 
                  (portfolio?.lock_90_nctr || 0) + 
                  (portfolio?.lock_360_nctr || 0)
                )} NCTR
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lock Status Summary - Hidden temporarily */}
      {false && (locks.length > 0 || (portfolio?.lock_90_nctr && portfolio.lock_90_nctr > 0) || (portfolio?.lock_360_nctr && portfolio.lock_360_nctr > 0)) && (
        <Card className="bg-white shadow-soft border border-section-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Alliance Commitments</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {portfolio?.lock_360_nctr && portfolio.lock_360_nctr > 0 && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-primary">360</span>
                      <Lock className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-primary">LOCK Active</span>
                    </div>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Elite Status</span>
                  </div>
                  <div className="text-base font-bold text-primary">{formatNCTR(portfolio.lock_360_nctr)} NCTR</div>
                  <div className="text-xs text-primary/70 mt-1">Maximum alliance benefits</div>
                </div>
              )}
              
              {portfolio?.lock_90_nctr && portfolio.lock_90_nctr > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-blue-700">90</span>
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-700">LOCK Active</span>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Can Upgrade</span>
                  </div>
                  <div className="text-base font-bold text-blue-800">{formatNCTR(portfolio.lock_90_nctr)} NCTR</div>
                  <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                    <span>Upgrade to 360LOCK for max benefits</span>
                    <Lock360InfoTooltip size={12} />
                  </div>
                </div>
              )}
              
              {locks.slice(0, 1).map((lock) => {
                const unlockDate = new Date(lock.unlock_date);
                const lockDate = new Date(lock.lock_date);
                const totalDuration = unlockDate.getTime() - lockDate.getTime();
                const elapsed = Date.now() - lockDate.getTime();
                const progress = Math.min((elapsed / totalDuration) * 100, 100);
                const isLongTerm = totalDuration >= (300 * 24 * 60 * 60 * 1000); // 300+ days
                const canUpgrade = lock.can_upgrade === true && lock.lock_category === '90LOCK';
                
                return (
                  <div key={lock.id} className="text-xs">
                    <div className="flex justify-between mb-1">
                    <span className={`font-medium ${isLongTerm ? 'text-primary' : 'text-blue-700'}`}>
                      <div className="flex items-center space-x-1">
                        <span>{isLongTerm ? '360' : '90'}</span>
                        <Lock className="w-3 h-3" />
                        <span>LOCK Progress</span>
                        {canUpgrade && (
                          <LockUpgradeModal lock={lock} onUpgradeComplete={() => window.location.reload()}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-5 px-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary"
                            >
                              Upgrade
                            </Button>
                          </LockUpgradeModal>
                        )}
                      </div>
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

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid grid-cols-1 gap-2">
        <div data-lock-commitment>
          <LockCommitmentModal 
            availableNCTR={portfolio?.available_nctr || 0}
            onLockCreated={onLockCreated}
          />
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm border-primary/50 text-primary hover:bg-primary/10 min-h-[44px]" onClick={() => navigate('/profile')}>
          <User className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          Alliance Profile
        </Button>
      </div>

      {/* Batch Lock Upgrade - Hidden temporarily */}
      {false && <BatchLockUpgrade 
        locks={locks}
        onUpgradeComplete={onLockCreated}
        availableNCTR={portfolio?.available_nctr}
      />}

      {/* Wallet Connection - Conditional Priority */}
      <div>
        <h3 className="text-xs sm:text-sm font-medium mb-2">
          {!isConnected ? "Connect Wallet" : "Wallet"}
        </h3>
        <WalletConnection />
      </div>
    </aside>
    </div>
  );
};
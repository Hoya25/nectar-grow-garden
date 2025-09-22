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
import SimpleWalletConnection from '@/components/SimpleWalletConnection';
import { useNavigate } from 'react-router-dom';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import nctrLogo from "@/assets/nctr-logo-grey.png";

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
}

interface CollapsibleDashboardProps {
  portfolio: Portfolio | null;
  locks: Lock[];
  onLockCreated: () => void;
}

const formatNCTR = (amount: number): string => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return amount.toLocaleString();
};

export const CollapsibleDashboard: React.FC<CollapsibleDashboardProps> = ({
  portfolio,
  locks,
  onLockCreated
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { currentPrice, priceChange24h, formatPrice, formatChange, getChangeColor } = useNCTRPrice();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Minimized View
  if (!isExpanded) {
    return (
      <aside className="section-highlight backdrop-blur-sm border-r border-section-border p-2 w-16 flex-shrink-0 animate-fade-in">
        {/* Expand Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="w-full h-12 p-0 hover:bg-primary/10 hover:scale-105 transition-all duration-200 group"
            title="Expand Dashboard"
          >
            <div className="flex flex-col items-center">
              <BarChart3 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
            </div>
          </Button>
        </div>

        {/* Minimized Portfolio Cards */}
        <div className="space-y-2">
          {/* Available NCTR */}
          <Card className="bg-white shadow-soft border border-section-border/30 hover:shadow-medium transition-shadow">
            <CardContent className="p-2">
              <div className="flex flex-col items-center text-center">
                <Coins className="w-4 h-4 text-foreground/60 mb-1" />
                <p className="text-xs font-bold text-section-accent">
                  {formatNCTR(portfolio?.available_nctr || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Avail</p>
              </div>
            </CardContent>
          </Card>

          {/* 90LOCK */}
          <Card className="bg-gradient-to-b from-blue-50 to-blue-100 shadow-soft border border-blue-200 hover:shadow-medium transition-shadow">
            <CardContent className="p-2">
              <div className="flex flex-col items-center text-center">
                <TrendingUp className="w-4 h-4 text-blue-600 mb-1" />
                <p className="text-xs font-bold text-blue-800">
                  {formatNCTR(portfolio?.lock_90_nctr || 0)}
                </p>
                <p className="text-xs text-blue-600">90D</p>
              </div>
            </CardContent>
          </Card>

          {/* 360LOCK */}
          <Card className="bg-gradient-to-b from-primary/10 to-primary/20 shadow-soft border border-primary/30 hover:shadow-medium transition-shadow">
            <CardContent className="p-2">
              <div className="flex flex-col items-center text-center">
                <Gift className="w-4 h-4 text-primary mb-1" />
                <p className="text-xs font-bold text-primary">
                  {formatNCTR(portfolio?.lock_360_nctr || 0)}
                </p>
                <p className="text-xs text-primary/80">360D</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card className="bg-white shadow-soft border border-section-border/30 hover:shadow-medium transition-shadow">
            <CardContent className="p-2">
              <div className="flex flex-col items-center text-center">
                <Users className="w-4 h-4 text-success/60 mb-1" />
                <p className="text-xs font-bold text-section-accent">
                  {formatNCTR(portfolio?.total_earned || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>

          {/* NCTR Price - Minimized */}
          <Card className="bg-white shadow-medium border border-section-border hover:shadow-large transition-shadow">
            <CardContent className="p-2">
              <div className="flex flex-col items-center text-center">
                <img src={nctrLogo} alt="NCTR" className="h-4 w-auto mb-1" />
                <p className="text-xs font-bold text-section-accent">${formatPrice(currentPrice)}</p>
                <p className={`text-xs ${getChangeColor(priceChange24h)}`}>
                  {formatChange(priceChange24h)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Minimized Actions */}
        <div className="mt-4 space-y-2">
          <div className="relative group">
            <LockCommitmentModal 
              availableNCTR={portfolio?.available_nctr || 0}
              onLockCreated={onLockCreated}
            />
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/profile')}
            className="w-full h-10 p-0 hover:bg-primary/10 group"
            title="Profile"
          >
            <User className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full h-10 p-0 hover:bg-primary/10 group"
            title="Wallet"
          >
            <Wallet className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </aside>
    );
  }

  // Expanded View (Original Dashboard)
  return (
    <aside className="section-highlight backdrop-blur-sm border-r border-section-border p-4 space-y-4 w-72 flex-shrink-0 animate-slide-in-right">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold section-heading">Dashboard</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          className="p-1 hover:bg-primary/10 group"
          title="Minimize Dashboard"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Button>
      </div>
      
      {/* Portfolio Overview Cards - Full */}
      <div className="space-y-3">
        <Card className="bg-white shadow-soft border border-section-border/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-section-text/70">Available</p>
                  <div className="flex items-center space-x-1">
                    <img 
                      src={nctrLogo} 
                      alt="NCTR" 
                      className="h-14 w-auto opacity-70"
                    />
                  </div>
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
                  <div className="flex items-center space-x-1">
                    <img 
                      src={nctrLogo} 
                      alt="NCTR" 
                      className="h-14 w-auto opacity-70"
                    />
                  </div>
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

      {/* NCTR Price Info - Full */}
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

      {/* Lock Status Summary - Full */}
      {(locks.length > 0 || (portfolio?.lock_90_nctr && portfolio.lock_90_nctr > 0) || (portfolio?.lock_360_nctr && portfolio.lock_360_nctr > 0)) && (
        <Card className="bg-white shadow-soft border border-section-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Alliance Commitments</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {portfolio?.lock_360_nctr && portfolio.lock_360_nctr > 0 && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-2 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-primary">360LOCK Status</span>
                    <span className="text-xs text-primary">Elite Commitment</span>
                  </div>
                  <div className="text-sm font-bold text-primary">{formatNCTR(portfolio.lock_360_nctr)} NCTR</div>
                </div>
              )}
              
              {portfolio?.lock_90_nctr && portfolio.lock_90_nctr > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-2 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-blue-700">90LOCK Active</span>
                    <span className="text-xs text-blue-600">Standard</span>
                  </div>
                  <div className="text-sm font-bold text-blue-800">{formatNCTR(portfolio.lock_90_nctr)} NCTR</div>
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

      {/* Quick Actions - Full */}
      <div className="space-y-2">
        <div data-lock-commitment>
          <LockCommitmentModal 
            availableNCTR={portfolio?.available_nctr || 0}
            onLockCreated={onLockCreated}
          />
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs border-primary/50 text-primary hover:bg-primary/10" onClick={() => navigate('/profile')}>
          <User className="w-3 h-3 mr-2" />
          Alliance Profile
        </Button>
      </div>

      {/* Wallet Connection - Full */}
      <div>
        <h3 className="text-xs font-medium mb-2">Wallet</h3>
        <SimpleWalletConnection />
      </div>
    </aside>
  );
};
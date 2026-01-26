import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, TrendingUp, ChevronRight, Sparkles, Crown, Zap } from 'lucide-react';
import { MemberStatusShowcase } from '@/components/MemberStatusShowcase';
import { LevelUpModal } from '@/components/LevelUpModal';
import nctrLogo from "@/assets/nctr-logo.png";
import { 
  CRESCENDO_TIER_THRESHOLDS, 
  getTierDisplay, 
  getNextTierInfo,
  getOrderedTierLevels 
} from '@/lib/crescendo-tiers';

interface MemberStatusBannerProps {
  currentStatus: string;
  current360NCTR: number;
  availableNCTR?: number;
  onUpgradeClick?: () => void;
  onEarnMoreClick?: () => void;
}

const statusColors = {
  starter: { bg: 'from-gray-100 to-gray-200', text: 'text-gray-700', icon: 'text-gray-600' },
  bronze: { bg: 'from-amber-100 to-orange-200', text: 'text-amber-800', icon: 'text-amber-600' },
  silver: { bg: 'from-slate-100 to-slate-200', text: 'text-slate-700', icon: 'text-slate-600' },
  gold: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-600' },
  platinum: { bg: 'from-blue-100 to-indigo-200', text: 'text-blue-800', icon: 'text-blue-600' },
  diamond: { bg: 'from-purple-100 to-pink-200', text: 'text-purple-800', icon: 'text-purple-600' }
};

const getNextStatusInfo = (currentStatus: string): { status: string; required: number } => {
  const nextTier = getNextTierInfo(currentStatus);
  if (nextTier) return nextTier;
  return { status: 'diamond', required: CRESCENDO_TIER_THRESHOLDS.diamond };
};

const getMultiplier = (status: string): string => {
  const multipliers: { [key: string]: string } = {
    starter: '1.0x',
    bronze: '1.10x',
    silver: '1.25x',
    gold: '1.40x',
    platinum: '1.50x',
    diamond: '2.0x'
  };
  return multipliers[status] || '1.0x';
};

const formatNCTR = (amount: number): string => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const MemberStatusBanner: React.FC<MemberStatusBannerProps> = ({
  currentStatus,
  current360NCTR,
  availableNCTR = 0,
  onUpgradeClick,
  onEarnMoreClick
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const colors = statusColors[currentStatus as keyof typeof statusColors] || statusColors.starter;
  const multiplier = getMultiplier(currentStatus);
  const nextStatus = getNextStatusInfo(currentStatus);
  const isDiamondStatus = currentStatus === 'diamond';

  return (
    <>
      {/* Compact Banner */}
      <Card className={`bg-gradient-to-r ${colors.bg} border-2 shadow-soft mb-6`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Status Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-full bg-white/50`}>
                  <Trophy className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className={`font-bold text-sm ${colors.text}`}>
                      {getTierDisplay(currentStatus)} Status
                    </h3>
                    <Badge variant="secondary" className={`text-xs ${colors.text} bg-white/30`}>
                      {multiplier} Earnings
                    </Badge>
                  </div>
                  <p className={`text-xs ${colors.text}/70`}>
                    {formatNCTR(current360NCTR)} NCTR in 360LOCK
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="flex items-center space-x-1 mb-1">
                  <Sparkles className={`w-4 h-4 ${colors.icon}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    Crescendo - Maximize Opportunities
                  </span>
                </div>
                <p className={`text-xs ${colors.text}/70`}>
                  More 360LOCK = Higher status & earnings
                </p>
              </div>
              
              <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={`${colors.text} border-current hover:bg-white/20`}
                  >
                    <span className="hidden sm:inline">View Tiers</span>
                    <span className="sm:hidden">Tiers</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2 text-xl">
                      <Crown className="w-6 h-6 text-primary" />
                      <span>NCTR Alliance Crescendo Program</span>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="mt-4">
                    <MemberStatusShowcase 
                      currentStatus={currentStatus}
                      current360NCTR={current360NCTR}
                      onUpgradeClick={() => {
                        setShowDetails(false);
                        onUpgradeClick?.();
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Buy NCTR or Upgrade Action - Desktop Only */}
              <div className="hidden sm:flex">
                {!isDiamondStatus ? (
                  <LevelUpModal
                    currentStatus={currentStatus}
                    current360NCTR={current360NCTR}
                    availableNCTR={availableNCTR}
                    nextStatusInfo={{
                      status: nextStatus.status,
                      required: nextStatus.required,
                      multiplier: getMultiplier(nextStatus.status)
                    }}
                    onEarnMoreClick={() => {
                      // Scroll to earning opportunities section
                      const opportunitiesSection = document.querySelector('[data-earning-opportunities]');
                      if (opportunitiesSection) {
                        opportunitiesSection.scrollIntoView({ behavior: 'smooth' });
                      }
                      onEarnMoreClick?.();
                    }}
                    onLockCommitmentClick={onUpgradeClick}
                  >
                    <Button 
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Level Up
                    </Button>
                  </LevelUpModal>
                ) : (
                  <Button 
                    size="sm"
                    className="bg-primary/50 text-primary-foreground cursor-default"
                    disabled
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Max Level Achieved
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Status Info */}
          <div className="sm:hidden mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center space-x-1">
                <Sparkles className={`w-3 h-3 ${colors.icon}`} />
                <span className={colors.text}>Crescendo - Maximize Opportunities</span>
              </div>
              <span className={`${colors.text}/70`}>More 360LOCK = Higher earnings</span>
            </div>
            
            {/* Mobile Level Up Button */}
            {!isDiamondStatus ? (
              <LevelUpModal
                currentStatus={currentStatus}
                current360NCTR={current360NCTR}
                availableNCTR={availableNCTR}
                nextStatusInfo={{
                  status: nextStatus.status,
                  required: nextStatus.required,
                  multiplier: getMultiplier(nextStatus.status)
                }}
                onEarnMoreClick={onEarnMoreClick}
                onLockCommitmentClick={onUpgradeClick}
              >
                <Button 
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Level Up to {nextStatus.status?.toUpperCase()}
                </Button>
              </LevelUpModal>
            ) : (
              <Button 
                size="sm"
                className="w-full bg-primary/50 text-primary-foreground cursor-default"
                disabled
              >
                <Crown className="w-4 h-4 mr-2" />
                Max Level Achieved
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Crown, Award, Star, Gem, Diamond } from 'lucide-react';
import nctrLogo from "@/assets/nctr-logo-grey-transparent.png";

interface StatusLevel {
  status_name: string;
  min_locked_nctr: number;
  reward_multiplier: number;
  description: string;
  benefits: string[];
}

interface WingsStatusBarProps {
  currentStatus: string;
  current360NCTR: number;
  statusLevels: StatusLevel[];
}

const formatNCTR = (amount: number): string => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
  if (amount >= 10000) return (amount / 1000).toFixed(2) + 'K';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'starter': return TrendingUp;
    case 'bronze': return Award;
    case 'silver': return Star;
    case 'gold': return Crown;
    case 'platinum': return Gem;
    case 'diamond': return Diamond;
    default: return TrendingUp;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'starter': return 'from-green-400 to-green-600';
    case 'bronze': return 'from-amber-600 to-amber-800';
    case 'silver': return 'from-gray-400 to-gray-600';
    case 'gold': return 'from-yellow-400 to-yellow-600';
    case 'platinum': return 'from-slate-300 to-slate-400';
    case 'diamond': return 'from-blue-400 to-blue-600';
    default: return 'from-green-400 to-green-600';
  }
};

const getStatusGlow = (status: string) => {
  switch (status) {
    case 'starter': return 'shadow-green-500/20';
    case 'bronze': return 'shadow-amber-500/20';
    case 'silver': return 'shadow-gray-500/20';
    case 'gold': return 'shadow-yellow-500/20';
    case 'platinum': return 'shadow-slate-400/20';
    case 'diamond': return 'shadow-blue-500/20';
    default: return 'shadow-green-500/20';
  }
};

export const WingsStatusBar: React.FC<WingsStatusBarProps> = ({
  currentStatus,
  current360NCTR,
  statusLevels
}) => {
  // Find current and next status levels
  const sortedLevels = statusLevels
    .filter(level => level.status_name !== 'starter')
    .sort((a, b) => a.min_locked_nctr - b.min_locked_nctr);
  
  const currentLevel = sortedLevels.find(level => level.status_name === currentStatus);
  const currentIndex = sortedLevels.findIndex(level => level.status_name === currentStatus);
  const nextLevel = currentIndex < sortedLevels.length - 1 ? sortedLevels[currentIndex + 1] : null;
  
  if (!currentLevel) return null;

  // Calculate progress
  const currentRequired = currentLevel.min_locked_nctr;
  const nextRequired = nextLevel?.min_locked_nctr || currentLevel.min_locked_nctr;
  const progressRange = nextRequired - currentRequired;
  const currentProgress = current360NCTR - currentRequired;
  const progressPercentage = nextLevel 
    ? Math.min((currentProgress / progressRange) * 100, 100)
    : 100;
  
  const remaining = nextLevel ? Math.max(nextRequired - current360NCTR, 0) : 0;

  const StatusIcon = getStatusIcon(currentStatus);
  const statusColor = getStatusColor(currentStatus);
  const statusGlow = getStatusGlow(currentStatus);

  return (
    <Card className={`bg-gradient-to-r ${statusColor} shadow-lg ${statusGlow} border-0 overflow-hidden`}>
      <CardContent className="p-4 relative">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px] opacity-20" />
        
        {/* Mobile Layout */}
        <div className="relative z-10 space-y-3 sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StatusIcon className="w-5 h-5 text-white" />
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 font-bold uppercase tracking-wide text-xs">
                {currentStatus} Wings
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-white/80 text-xs">Multiplier:</span>
              <span className="text-white font-bold text-sm">{currentLevel.reward_multiplier}x</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src={nctrLogo} 
                alt="NCTR" 
                className="h-6 w-auto opacity-80"
              />
              <div>
                <div className="text-white font-bold text-base">
                  {formatNCTR(current360NCTR)}
                </div>
                <div className="text-white/70 text-xs">360LOCK Balance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="relative z-10 hidden sm:flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <StatusIcon className="w-6 h-6 text-white" />
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 font-bold uppercase tracking-wide">
                {currentStatus} Wings
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-white/80 text-sm">Multiplier:</span>
              <span className="text-white font-bold">{currentLevel.reward_multiplier}x</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <img 
              src={nctrLogo} 
              alt="NCTR" 
              className="h-8 w-auto opacity-80"
            />
            <div className="text-right">
              <div className="text-white font-bold text-lg">
                {formatNCTR(current360NCTR)}
              </div>
              <div className="text-white/70 text-xs">360LOCK Balance</div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80">Progress to {nextLevel ? `${nextLevel.status_name.toUpperCase()} Wings` : 'MAX LEVEL'}</span>
            <span className="text-white font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          
          <div className="relative">
            <Progress 
              value={progressPercentage} 
              className="h-3 bg-white/20 border border-white/30"
            />
            {/* Glow effect on progress bar */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-white to-white/80 rounded-full transition-all duration-500 shadow-lg shadow-white/50"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {nextLevel && (
            <div className="space-y-1">
              {/* Mobile Progress Info */}
              <div className="sm:hidden space-y-1 text-xs text-white/70">
                <div className="flex justify-between">
                  <span>Current:</span>
                  <span className="text-white">{formatNCTR(current360NCTR)} NCTR</span>
                </div>
                <div className="flex justify-between">
                  <span>Need:</span>
                  <span className="text-white font-medium">{formatNCTR(remaining)} more</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Level:</span>
                  <span className="text-white">{formatNCTR(nextRequired)} total</span>
                </div>
              </div>
              
              {/* Desktop Progress Info */}
              <div className="hidden sm:flex items-center justify-between text-xs text-white/70">
                <span>Current: {formatNCTR(current360NCTR)} NCTR</span>
                <span className="flex items-center space-x-1">
                  <span>Need:</span>
                  <span className="text-white font-medium">{formatNCTR(remaining)} more</span>
                  <span>({formatNCTR(nextRequired)} total)</span>
                </span>
              </div>
            </div>
          )}
          
          {!nextLevel && (
            <div className="text-center text-white/80 text-xs">
              🏆 Maximum Alliance Status Achieved! 
            </div>
          )}
        </div>

        {/* Benefits Preview */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="text-white/80 text-xs">
            <div className="font-medium mb-1">Active Benefits:</div>
            {/* Mobile Benefits - Stack vertically */}
            <div className="sm:hidden space-y-1">
              {currentLevel.benefits?.slice(0, 3).map((benefit, index) => (
                <div key={index} className="text-white/70">• {benefit}</div>
              ))}
              {currentLevel.benefits && currentLevel.benefits.length > 3 && (
                <div className="text-white/60">• +{currentLevel.benefits.length - 3} more benefits</div>
              )}
            </div>
            
            {/* Desktop Benefits - Inline */}
            <div className="hidden sm:block">
              <span className="ml-2">{currentLevel.benefits?.slice(0, 2).join(', ')}</span>
              {currentLevel.benefits && currentLevel.benefits.length > 2 && (
                <span className="text-white/60"> +{currentLevel.benefits.length - 2} more</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
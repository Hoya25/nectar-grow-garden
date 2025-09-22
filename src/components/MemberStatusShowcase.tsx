import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Star, Crown, Diamond, Award, Zap, TrendingUp, Gift } from 'lucide-react';
import { BuyNCTRButton, BuyNCTRUpgrade } from '@/components/BuyNCTRButton';
import { LevelUpModal } from '@/components/LevelUpModal';
import nctrLogo from "@/assets/nctr-logo.png";

interface StatusLevel {
  status_name: string;
  description: string;
  min_locked_nctr: number;
  reward_multiplier: number;
  benefits: string[];
}

interface MemberStatusShowcaseProps {
  currentStatus: string;
  current360NCTR: number;
  onUpgradeClick?: () => void;
  onEarnMoreClick?: () => void;
}

const statusIcons = {
  starter: Star,
  bronze: Award,
  silver: Trophy,
  gold: Crown,
  platinum: Diamond,
  diamond: Zap
};

const statusColors = {
  starter: {
    bg: 'from-gray-100 to-gray-200',
    border: 'border-gray-300',
    text: 'text-gray-700',
    icon: 'text-gray-600'
  },
  bronze: {
    bg: 'from-amber-100 to-orange-200',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: 'text-amber-600'
  },
  silver: {
    bg: 'from-slate-100 to-slate-200',
    border: 'border-slate-300',
    text: 'text-slate-700',
    icon: 'text-slate-600'
  },
  gold: {
    bg: 'from-yellow-100 to-yellow-200',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    icon: 'text-yellow-600'
  },
  platinum: {
    bg: 'from-blue-100 to-indigo-200',
    border: 'border-blue-400',
    text: 'text-blue-800',
    icon: 'text-blue-600'
  },
  diamond: {
    bg: 'from-purple-100 to-pink-200',
    border: 'border-purple-400',
    text: 'text-purple-800',
    icon: 'text-purple-600'
  }
};

export const MemberStatusShowcase: React.FC<MemberStatusShowcaseProps> = ({
  currentStatus,
  current360NCTR,
  onUpgradeClick,
  onEarnMoreClick
}) => {
  const [statusLevels, setStatusLevels] = useState<StatusLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatusLevels();
  }, []);

  const fetchStatusLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunity_status_levels')
        .select('*')
        .order('min_locked_nctr');

      if (error) throw error;
      setStatusLevels(data || []);
    } catch (error) {
      console.error('Error fetching status levels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const currentStatusData = statusLevels.find(level => level.status_name === currentStatus);
  const nextStatusData = statusLevels.find(level => 
    level.min_locked_nctr > current360NCTR && level.status_name !== currentStatus
  );

  const getCurrentStatusIndex = () => {
    return statusLevels.findIndex(level => level.status_name === currentStatus);
  };

  const getProgressToNext = () => {
    if (!nextStatusData) return 100;
    const currentMin = currentStatusData?.min_locked_nctr || 0;
    const nextMin = nextStatusData.min_locked_nctr;
    const progress = ((current360NCTR - currentMin) / (nextMin - currentMin)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const formatNCTR = (amount: number): string => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toLocaleString();
  };

  const StatusIcon = statusIcons[currentStatus as keyof typeof statusIcons] || Star;
  const currentColors = statusColors[currentStatus as keyof typeof statusColors] || statusColors.starter;

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card className={`bg-gradient-to-br ${currentColors.bg} ${currentColors.border} border-2 shadow-large`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full bg-white/50 ${currentColors.icon}`}>
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${currentColors.text}`}>
                  {currentStatus?.toUpperCase()} MEMBER
                </h3>
                <p className={`text-sm ${currentColors.text}/70`}>
                  {currentStatusData?.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-2xl font-bold ${currentColors.text}`}>
                  {formatNCTR(current360NCTR)}
                </span>
                <img src={nctrLogo} alt="NCTR" className="h-12 w-auto" />
              </div>
              <p className={`text-xs ${currentColors.text}/70`}>360LOCK Balance</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className={`w-5 h-5 ${currentColors.icon}`} />
                <span className={`font-semibold ${currentColors.text}`}>Earning Multiplier</span>
              </div>
              <div className={`text-3xl font-bold ${currentColors.text}`}>
                {currentStatusData?.reward_multiplier}x
              </div>
              <p className={`text-sm ${currentColors.text}/70`}>
                {((currentStatusData?.reward_multiplier || 1) - 1) * 100}% bonus rewards
              </p>
            </div>
            
            <div className="bg-white/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Gift className={`w-5 h-5 ${currentColors.icon}`} />
                <span className={`font-semibold ${currentColors.text}`}>Member Benefits</span>
              </div>
              <div className="space-y-1">
                {currentStatusData?.benefits?.slice(0, 3).map((benefit, index) => (
                  <p key={index} className={`text-sm ${currentColors.text}/80`}>
                    • {benefit}
                  </p>
                ))}
                {(currentStatusData?.benefits?.length || 0) > 3 && (
                  <p className={`text-xs ${currentColors.text}/60`}>
                    +{(currentStatusData?.benefits?.length || 0) - 3} more benefits
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Status Progress */}
      {nextStatusData && (
        <Card className="bg-white shadow-soft border border-section-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-lg">Next: {nextStatusData.status_name?.toUpperCase()} Member</span>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {nextStatusData.reward_multiplier}x Multiplier
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to {nextStatusData.status_name?.toUpperCase()}</span>
                <span className="font-semibold">
                  {formatNCTR(current360NCTR)} / {formatNCTR(nextStatusData.min_locked_nctr)} NCTR
                </span>
              </div>
              <Progress value={getProgressToNext()} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatNCTR(Math.max(0, nextStatusData.min_locked_nctr - current360NCTR))} NCTR needed for upgrade
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
              <h4 className="font-semibold text-primary mb-2">Unlock with {nextStatusData.status_name?.toUpperCase()}:</h4>
              <div className="grid md:grid-cols-2 gap-2 text-sm mb-3">
                {nextStatusData.benefits?.slice(0, 4).map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center">
                <LevelUpModal
                  currentStatus={currentStatus}
                  current360NCTR={current360NCTR}
                  availableNCTR={0} // This will be passed from parent if needed
                  nextStatusInfo={{
                    status: nextStatusData.status_name,
                    required: nextStatusData.min_locked_nctr,
                    multiplier: `${nextStatusData.reward_multiplier}x`
                  }}
                  onEarnMoreClick={onEarnMoreClick}
                  onLockCommitmentClick={onUpgradeClick}
                >
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Level Up to {nextStatusData.status_name?.toUpperCase()}
                  </Button>
                </LevelUpModal>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Status Levels Overview */}
      <Card className="bg-white shadow-soft border border-section-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span>NCTR Alliance Wings Tiers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {statusLevels.map((level, index) => {
              const isUnlocked = current360NCTR >= level.min_locked_nctr;
              const isCurrent = level.status_name === currentStatus;
              const StatusLevelIcon = statusIcons[level.status_name as keyof typeof statusIcons] || Star;
              const levelColors = statusColors[level.status_name as keyof typeof statusColors] || statusColors.starter;
              
              return (
                <div 
                  key={level.status_name}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    isCurrent 
                      ? `bg-gradient-to-r ${levelColors.bg} ${levelColors.border} border-2` 
                      : isUnlocked 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      isCurrent ? 'bg-white/50' : isUnlocked ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <StatusLevelIcon className={`w-5 h-5 ${
                        isCurrent ? levelColors.icon : isUnlocked ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-semibold ${
                          isCurrent ? levelColors.text : isUnlocked ? 'text-green-800' : 'text-gray-600'
                        }`}>
                          {level.status_name?.toUpperCase()}
                        </h4>
                        {isCurrent && (
                          <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs">
                            CURRENT
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${
                        isCurrent ? levelColors.text + '/70' : isUnlocked ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {formatNCTR(level.min_locked_nctr)} NCTR • {level.reward_multiplier}x Multiplier
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      isCurrent ? levelColors.text : isUnlocked ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {level.reward_multiplier}x
                    </div>
                    <p className={`text-xs ${
                      isCurrent ? levelColors.text + '/60' : isUnlocked ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      Earnings
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
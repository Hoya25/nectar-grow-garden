import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  ShoppingCart, 
  Trophy, 
  Target, 
  Clock, 
  Gift,
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';
import { BuyNCTRButton } from '@/components/BuyNCTRButton';

interface LevelUpModalProps {
  currentStatus: string;
  current360NCTR: number;
  availableNCTR: number;
  nextStatusInfo: {
    status: string;
    required: number;
    multiplier: string;
  };
  onEarnMoreClick?: () => void;
  onLockCommitmentClick?: () => void;
  children: React.ReactNode;
}

const statusColors = {
  bronze: { bg: 'from-amber-100 to-orange-200', text: 'text-amber-800', icon: 'text-amber-600' },
  silver: { bg: 'from-slate-100 to-slate-200', text: 'text-slate-700', icon: 'text-slate-600' },
  gold: { bg: 'from-yellow-100 to-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-600' },
  platinum: { bg: 'from-blue-100 to-indigo-200', text: 'text-blue-800', icon: 'text-blue-600' },
  diamond: { bg: 'from-purple-100 to-pink-200', text: 'text-purple-800', icon: 'text-purple-600' }
};

const formatNCTR = (amount: number): string => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return amount.toLocaleString();
};

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  currentStatus,
  current360NCTR,
  availableNCTR,
  nextStatusInfo,
  onEarnMoreClick,
  onLockCommitmentClick,
  children
}) => {
  const [open, setOpen] = useState(false);
  
  const neededNCTR = Math.max(0, nextStatusInfo.required - current360NCTR);
  const canUpgradeWithAvailable = availableNCTR >= neededNCTR;
  const shortfall = Math.max(0, neededNCTR - availableNCTR);
  
  const nextColors = statusColors[nextStatusInfo.status as keyof typeof statusColors];
  
  // Get current status multiplier
  const getCurrentMultiplier = (status: string) => {
    switch (status) {
      case 'starter': return { multiplier: '1.0', boost: 0 };
      case 'bronze': return { multiplier: '1.1', boost: 10 };
      case 'silver': return { multiplier: '1.25', boost: 25 };
      case 'gold': return { multiplier: '1.4', boost: 40 };
      case 'platinum': return { multiplier: '1.5', boost: 50 };
      case 'diamond': return { multiplier: '2.0', boost: 100 };
      default: return { multiplier: '1.0', boost: 0 };
    }
  };
  
  const currentMultiplier = getCurrentMultiplier(currentStatus);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Trophy className="w-6 h-6 text-primary" />
            <span>Level Up Your Alliance Status</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current vs Next Status */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Current Status */}
            <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-700">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center">
                  <h3 className="font-bold text-lg text-gray-700 mb-1">
                    {currentStatus?.toUpperCase()}
                  </h3>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-sm text-gray-600">{formatNCTR(current360NCTR)}</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">360</span>
                      <Lock className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-gray-100 text-gray-600">
                    {currentMultiplier.multiplier}x Earning Amplification - {currentMultiplier.boost}% Boost
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Next Status */}
            <Card className={`bg-gradient-to-br ${nextColors?.bg} border-2 border-primary shadow-glow`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm ${nextColors?.text}`}>Next Level</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center">
                  <h3 className={`font-bold text-lg ${nextColors?.text} mb-1`}>
                    {nextStatusInfo.status?.toUpperCase()}
                  </h3>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className={`text-sm ${nextColors?.text}`}>
                      {formatNCTR(nextStatusInfo.required)}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">360</span>
                      <Lock className={`w-3 h-3 ${nextColors?.icon}`} />
                    </div>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">
                    {nextStatusInfo.multiplier}x Earning Amplification - {((parseFloat(nextStatusInfo.multiplier) - 1) * 100).toFixed(0)}% Boost
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Indicator */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress to {nextStatusInfo.status?.toUpperCase()}</span>
                <span className="text-sm font-semibold">
                  {formatNCTR(current360NCTR)} / {formatNCTR(nextStatusInfo.required)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((current360NCTR / nextStatusInfo.required) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-center space-x-2 text-primary">
                <Target className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {formatNCTR(neededNCTR)} more NCTR needed in 360LOCK
                </span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Easy Buy Buttons for All Status Levels */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span>Quick Status Upgrades</span>
            </h3>
            
            <div className="grid gap-3">
              {/* Bronze Level */}
              {current360NCTR < 1000 && (
                <Card className="border border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-amber-800">BRONZE ALLIANCE</h4>
                          <p className="text-sm text-amber-700">1.1x Earning Amplification • 10% Boost • 1,000 NCTR in 360LOCK</p>
                        </div>
                      </div>
                      <BuyNCTRButton
                        suggestedAmount={1000 - current360NCTR}
                        className="bg-amber-600 hover:bg-amber-700 text-white border-0"
                      >
                        Buy {formatNCTR(1000 - current360NCTR)} NCTR
                      </BuyNCTRButton>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Silver Level */}
              {current360NCTR < 2500 && (
                <Card className="border border-slate-200 bg-gradient-to-r from-slate-50/50 to-slate-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-700">SILVER ALLIANCE</h4>
                          <p className="text-sm text-slate-600">1.25x Earning Amplification • 25% Boost • 2,500 NCTR in 360LOCK</p>
                        </div>
                      </div>
                      <BuyNCTRButton
                        suggestedAmount={2500 - current360NCTR}
                        className="bg-slate-500 hover:bg-slate-600 text-white border-0"
                      >
                        Buy {formatNCTR(2500 - current360NCTR)} NCTR
                      </BuyNCTRButton>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gold Level */}
              {current360NCTR < 5000 && (
                <Card className="border border-yellow-200 bg-gradient-to-r from-yellow-50/50 to-yellow-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-yellow-800">GOLD ALLIANCE</h4>
                          <p className="text-sm text-yellow-700">1.4x Earning Amplification • 40% Boost • 5,000 NCTR in 360LOCK</p>
                        </div>
                      </div>
                      <BuyNCTRButton
                        suggestedAmount={5000 - current360NCTR}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                      >
                        Buy {formatNCTR(5000 - current360NCTR)} NCTR
                      </BuyNCTRButton>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Platinum Level */}
              {current360NCTR < 10000 && (
                <Card className="border border-purple-200 bg-gradient-to-r from-purple-50/50 to-purple-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-purple-800">PLATINUM ALLIANCE</h4>
                          <p className="text-sm text-purple-700">1.5x Earning Amplification • 50% Boost • 10,000 NCTR in 360LOCK</p>
                        </div>
                      </div>
                      <BuyNCTRButton
                        suggestedAmount={10000 - current360NCTR}
                        className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                      >
                        Buy {formatNCTR(10000 - current360NCTR)} NCTR
                      </BuyNCTRButton>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Diamond Level */}
              {current360NCTR < 25000 && (
                <Card className="border border-blue-200 bg-gradient-to-r from-blue-50/50 to-blue-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-800">DIAMOND ALLIANCE</h4>
                          <p className="text-sm text-blue-700">2.0x Earning Amplification • 100% Boost • 25,000 NCTR in 360LOCK</p>
                        </div>
                      </div>
                      <BuyNCTRButton
                        suggestedAmount={25000 - current360NCTR}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                      >
                        Buy {formatNCTR(25000 - current360NCTR)} NCTR
                      </BuyNCTRButton>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Separator />

          {/* Alternative Options */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Alternative Options</span>
            </h3>
            
            <div className="grid gap-4">
              {/* Option 1: Earn More NCTR */}
              <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-blue-700">
                    <Clock className="w-5 h-5" />
                    <span>Earn More NCTR</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Free
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete earning opportunities with Alliance partners to accumulate NCTR, then commit to 360LOCK.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium text-blue-700">What you'll do:</p>
                      <p className="text-muted-foreground">• Shop with partners • Complete activities • Lock earned NCTR</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setOpen(false);
                        onEarnMoreClick?.();
                      }}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      View Opportunities
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Option 2: Lock Available NCTR */}
              {availableNCTR > 0 && (
                <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-green-700">
                      <Lock className="w-5 h-5" />
                      <span>Lock Available NCTR</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {formatNCTR(availableNCTR)} Available
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Commit your available {formatNCTR(availableNCTR)} NCTR to 360LOCK to improve your Alliance status.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-medium text-green-700">Available Balance:</p>
                        <p className="text-muted-foreground">{formatNCTR(availableNCTR)} NCTR ready to lock</p>
                      </div>
                      <Button 
                        onClick={() => {
                          setOpen(false);
                          onLockCommitmentClick?.();
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        Lock {formatNCTR(availableNCTR)} NCTR
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
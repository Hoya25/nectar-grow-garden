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
                    1.0x - {((1.0 - 1) * 100)}% bonus
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
                    {nextStatusInfo.multiplier} - {((parseFloat(nextStatusInfo.multiplier) - 1) * 100).toFixed(0)}% bonus
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

          {/* Level Up Options */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Choose Your Path to Level Up</span>
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

              {/* Option 2: Purchase & Lock */}
              <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-primary">
                    <ShoppingCart className="w-5 h-5" />
                    <span>Purchase & Lock NCTR</span>
                    <Badge className="bg-primary text-primary-foreground">
                      Instant
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Buy NCTR directly and lock it in 360LOCK to immediately upgrade your Alliance status.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium text-primary">Total needed:</p>
                      <p className="text-muted-foreground">
                        {formatNCTR(neededNCTR)} NCTR → 360LOCK
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {canUpgradeWithAvailable ? (
                        <Button 
                          onClick={() => {
                            setOpen(false);
                            onLockCommitmentClick?.();
                          }}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          Lock Available NCTR
                        </Button>
                      ) : (
                        <BuyNCTRButton
                          suggestedAmount={shortfall}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy {formatNCTR(shortfall)} NCTR
                        </BuyNCTRButton>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Option 3: Mixed Approach (if user has some available) */}
              {availableNCTR > 0 && availableNCTR < neededNCTR && (
                <Card className="border-2 border-secondary/30 hover:border-secondary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-secondary-foreground">
                      <Gift className="w-5 h-5" />
                      <span>Mixed Approach</span>
                      <Badge variant="outline" className="bg-secondary/10">
                        Smart
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use your available {formatNCTR(availableNCTR)} NCTR and purchase the remaining {formatNCTR(shortfall)} NCTR.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-medium">Available: {formatNCTR(availableNCTR)} NCTR</p>
                        <p className="text-muted-foreground">Need: {formatNCTR(shortfall)} more</p>
                      </div>
                      <BuyNCTRButton
                        suggestedAmount={shortfall}
                        variant="outline"
                        className="border-secondary text-secondary hover:bg-secondary/10"
                      >
                        Buy {formatNCTR(shortfall)} More
                      </BuyNCTRButton>
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
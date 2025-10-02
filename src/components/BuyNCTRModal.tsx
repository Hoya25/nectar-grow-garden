import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Lock, TrendingUp, Zap, ArrowRight, Check, ExternalLink } from 'lucide-react';

interface BuyNCTRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedAmount?: number;
  currentStatus?: string;
  current360Lock?: number;
  onPurchaseComplete?: () => void;
}

interface StatusLevel {
  status_name: string;
  min_locked_nctr: number;
  reward_multiplier: number;
  benefits: string[];
}

export const BuyNCTRModal: React.FC<BuyNCTRModalProps> = ({
  open,
  onOpenChange,
  suggestedAmount = 2500,
  currentStatus = 'starter',
  current360Lock = 0,
  onPurchaseComplete
}) => {
  const { currentPrice, formatPrice, formatUSD } = useNCTRPrice();
  const [nctrAmount, setNctrAmount] = useState(suggestedAmount.toString());
  const [usdAmount, setUsdAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLevels, setStatusLevels] = useState<StatusLevel[]>([]);
  const [nextStatus, setNextStatus] = useState<StatusLevel | null>(null);

  useEffect(() => {
    fetchStatusLevels();
  }, []);

  useEffect(() => {
    if (currentPrice && nctrAmount) {
      const usd = (parseFloat(nctrAmount) * currentPrice).toFixed(2);
      setUsdAmount(usd);
    }
  }, [nctrAmount, currentPrice]);

  useEffect(() => {
    if (statusLevels.length > 0 && nctrAmount) {
      const newTotal = current360Lock + parseFloat(nctrAmount || '0');
      const next = statusLevels.find(level => level.min_locked_nctr > current360Lock && level.min_locked_nctr <= newTotal);
      setNextStatus(next || null);
    }
  }, [nctrAmount, statusLevels, current360Lock]);

  const fetchStatusLevels = async () => {
    const { data, error } = await supabase
      .from('opportunity_status_levels')
      .select('*')
      .order('min_locked_nctr', { ascending: true });

    if (!error && data) {
      setStatusLevels(data);
    }
  };

  const handleNCTRChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setNctrAmount(value);
    if (currentPrice) {
      setUsdAmount((numValue * currentPrice).toFixed(2));
    }
  };

  const handleUSDChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setUsdAmount(value);
    if (currentPrice && currentPrice > 0) {
      setNctrAmount((numValue / currentPrice).toFixed(0));
    }
  };

  const handleQuickAmount = (amount: number) => {
    setNctrAmount(amount.toString());
  };

  const handleBuyNow = () => {
    // Open external purchase page with pre-filled amount
    const url = new URL('https://token.nctr.live/');
    url.searchParams.set('amount', nctrAmount);
    url.searchParams.set('type', 'nctr');
    url.searchParams.set('source', 'garden');
    window.open(url.toString(), '_blank');
    
    toast({
      title: "Opening Purchase Page",
      description: "Complete your purchase on token.nctr.live. Your NCTR will be automatically locked in 360LOCK.",
    });
    
    onOpenChange(false);
  };

  const quickAmounts = [1000, 2500, 5000, 10000];
  const progressToNext = nextStatus 
    ? ((current360Lock / nextStatus.min_locked_nctr) * 100)
    : 100;
  const progressAfterPurchase = nextStatus
    ? (((current360Lock + parseFloat(nctrAmount || '0')) / nextStatus.min_locked_nctr) * 100)
    : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Buy NCTR → 360LOCK
          </DialogTitle>
          <DialogDescription>
            All purchases automatically lock in 360LOCK for maximum Wings status benefits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Amount Buttons */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Quick Select</Label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={nctrAmount === amount.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  className="text-xs"
                >
                  {amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nctr-amount">NCTR Amount</Label>
              <div className="relative mt-1">
                <Input
                  id="nctr-amount"
                  type="number"
                  value={nctrAmount}
                  onChange={(e) => handleNCTRChange(e.target.value)}
                  className="pr-16"
                  placeholder="2500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  NCTR
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="usd-amount">USD Amount</Label>
              <div className="relative mt-1">
                <Input
                  id="usd-amount"
                  type="number"
                  value={usdAmount}
                  onChange={(e) => handleUSDChange(e.target.value)}
                  className="pr-16"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  USD
                </span>
              </div>
            </div>
          </div>

          {/* Current Price */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current NCTR Price</span>
              <span className="font-semibold">{formatPrice(currentPrice)}</span>
            </div>
          </div>

          <Separator />

          {/* Purchase Summary */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              What You'll Get
            </h4>
            
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">NCTR Amount</span>
                <span className="font-bold text-lg">{parseFloat(nctrAmount || '0').toLocaleString()} NCTR</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Lock Duration</span>
                <Badge variant="secondary" className="bg-primary/10">
                  <Lock className="w-3 h-3 mr-1" />
                  360 Days
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Unlock Date</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Wings Status Impact */}
          {nextStatus && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Wings Status Impact
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current Status</span>
                    <Badge variant="outline">{currentStatus.toUpperCase()}</Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress to {nextStatus.status_name.toUpperCase()}</span>
                      <span className="font-medium">
                        {Math.min(100, progressAfterPurchase).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={Math.min(100, progressAfterPurchase)} className="h-2" />
                  </div>

                  {progressAfterPurchase >= 100 && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-primary">
                          You'll unlock {nextStatus.status_name.toUpperCase()} status!
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {nextStatus.reward_multiplier}x reward multiplier on all future earnings
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <Button
            onClick={handleBuyNow}
            disabled={!nctrAmount || parseFloat(nctrAmount) <= 0 || loading}
            className="w-full h-12 text-base"
            size="lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Buy {parseFloat(nctrAmount || '0').toLocaleString()} NCTR
            {usdAmount && ` for $${usdAmount}`}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure purchase through token.nctr.live • Automatically locks in 360LOCK
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

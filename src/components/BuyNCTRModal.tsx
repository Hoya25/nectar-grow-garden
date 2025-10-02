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
  const [wholesalePrice, setWholesalePrice] = useState<number>(0.04); // Default wholesale price

  useEffect(() => {
    fetchStatusLevels();
    fetchWholesalePrice();
  }, []);

  const fetchWholesalePrice = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'wholesale_nctr_price')
        .single();

      if (!error && data) {
        setWholesalePrice(parseFloat(String(data.setting_value)));
      }
    } catch (error) {
      console.error('Error fetching wholesale price:', error);
    }
  };

  useEffect(() => {
    if (wholesalePrice && nctrAmount) {
      const usd = (parseFloat(nctrAmount) * wholesalePrice).toFixed(2);
      setUsdAmount(usd);
    }
  }, [nctrAmount, wholesalePrice]);

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
    if (wholesalePrice) {
      setUsdAmount((numValue * wholesalePrice).toFixed(2));
    }
  };

  const handleUSDChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setUsdAmount(value);
    if (wholesalePrice && wholesalePrice > 0) {
      setNctrAmount((numValue / wholesalePrice).toFixed(0));
    }
  };

  const handleQuickAmount = (amount: number) => {
    setNctrAmount(amount.toString());
  };

  const handleBuyNow = async () => {
    console.log('🚀 Buy button clicked', { nctrAmount, usdAmount });
    setLoading(true);
    
    try {
      console.log('📞 Calling create-nctr-checkout edge function...');
      
      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke('create-nctr-checkout', {
        body: {
          nctrAmount: parseFloat(nctrAmount),
          usdAmount: parseFloat(usdAmount),
        },
      });

      console.log('📦 Edge function response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Opening Stripe checkout in new tab:', data.url);
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        // Reset loading state and close modal
        setLoading(false);
        onOpenChange(false);
        
        toast({
          title: "Checkout Opened",
          description: "Please complete your purchase in the new tab.",
        });
      } else {
        console.error('❌ No checkout URL in response:', data);
        throw new Error('No checkout URL returned from Stripe');
      }
    } catch (error) {
      console.error('💥 Purchase error:', error);
      toast({
        title: "Purchase Error",
        description: error instanceof Error ? error.message : "Failed to initiate purchase. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const quickAmounts = [1000, 2500, 5000, 10000, 100000];
  const progressToNext = nextStatus 
    ? ((current360Lock / nextStatus.min_locked_nctr) * 100)
    : 100;
  const progressAfterPurchase = nextStatus
    ? (((current360Lock + parseFloat(nctrAmount || '0')) / nextStatus.min_locked_nctr) * 100)
    : 100;

  const isButtonDisabled = !nctrAmount || parseFloat(nctrAmount) <= 0 || loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Level Up, Buy NCTR
          </DialogTitle>
          <DialogDescription>
            Purchase NCTR tokens that automatically lock in 360LOCK for maximum Wings status benefits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Amount Buttons */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Quick Select</Label>
            <div className="grid grid-cols-5 gap-2">
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

          {/* Current Wholesale Price */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wholesale NCTR Price (360LOCK)</span>
              <span className="font-semibold">${wholesalePrice.toFixed(4)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Market price: {formatPrice(currentPrice)} • You save {((currentPrice - wholesalePrice) / currentPrice * 100).toFixed(0)}%
            </p>
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
            disabled={isButtonDisabled}
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Level Up - Buy {parseFloat(nctrAmount || '0').toLocaleString()} NCTR
                {usdAmount && ` ($${parseFloat(usdAmount).toFixed(2)})`}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure checkout powered by Stripe • Automatically locks in 360LOCK
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

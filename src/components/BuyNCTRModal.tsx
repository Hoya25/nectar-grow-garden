import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Lock, TrendingUp, Zap, ArrowRight, Check, Wallet } from 'lucide-react';
import { ethers } from 'ethers';

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
  const { isConnected, address, connectWallet } = useWallet();
  const [nctrAmount, setNctrAmount] = useState(suggestedAmount.toString());
  const [usdAmount, setUsdAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLevels, setStatusLevels] = useState<StatusLevel[]>([]);
  const [nextStatus, setNextStatus] = useState<StatusLevel | null>(null);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0.04); // Default wholesale price
  const [treasuryAddress, setTreasuryAddress] = useState<string>('');
  const [isFetchingConfig, setIsFetchingConfig] = useState(true);

  useEffect(() => {
    const initializeModal = async () => {
      setIsFetchingConfig(true);
      await Promise.all([
        fetchStatusLevels(),
        fetchWholesalePrice(),
        fetchTreasuryAddress()
      ]);
      setIsFetchingConfig(false);
    };
    initializeModal();
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

  const fetchTreasuryAddress = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'treasury_wallet_address')
        .maybeSingle();

      console.log('🏦 Treasury address fetch result:', { data, error });

      if (!error && data) {
        // The setting_value is JSONB, so it's already the actual value
        const addressValue = typeof data.setting_value === 'string' 
          ? data.setting_value 
          : String(data.setting_value);
        
        console.log('🏦 Setting treasury address to:', addressValue);
        setTreasuryAddress(addressValue);
      } else if (!data) {
        console.warn('Treasury wallet address not configured in database');
      } else {
        console.error('Error fetching treasury address:', error);
      }
    } catch (error) {
      console.error('Error fetching treasury address:', error);
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
    // Allow empty string or valid numbers
    if (value === '' || !isNaN(parseFloat(value))) {
      setNctrAmount(value);
      const numValue = parseFloat(value) || 0;
      if (wholesalePrice) {
        setUsdAmount((numValue * wholesalePrice).toFixed(2));
      }
    }
  };

  const handleUSDChange = (value: string) => {
    // Allow empty string or valid numbers
    if (value === '' || !isNaN(parseFloat(value))) {
      setUsdAmount(value);
      const numValue = parseFloat(value) || 0;
      if (wholesalePrice && wholesalePrice > 0) {
        setNctrAmount((numValue / wholesalePrice).toFixed(0));
      }
    }
  };

  const handleQuickAmount = (amount: number) => {
    setNctrAmount(amount.toString());
  };

  const handleBuyNow = async () => {
    console.log('🚀 Buy button clicked', { nctrAmount, usdAmount, isConnected, address });
    
    // Check if wallet is connected
    if (!isConnected || !address) {
      console.log('❌ Wallet not connected, showing error');
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Coinbase Wallet using the button above, then try again.",
        variant: "destructive",
      });
      return;
    }

    if (!treasuryAddress) {
      toast({
        title: "Configuration Required",
        description: "Treasury wallet address not configured. Please contact an administrator to set this up in Admin → Settings.",
        variant: "destructive",
        duration: 8000,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      console.log('💳 Processing wallet payment...');
      
      // Get the provider from window.ethereum
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('No wallet provider found');
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      
      // Convert USD to Wei (assuming 1 USD = 1 ETH for simplicity, adjust as needed)
      const amountInEth = parseFloat(usdAmount);
      const amountInWei = ethers.parseEther(amountInEth.toString());

      console.log('📤 Sending transaction...', {
        to: treasuryAddress,
        value: amountInWei.toString(),
        from: address
      });

      // Send the transaction
      const tx = await signer.sendTransaction({
        to: treasuryAddress,
        value: amountInWei,
      });

      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      console.log('✅ Transaction confirmed:', receipt);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Record the transaction and create the lock
      const { data: transactionData, error: transactionError } = await supabase
        .from('nctr_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'purchase',
          nctr_amount: parseFloat(nctrAmount),
          usd_amount: parseFloat(usdAmount),
          transaction_hash: receipt?.hash || tx.hash,
          status: 'completed'
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create 360-day lock
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + 360);

      const { error: lockError } = await supabase
        .from('nctr_locks')
        .insert({
          user_id: user.id,
          nctr_amount: parseFloat(nctrAmount),
          lock_type: '360lock',
          unlock_date: unlockDate.toISOString(),
        });

      if (lockError) throw lockError;

      // Update user portfolio
      const { data: portfolio } = await supabase
        .from('nctr_portfolio')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const currentLock360 = portfolio?.lock_360_nctr || 0;

      await supabase
        .from('nctr_portfolio')
        .upsert({
          user_id: user.id,
          lock_360_nctr: currentLock360 + parseFloat(nctrAmount),
          last_updated: new Date().toISOString()
        });

      toast({
        title: "Purchase Successful!",
        description: `${parseFloat(nctrAmount).toLocaleString()} NCTR locked for 360 days`,
      });

      setLoading(false);
      onOpenChange(false);
      onPurchaseComplete?.();

    } catch (error: any) {
      console.error('💥 Purchase error:', error);
      toast({
        title: "Purchase Error",
        description: error?.message || "Failed to complete purchase. Please try again.",
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

  const MINIMUM_USD_AMOUNT = 25;
  const minimumNCTRAmount = wholesalePrice > 0 ? Math.ceil(MINIMUM_USD_AMOUNT / wholesalePrice) : 625;
  const isButtonDisabled = !nctrAmount || parseFloat(nctrAmount) <= 0 || loading || parseFloat(usdAmount) < MINIMUM_USD_AMOUNT || isFetchingConfig || !treasuryAddress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside if checkout is in progress
          if (loading) {
            e.preventDefault();
          }
        }}
      >
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={nctrAmount === amount.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  className="text-xs min-h-[44px] touch-manipulation"
                >
                  <span className="whitespace-nowrap">{amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nctr-amount" className="text-sm">NCTR Amount</Label>
              <div className="relative mt-1">
                <Input
                  id="nctr-amount"
                  type="number"
                  value={nctrAmount}
                  onChange={(e) => handleNCTRChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.target.select()}
                  className="pr-16 h-12 text-base"
                  placeholder="2500"
                  min="1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  NCTR
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="usd-amount" className="text-sm">USD Amount</Label>
              <div className="relative mt-1">
                <Input
                  id="usd-amount"
                  type="number"
                  value={usdAmount}
                  onChange={(e) => handleUSDChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.target.select()}
                  className="pr-16 h-12 text-base"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  USD
                </span>
              </div>
            </div>
          </div>

          {/* Minimum Purchase Warning - Moved here for visibility */}
          {parseFloat(usdAmount) < MINIMUM_USD_AMOUNT && parseFloat(usdAmount) > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 -mt-2">
              <p className="text-sm text-destructive font-medium">
                Minimum purchase: ${MINIMUM_USD_AMOUNT}.00 ({minimumNCTRAmount.toLocaleString()} NCTR)
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Current: ${parseFloat(usdAmount).toFixed(2)} ({parseFloat(nctrAmount || '0').toLocaleString()} NCTR)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(minimumNCTRAmount)}
                  className="h-7 text-xs"
                >
                  Set to minimum
                </Button>
              </div>
            </div>
          )}

          {/* Current Wholesale Price */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wholesale NCTR Price (360LOCK)</span>
              <span className="font-semibold">${wholesalePrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Market price: {formatPrice(currentPrice)} • You save {((currentPrice - wholesalePrice) / currentPrice * 100).toFixed(2)}%
            </p>
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Minimum purchase: ${MINIMUM_USD_AMOUNT}</span>
                <span className="font-medium text-primary">
                  = {minimumNCTRAmount.toLocaleString()} NCTR
                </span>
              </div>
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
                <span className="font-bold text-lg">{parseFloat(nctrAmount || '0').toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} NCTR</span>
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

          {/* Wallet Connection / Action Button */}
          {!isConnected ? (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                  Step 1: Connect Your Wallet
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  You need to connect your Coinbase Wallet to purchase NCTR. Click below to connect.
                </p>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await connectWallet();
                    toast({
                      title: "Wallet Connected",
                      description: "You can now proceed with your purchase",
                    });
                  } catch (error: any) {
                    console.error('Wallet connection error:', error);
                    toast({
                      title: "Connection Failed",
                      description: error?.message || "Failed to connect wallet. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                className="w-full min-h-[52px] sm:h-12 text-sm sm:text-base touch-manipulation"
                size="lg"
              >
                <Wallet className="w-4 h-4 mr-2 flex-shrink-0" />
                Connect Coinbase Wallet
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                <p className="text-xs text-green-700 dark:text-green-300">
                  ✅ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
              <Button
                onClick={handleBuyNow}
                disabled={isButtonDisabled}
                className="w-full min-h-[52px] sm:h-12 text-sm sm:text-base touch-manipulation"
                size="lg"
              >
                {isFetchingConfig ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" />
                    <span className="text-xs sm:text-sm">Loading Configuration...</span>
                  </>
                ) : loading ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" />
                    <span className="text-xs sm:text-sm">Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                      Pay ${parseFloat(usdAmount).toFixed(2)} ETH
                      <span className="hidden sm:inline">
                        {` for ${parseFloat(nctrAmount || '0').toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} NCTR`}
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
                  </>
                )}
              </Button>
            </>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Secure payment via Coinbase Wallet • Automatically locks in 360LOCK
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

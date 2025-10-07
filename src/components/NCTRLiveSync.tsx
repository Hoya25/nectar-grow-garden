import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  ExternalLink, 
  Wallet, 
  TrendingUp, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  ArrowUpRight
} from 'lucide-react';

interface NCTRLiveSyncProps {
  onSyncComplete?: () => void;
}

interface SyncStatus {
  last_sync_at: string | null;
  nctr_live_data: {
    available: number | null;
    locked_360: number | null;
    total: number | null;
  };
  is_synced: boolean;
}

interface SyncCredits {
  available: number;
  lock_360: number;
  total: number;
}

const NCTRLiveSync = ({ onSyncComplete }: NCTRLiveSyncProps) => {
  const { user } = useAuth();
  const { address: connectedWallet, connectWallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [manualWallet, setManualWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  useEffect(() => {
    if (user && isOpen) {
      checkSyncStatus();
    }
  }, [user, isOpen]);

  const checkSyncStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('nctr-live-sync', {
        body: {
          action: 'check_sync_status',
          user_id: user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setSyncStatus(data.sync_status);
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleSync = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to sync your NCTR Live profile.",
        variant: "destructive",
      });
      return;
    }

    const walletToUse = connectedWallet || manualWallet.trim();
    
    if (!walletToUse) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet or enter your wallet address manually.",
        variant: "destructive",
      });
      return;
    }
    
    // Get user email from profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .single();
    
    if (!profileData?.email) {
      toast({
        title: "Email Required",
        description: "Please complete your profile with an email address before syncing.",
        variant: "destructive",
      });
      return;
    }

    // Basic wallet address validation
    if (walletToUse.length < 20 || !walletToUse.startsWith('0x')) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please enter a valid Ethereum wallet address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('nctr-live-sync', {
        body: {
          action: 'sync_profile',
          user_id: user.id,
          wallet_address: walletToUse,
          user_email: profileData.email,
          // Note: Signature verification is currently handled client-side
          // In production, implement server-side verification
          signed_message: undefined,
          signature: undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        setLastSyncResult(data);
        
        const credits = data.sync_credits as SyncCredits;
        
        if (credits?.total > 0) {
          toast({
            title: "Sync Successful! 🎉",
            description: `Credited ${credits.total.toFixed(2)} NCTR to your Wings account (${credits.available.toFixed(2)} available + ${credits.lock_360.toFixed(2)} in 360LOCK)`,
          });
        } else {
          toast({
            title: "Sync Complete",
            description: data.message || "Your Wings account is already up to date with NCTR Live.",
          });
        }

        // Refresh sync status
        await checkSyncStatus();
        
        // Notify parent component
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with NCTR Live. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNCTR = (amount: number | null) => {
    if (amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(amount));
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync NCTR Live
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-500" />
            NCTR Live Integration
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Sync Status */}
          {syncStatus && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {syncStatus.is_synced ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Sync:</span>
                  <span className="text-sm font-medium">
                    {formatTimeAgo(syncStatus.last_sync_at)}
                  </span>
                </div>
                
                {syncStatus.is_synced && syncStatus.nctr_live_data && (
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Available</div>
                      <div className="font-semibold text-sm">
                        {formatNCTR(syncStatus.nctr_live_data.available)} NCTR
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">360LOCK</div>
                      <div className="font-semibold text-sm text-orange-500">
                        {formatNCTR(syncStatus.nctr_live_data.locked_360)} NCTR
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-semibold text-sm text-green-500">
                        {formatNCTR(syncStatus.nctr_live_data.total)} NCTR
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* How it Works */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How NCTR Live Sync Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Connect your wallet that holds NCTR tokens</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>We sync your token.nctr.live portfolio with Wings</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Available NCTR becomes available in Wings</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Locked NCTR becomes 360LOCK for enhanced status</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                <span>Your Wings alliance status updates automatically</span>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Connection */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Wallet Connection</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your wallet or enter your address manually to sync with NCTR Live
              </p>
            </div>

            {/* Connected Wallet Display */}
            {connectedWallet ? (
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Wallet Connected</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Connected
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={connectWallet}
                  className="w-full"
                  variant="outline"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="manual-wallet" className="text-sm">
                    Enter Wallet Address Manually
                  </Label>
                  <Input
                    id="manual-wallet"
                    placeholder="0x..."
                    value={manualWallet}
                    onChange={(e) => setManualWallet(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Last Sync Result */}
          {lastSyncResult && lastSyncResult.credits_applied && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  Last Sync Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Available NCTR</div>
                    <div className="font-semibold">
                      +{formatNCTR(lastSyncResult.credits_applied.available_nctr)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">360LOCK NCTR</div>
                    <div className="font-semibold text-orange-500">
                      +{formatNCTR(lastSyncResult.credits_applied.lock_360_nctr)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Credited:</span>
                    <span className="font-semibold text-green-600">
                      +{formatNCTR(lastSyncResult.credits_applied.total_credited)} NCTR
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSync}
              disabled={loading || (!connectedWallet && !manualWallet.trim())}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.open('https://token.nctr.live', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Visit NCTR Live
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NCTRLiveSync;
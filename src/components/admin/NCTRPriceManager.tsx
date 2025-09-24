import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, RefreshCw, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';

const NCTRPriceManager = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { 
    currentPrice, 
    priceChange24h, 
    lastUpdated, 
    loading, 
    error, 
    forceUpdatePrice, 
    formatPrice,
    formatChange,
    getChangeColor 
  } = useNCTRPrice();

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      await forceUpdatePrice();
      toast({
        title: "Price Updated",
        description: `NCTR price has been refreshed from on-chain sources`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update NCTR price",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const openBaseScan = () => {
    window.open('https://basescan.org/token/0x973104fAa7F2B11787557e85953ECA6B4e262328', '_blank');
  };

  const openDEXTools = () => {
    window.open('https://www.dextools.io/app/en/base/pair-explorer/0x3BB64B23b0A1A5E510F67B0Cc1ab0C2F6dC84dD8', '_blank');
  };

  if (loading && !currentPrice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            NCTR Price Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            NCTR Price Management
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Update
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current Price Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Price</p>
                  <p className="text-2xl font-bold">${formatPrice(currentPrice)}</p>
                </div>
                <Coins className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">24h Change</p>
                  <p className={`text-2xl font-bold ${getChangeColor(priceChange24h)}`}>
                    {formatChange(priceChange24h)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-lg font-semibold">{formatLastUpdated(lastUpdated)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(lastUpdated).toLocaleTimeString()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contract Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contract Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">NCTR Token Contract</p>
                <Badge variant="outline">Base Network</Badge>
              </div>
              <p className="font-mono text-sm text-muted-foreground break-all">
                0x973104fAa7F2B11787557e85953ECA6B4e262328
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={openBaseScan}
                className="mt-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View on BaseScan
              </Button>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">DEX Pool Contract</p>
                <Badge variant="outline">Uniswap V3</Badge>
              </div>
              <p className="font-mono text-sm text-muted-foreground break-all">
                0x3BB64B23b0A1A5E510F67B0Cc1ab0C2F6dC84dD8
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={openDEXTools}
                className="mt-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View on DEXTools
              </Button>
            </div>
          </div>
        </div>

        {/* Price Update Information */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            NCTR price is automatically updated every 5 minutes from on-chain DEX data. 
            Use "Force Update" to refresh immediately if needed for admin operations.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default NCTRPriceManager;
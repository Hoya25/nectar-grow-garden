import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Coins, Clock } from 'lucide-react';
import nctrLogo from "@/assets/nctr-logo-grey.png";

interface PortfolioBreakdownProps {
  portfolio: {
    available_nctr: number;
    lock_360_nctr: number;
    total_earned: number;
    nctr_live_available?: number;
    nctr_live_lock_360?: number;
    nctr_live_total?: number;
    last_sync_at?: string;
  };
  currentPrice?: number;
}

export const PortfolioBreakdown = ({ portfolio, currentPrice }: PortfolioBreakdownProps) => {
  const formatNCTR = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(amount));
  };

  const formatUSD = (nctrAmount: number) => {
    if (!currentPrice) return '';
    const usdValue = nctrAmount * currentPrice;
    return `$${usdValue.toFixed(2)}`;
  };

  // Calculate Garden-only amounts
  const gardenAvailable = (portfolio.available_nctr || 0) - (portfolio.nctr_live_available || 0);
  const gardenLock360 = (portfolio.lock_360_nctr || 0) - (portfolio.nctr_live_lock_360 || 0);
  const gardenTotal = (portfolio.total_earned || 0) - (portfolio.nctr_live_total || 0);

  const nctrLiveAvailable = portfolio.nctr_live_available || 0;
  const nctrLiveLock360 = portfolio.nctr_live_lock_360 || 0;
  const nctrLiveTotal = portfolio.nctr_live_total || 0;

  const hasNCTRLiveData = nctrLiveTotal > 0;
  const lastSyncFormatted = portfolio.last_sync_at 
    ? new Date(portfolio.last_sync_at).toLocaleString()
    : null;

  return (
    <Card className="bg-white border border-section-border shadow-soft">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-primary" />
          Portfolio Breakdown
        </CardTitle>
        {lastSyncFormatted && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last synced: {lastSyncFormatted}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available NCTR */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Available NCTR</h3>
            <div className="text-right">
              <div className="font-bold text-green-600">
                {formatNCTR(portfolio.available_nctr)} NCTR
              </div>
              {currentPrice && (
                <div className="text-sm text-muted-foreground">
                  {formatUSD(portfolio.available_nctr)}
                </div>
              )}
            </div>
          </div>
          
          {hasNCTRLiveData && (
            <div className="space-y-2 pl-4 border-l-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    NCTR Live
                  </Badge>
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {formatNCTR(nctrLiveAvailable)} NCTR
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <img src={nctrLogo} alt="Garden" className="h-3 w-3 mr-1" />
                    Garden
                  </Badge>
                </div>
                <span className="text-sm text-green-600 font-medium">
                  {formatNCTR(Math.max(0, gardenAvailable))} NCTR
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* 360LOCK NCTR */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">360LOCK NCTR</h3>
            <div className="text-right">
              <div className="font-bold text-blue-600">
                {formatNCTR(portfolio.lock_360_nctr)} NCTR
              </div>
              {currentPrice && (
                <div className="text-sm text-muted-foreground">
                  {formatUSD(portfolio.lock_360_nctr)}
                </div>
              )}
            </div>
          </div>
          
          {hasNCTRLiveData && (
            <div className="space-y-2 pl-4 border-l-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    NCTR Live
                  </Badge>
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {formatNCTR(nctrLiveLock360)} NCTR
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <img src={nctrLogo} alt="Garden" className="h-3 w-3 mr-1" />
                    Garden
                  </Badge>
                </div>
                <span className="text-sm text-green-600 font-medium">
                  {formatNCTR(Math.max(0, gardenLock360))} NCTR
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Total Earned */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Total Earned</h3>
            <div className="text-right">
              <div className="font-bold text-purple-600">
                {formatNCTR(portfolio.total_earned)} NCTR
              </div>
              {currentPrice && (
                <div className="text-sm text-muted-foreground">
                  {formatUSD(portfolio.total_earned)}
                </div>
              )}
            </div>
          </div>
          
          {hasNCTRLiveData && (
            <div className="space-y-2 pl-4 border-l-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    NCTR Live
                  </Badge>
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {formatNCTR(nctrLiveTotal)} NCTR
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <img src={nctrLogo} alt="Garden" className="h-3 w-3 mr-1" />
                    Garden
                  </Badge>
                </div>
                <span className="text-sm text-green-600 font-medium">
                  {formatNCTR(Math.max(0, gardenTotal))} NCTR
                </span>
              </div>
            </div>
          )}
        </div>

        {!hasNCTRLiveData && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">
              Sync with NCTR Live to see portfolio breakdown
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
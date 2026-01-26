import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Clock, Lock, Coins } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import nctrNLogo from "@/assets/nctr-n-yellow.png";

interface NCTRPortfolioBreakdownProps {
  availableNctr: number;
  lock90Nctr: number;
  lock360Nctr: number;
  pendingNctr: number;
  showHeader?: boolean;
  className?: string;
}

// Format NCTR with commas, no decimals
const formatNCTR = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount || 0);
};

export const NCTRPortfolioBreakdown = ({
  availableNctr,
  lock90Nctr,
  lock360Nctr,
  pendingNctr,
  showHeader = true,
  className = ''
}: NCTRPortfolioBreakdownProps) => {
  const { currentPrice, formatPrice, calculatePortfolioValue } = useNCTRPrice();
  
  const totalNCTR = availableNctr + lock90Nctr + lock360Nctr;

  const formatUSD = (nctrAmount: number) => {
    const usdValue = calculatePortfolioValue(nctrAmount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(usdValue);
  };

  return (
    <Card className={`bg-card/80 backdrop-blur-sm ${className}`}>
      {showHeader && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-primary" />
            Your NCTR Portfolio
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showHeader ? '' : 'pt-6'}>
        {/* Total Balance Display */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl px-4 py-3 border border-primary/20 mb-4">
          <img src={nctrNLogo} alt="NCTR" className="h-10 w-10" />
          <div>
            <p className="text-2xl md:text-3xl font-bold text-primary">
              {formatNCTR(totalNCTR)} <span className="text-sm font-normal text-muted-foreground">NCTR</span>
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ {formatUSD(totalNCTR)} @ ${formatPrice(currentPrice)}
            </p>
          </div>
        </div>

        {/* Balance Breakdown Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Available */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Available</span>
              <InfoTooltip content="Spendable on Crescendo rewards anytime" size={12} />
            </div>
            <p className="text-lg font-bold text-emerald-600">
              {formatNCTR(availableNctr)}
            </p>
            <p className="text-[10px] text-emerald-600/80">NCTR</p>
            <p className="text-xs text-emerald-600/70 mt-1">{formatUSD(availableNctr)}</p>
            <p className="text-[10px] text-emerald-600/60 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Ready to spend
            </p>
          </div>

          {/* 90LOCK */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">90LOCK</span>
              <InfoTooltip content="Committed for 90 days to earn bonus NCTR on Crescendo" size={12} />
            </div>
            <p className="text-lg font-bold text-blue-600">
              {formatNCTR(lock90Nctr)}
            </p>
            <p className="text-[10px] text-blue-600/80">NCTR</p>
            <p className="text-xs text-blue-600/70 mt-1">{formatUSD(lock90Nctr)}</p>
            <p className="text-[10px] text-blue-600/60 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              90-day commitment
            </p>
          </div>

          {/* 360LOCK */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">360LOCK</span>
              <InfoTooltip content="Committed for 360 days for maximum rewards + premium perks" size={12} />
            </div>
            <p className="text-lg font-bold text-purple-600">
              {formatNCTR(lock360Nctr)}
            </p>
            <p className="text-[10px] text-purple-600/80">NCTR</p>
            <p className="text-xs text-purple-600/70 mt-1">{formatUSD(lock360Nctr)}</p>
            <p className="text-[10px] text-purple-600/60 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              360-day commitment
            </p>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Pending</span>
              <InfoTooltip content="From recent purchases, clears in 24-48 hours" size={12} />
            </div>
            <p className="text-lg font-bold text-gray-600">
              {formatNCTR(pendingNctr)}
            </p>
            <p className="text-[10px] text-gray-600/80">NCTR</p>
            <p className="text-xs text-gray-500 mt-1">{formatUSD(pendingNctr)}</p>
            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              Processing
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NCTRPortfolioBreakdown;

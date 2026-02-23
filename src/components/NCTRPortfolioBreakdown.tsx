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
            <p className="text-2xl md:text-3xl font-bold text-nctr-lime">
              {formatNCTR(totalNCTR)} <span className="text-sm font-normal text-muted-foreground">NCTR</span>
            </p>
            <p className="text-xs text-muted-foreground">
              ≈ {formatUSD(totalNCTR)} @ ${formatPrice(currentPrice)}
            </p>
          </div>
        </div>

        {/* Balance Breakdown Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Available */}
          <div className="bg-[#323232]/5 border border-[#5A5A58]/20 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="w-3.5 h-3.5 text-[#323232]" />
              <span className="text-xs font-medium text-[#323232]">Available</span>
              <InfoTooltip content="Spendable on Crescendo rewards anytime" size={12} />
            </div>
            <p className="text-lg font-bold text-nctr-lime">
              {formatNCTR(availableNctr)}
            </p>
            <p className="text-[10px] text-[#5A5A58]">NCTR</p>
            <p className="text-xs text-[#5A5A58] mt-1">{formatUSD(availableNctr)}</p>
            <p className="text-[10px] text-[#5A5A58] mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF6D]"></span>
              Ready to spend
            </p>
          </div>

          {/* 90LOCK — hidden per brand rules */}
          {false && (
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
          )}

          {/* 360LOCK */}
          <div className="bg-[#5A5A58]/10 border border-[#5A5A58]/20 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Lock className="w-3.5 h-3.5 text-[#323232]" />
              <span className="text-xs font-medium text-[#323232]">360LOCK</span>
              <InfoTooltip content="Committed for 360 days for maximum rewards + premium perks" size={12} />
            </div>
            <p className="text-lg font-bold text-nctr-lime">
              {formatNCTR(lock360Nctr)}
            </p>
            <p className="text-[10px] text-[#5A5A58]">NCTR</p>
            <p className="text-xs text-[#5A5A58] mt-1">{formatUSD(lock360Nctr)}</p>
            <p className="text-[10px] text-[#5A5A58] mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF6D]"></span>
              360-day commitment
            </p>
          </div>

          {/* Pending */}
          <div className="bg-[#D9D9D9]/20 border border-[#D9D9D9]/40 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-[#5A5A58]" />
              <span className="text-xs font-medium text-[#5A5A58]">Pending</span>
              <InfoTooltip content="From recent purchases, clears in 24-48 hours" size={12} />
            </div>
            <p className="text-lg font-bold text-[#5A5A58]">
              {formatNCTR(pendingNctr)}
            </p>
            <p className="text-[10px] text-[#5A5A58]/80">NCTR</p>
            <p className="text-xs text-[#5A5A58] mt-1">{formatUSD(pendingNctr)}</p>
            <p className="text-[10px] text-[#5A5A58] mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9D9D9]"></span>
              Processing
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NCTRPortfolioBreakdown;

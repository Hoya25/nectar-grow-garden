import { useEffect, useState } from 'react';
import nctrLogo from "@/assets/nctr-logo.png";

interface NCTRTickerProps {
  initialTotal: number;
  tokensPerSecond: number;
  className?: string;
}

const NCTRTicker = ({ initialTotal, tokensPerSecond, className = "" }: NCTRTickerProps) => {
  const [currentTotal, setCurrentTotal] = useState(initialTotal);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTotal(prev => prev + tokensPerSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [tokensPerSecond]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <div className={`flex items-center justify-center space-x-2 mb-2 ${className}`}>
      <div className="text-3xl font-bold bg-gradient-premium bg-clip-text text-transparent transition-all duration-300">
        {formatNumber(currentTotal)}
      </div>
      <img 
        src={nctrLogo} 
        alt="NCTR" 
        className="h-14 w-auto opacity-90"
      />
    </div>
  );
};

export default NCTRTicker;
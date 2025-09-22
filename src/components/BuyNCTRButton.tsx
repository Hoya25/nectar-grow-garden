import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ShoppingCart, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BuyNCTRButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
  buyPageUrl?: string; // Will be set later when buy page is ready
  showBadge?: boolean;
  badgeText?: string;
  suggestedAmount?: number;
  onPurchaseComplete?: (amount: number) => void; // For future integration
}

export const BuyNCTRButton: React.FC<BuyNCTRButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  buyPageUrl, // Currently null, will be set later
  showBadge = false,
  badgeText = 'Quick Buy',
  suggestedAmount,
  onPurchaseComplete
}) => {
  const handleBuyClick = () => {
    const targetUrl = buyPageUrl || 'https://token.nctr.live/';
    window.open(targetUrl, '_blank');
  };

  const defaultContent = (
    <>
      <ShoppingCart className="w-4 h-4 mr-2" />
      <span>Buy NCTR</span>
      {suggestedAmount && (
        <Badge variant="secondary" className="ml-2 text-xs">
          {suggestedAmount.toLocaleString()}
        </Badge>
      )}
    </>
  );

  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        className={`${className}`}
        onClick={handleBuyClick}
      >
        {children || defaultContent}
        <ExternalLink className="w-3 h-3 ml-1" />
      </Button>
      
      {showBadge && (
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 text-xs bg-primary text-primary-foreground animate-pulse"
        >
          {badgeText}
        </Badge>
      )}
    </div>
  );
};

// Specialized variants for different use cases
export const BuyNCTRUpgrade: React.FC<{
  currentAmount: number;
  targetAmount: number;
  targetStatus: string;
  className?: string;
}> = ({ currentAmount, targetAmount, targetStatus, className }) => {
  const needed = Math.max(0, targetAmount - currentAmount);
  
  if (needed <= 0) return null;
  
  return (
    <BuyNCTRButton
      variant="outline"
      className={`border-primary text-primary hover:bg-primary hover:text-primary-foreground ${className}`}
      suggestedAmount={needed}
      showBadge={true}
      badgeText="Upgrade"
    >
      <Zap className="w-4 h-4 mr-2" />
      <span>Buy {needed.toLocaleString()} NCTR</span>
      <Badge variant="secondary" className="ml-2 text-xs">
        → {targetStatus?.toUpperCase()}
      </Badge>
    </BuyNCTRButton>
  );
};

export const BuyNCTRQuick: React.FC<{
  amounts: number[];
  className?: string;
}> = ({ amounts = [1000, 2500, 5000], className }) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {amounts.map(amount => (
        <BuyNCTRButton
          key={amount}
          variant="outline"
          size="sm"
          className="text-xs"
          suggestedAmount={amount}
        >
          <ShoppingCart className="w-3 h-3 mr-1" />
          {amount.toLocaleString()}
        </BuyNCTRButton>
      ))}
    </div>
  );
};
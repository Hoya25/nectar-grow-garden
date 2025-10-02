import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Zap } from 'lucide-react';
import { BuyNCTRModal } from './BuyNCTRModal';

interface BuyNCTRButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  children?: React.ReactNode;
  showBadge?: boolean;
  badgeText?: string;
  suggestedAmount?: number;
  currentStatus?: string;
  current360Lock?: number;
  onPurchaseComplete?: () => void;
}

export const BuyNCTRButton: React.FC<BuyNCTRButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  showBadge = false,
  badgeText = 'Quick Buy',
  suggestedAmount,
  currentStatus,
  current360Lock,
  onPurchaseComplete
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleBuyClick = () => {
    setModalOpen(true);
  };

  const defaultContent = (
    <>
      <Zap className="w-4 h-4 sm:mr-2 flex-shrink-0" />
      <span className="text-xs sm:text-sm whitespace-nowrap">Level Up, Buy NCTR</span>
      {suggestedAmount && (
        <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs px-1.5">
          {suggestedAmount.toLocaleString()}
        </Badge>
      )}
    </>
  );

  return (
    <>
      <div className="relative inline-block">
        <Button
          type="button"
          variant={variant}
          size={size}
          className={`min-h-[44px] ${className}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBuyClick();
          }}
        >
          {children || defaultContent}
        </Button>
        
        {showBadge && (
          <Badge 
            variant="secondary" 
            className="absolute -top-2 -right-2 text-[10px] sm:text-xs bg-primary text-primary-foreground animate-pulse px-1.5 py-0.5"
          >
            {badgeText}
          </Badge>
        )}
      </div>

      <BuyNCTRModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        suggestedAmount={suggestedAmount}
        currentStatus={currentStatus}
        current360Lock={current360Lock}
        onPurchaseComplete={onPurchaseComplete}
      />
    </>
  );
};

// Specialized variants for different use cases
export const BuyNCTRUpgrade: React.FC<{
  currentAmount: number;
  targetAmount: number;
  targetStatus: string;
  currentStatus?: string;
  className?: string;
}> = ({ currentAmount, targetAmount, targetStatus, currentStatus, className }) => {
  const needed = Math.max(0, targetAmount - currentAmount);
  
  if (needed <= 0) return null;
  
  return (
    <BuyNCTRButton
      variant="outline"
      className={`border-primary text-primary hover:bg-primary hover:text-primary-foreground ${className}`}
      suggestedAmount={needed}
      currentStatus={currentStatus}
      current360Lock={currentAmount}
      showBadge={true}
      badgeText="Upgrade"
    >
      <Zap className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 flex-shrink-0" />
      <span className="text-xs sm:text-sm">Buy {needed.toLocaleString()} NCTR</span>
      <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs px-1.5 whitespace-nowrap">
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
    <div className={`flex flex-wrap gap-1.5 sm:gap-2 ${className}`}>
      {amounts.map(amount => (
        <BuyNCTRButton
          key={amount}
          variant="outline"
          size="sm"
          className="text-xs min-w-[80px] sm:min-w-[90px]"
          suggestedAmount={amount}
        >
          <ShoppingCart className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="whitespace-nowrap">{amount.toLocaleString()}</span>
        </BuyNCTRButton>
      ))}
    </div>
  );
};
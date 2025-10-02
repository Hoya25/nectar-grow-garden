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
  
  console.log('🔵 BuyNCTRButton render, modalOpen =', modalOpen);

  const handleBuyClick = () => {
    console.log('🛒 Buy NCTR button clicked - opening modal');
    console.log('🔓 Current modalOpen state BEFORE:', modalOpen);
    setModalOpen(true);
    // Force immediate check
    setTimeout(() => console.log('🔓 State after setState (should be true):', modalOpen), 0);
  };

  const defaultContent = (
    <>
      <Zap className="w-4 h-4 mr-2" />
      <span>Level Up, Buy NCTR</span>
      {suggestedAmount && (
        <Badge variant="secondary" className="ml-2 text-xs">
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
          className={`${className}`}
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
            className="absolute -top-2 -right-2 text-xs bg-primary text-primary-foreground animate-pulse"
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
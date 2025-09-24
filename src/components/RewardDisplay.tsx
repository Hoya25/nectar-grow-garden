import { Badge } from '@/components/ui/badge';
import nctrLogo from "@/assets/nctr-logo-grey.png";

interface RewardDisplayProps {
  opportunity: {
    available_nctr_reward?: number;
    lock_90_nctr_reward?: number;
    lock_360_nctr_reward?: number;
    reward_distribution_type?: string;
  };
  size?: 'sm' | 'md' | 'lg';
}

export const RewardDisplay = ({ 
  opportunity, 
  size = 'md'
}: RewardDisplayProps) => {
  const formatNCTR = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(amount));
  };

  const hasRewards = (opportunity.available_nctr_reward || 0) > 0 || 
                    (opportunity.lock_90_nctr_reward || 0) > 0 || 
                    (opportunity.lock_360_nctr_reward || 0) > 0;

  // Size configurations
  const sizeConfigs = {
    sm: {
      container: 'space-y-2',
      logo: 'h-6 w-auto',
      badgeText: 'text-xs',
      amountText: 'text-sm font-semibold',
      perDollarText: 'text-xs',
      flex: 'flex items-center gap-1'
    },
    md: {
      container: 'space-y-3',
      logo: 'h-8 w-auto',
      badgeText: 'text-xs',
      amountText: 'text-lg font-bold',
      perDollarText: 'text-sm',
      flex: 'flex items-center gap-2'
    },
    lg: {
      container: 'space-y-4',
      logo: 'h-12 w-auto',
      badgeText: 'text-sm',
      amountText: 'text-2xl font-bold',
      perDollarText: 'text-base',
      flex: 'flex items-center gap-3'
    }
  };

  const config = sizeConfigs[size];

  return (
    <div className={config.container}>
      {hasRewards && (
        <div className="space-y-2">
          <div className={`${config.perDollarText} font-medium text-muted-foreground uppercase tracking-wide text-center`}>
            Reward Breakdown
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {(opportunity.available_nctr_reward || 0) > 0 && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {formatNCTR(opportunity.available_nctr_reward)} Available
              </Badge>
            )}
            {(opportunity.lock_90_nctr_reward || 0) > 0 && (
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                {formatNCTR(opportunity.lock_90_nctr_reward)} 90LOCK
              </Badge>
            )}
            {(opportunity.lock_360_nctr_reward || 0) > 0 && (
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                {formatNCTR(opportunity.lock_360_nctr_reward)} 360LOCK
              </Badge>
            )}
          </div>
        </div>
      )}
      
      {!hasRewards && (
        <div className="text-center text-muted-foreground text-sm">
          No rewards configured
        </div>
      )}
    </div>
  );
};
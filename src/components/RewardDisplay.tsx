import { Badge } from '@/components/ui/badge';
import nctrLogo from "@/assets/nctr-logo-grey.png";

interface RewardDisplayProps {
  opportunity: {
    nctr_reward?: number;
    reward_per_dollar?: number;
    available_nctr_reward?: number;
    lock_90_nctr_reward?: number;
    lock_360_nctr_reward?: number;
    reward_distribution_type?: string;
    opportunity_type?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showPerDollar?: boolean;
  userMultiplier?: number;
  userStatus?: string;
}

export const RewardDisplay = ({ 
  opportunity, 
  size = 'md', 
  showPerDollar = true,
  userMultiplier = 1,
  userStatus = 'starter'
}: RewardDisplayProps) => {
  const formatNCTR = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(amount));
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'vip': return 'text-yellow-500';
      case 'premium': return 'text-purple-500';
      case 'platinum': return 'text-slate-300';
      case 'advanced': return 'text-blue-500';
      default: return 'text-primary';
    }
  };

  const isInviteOpportunity = opportunity.opportunity_type === 'invite';

  const isLegacyReward = opportunity.reward_distribution_type === 'legacy' || 
                        (!opportunity.reward_distribution_type && 
                         (opportunity.nctr_reward > 0 || opportunity.reward_per_dollar > 0));

  const hasNewRewards = (opportunity.available_nctr_reward || 0) > 0 || 
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
      {/* Legacy Reward Display */}
      {isLegacyReward && (
        <>
          {showPerDollar && opportunity.reward_per_dollar > 0 && (
            <div className="text-center">
              <div className={config.flex + ' justify-center'}>
                <span className={`${config.amountText} ${isInviteOpportunity && userMultiplier > 1 ? getStatusTextColor(userStatus) : 'text-primary'}`}>
                  {formatNCTR(opportunity.reward_per_dollar * (isInviteOpportunity ? userMultiplier : 1))}
                </span>
                <img src={nctrLogo} alt="NCTR" className={config.logo} />
              </div>
              <div className={`${config.perDollarText} text-muted-foreground`}>
                {isInviteOpportunity ? 'per friend who joins' : 'per $1 spent'}
              </div>
            </div>
          )}
          
          {opportunity.nctr_reward > 0 && (
            <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
              <div className={config.flex + ' justify-center mb-1'}>
                <span className={`${config.amountText} text-primary`}>
                  +{formatNCTR(opportunity.nctr_reward)}
                </span>
                <img src={nctrLogo} alt="NCTR" className={config.logo} />
              </div>
              <div className={`${config.perDollarText} text-primary`}>Welcome Bonus</div>
            </div>
          )}
        </>
      )}

      {/* New Reward Structure Display */}
      {hasNewRewards && (
        <div className="space-y-2">
          <div className={`${config.perDollarText} font-medium text-muted-foreground uppercase tracking-wide text-center`}>
            Reward Breakdown
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {(opportunity.available_nctr_reward || 0) > 0 && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span className={isInviteOpportunity && userMultiplier > 1 ? getStatusTextColor(userStatus) : ''}>
                  {formatNCTR((opportunity.available_nctr_reward || 0) * (isInviteOpportunity ? userMultiplier : 1))}
                </span> Available
              </Badge>
            )}
            {(opportunity.lock_90_nctr_reward || 0) > 0 && (
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                <span className={isInviteOpportunity && userMultiplier > 1 ? getStatusTextColor(userStatus) : ''}>
                  {formatNCTR((opportunity.lock_90_nctr_reward || 0) * (isInviteOpportunity ? userMultiplier : 1))}
                </span> 90LOCK
              </Badge>
            )}
            {(opportunity.lock_360_nctr_reward || 0) > 0 && (
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                <span className={isInviteOpportunity && userMultiplier > 1 ? getStatusTextColor(userStatus) : ''}>
                  {formatNCTR((opportunity.lock_360_nctr_reward || 0) * (isInviteOpportunity ? userMultiplier : 1))}
                </span> 360LOCK
              </Badge>
            )}
          </div>
          
          {showPerDollar && opportunity.reward_per_dollar > 0 && (
            <div className="text-center">
              <div className={config.flex + ' justify-center'}>
                <span className={`${config.amountText} ${isInviteOpportunity && userMultiplier > 1 ? getStatusTextColor(userStatus) : 'text-green-600'}`}>
                  +{formatNCTR((opportunity.reward_per_dollar || 0) * (isInviteOpportunity ? userMultiplier : 1))}
                </span>
                <img src={nctrLogo} alt="NCTR" className={config.logo} />
              </div>
              <div className={`${config.perDollarText} text-green-600`}>Available per $1 spent</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
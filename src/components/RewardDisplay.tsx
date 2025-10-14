import { Badge } from '@/components/ui/badge';
import nctrLogo from "@/assets/nctr-logo-grey-transparent.png";

interface RewardDisplayProps {
  opportunity: {
    nctr_reward?: number;
    reward_per_dollar?: number;
    available_nctr_reward?: number;
    lock_90_nctr_reward?: number;
    lock_360_nctr_reward?: number;
    reward_distribution_type?: string;
    opportunity_type?: string;
    // Alliance Token fields
    alliance_token_enabled?: boolean;
    alliance_token_name?: string;
    alliance_token_symbol?: string;
    alliance_token_logo_url?: string;
    alliance_token_ratio?: number;
    alliance_token_lock_days?: number;
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

  const formatAllianceToken = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5,
    }).format(amount);
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
                   {formatNCTR((opportunity.available_nctr_reward || 0) * (isInviteOpportunity ? userMultiplier : 1))} Available
                 </span>
               </Badge>
            )}
            {(opportunity.lock_90_nctr_reward || 0) > 0 && (
               <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                 <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                 <span className={isInviteOpportunity && userMultiplier > 1 ? getStatusTextColor(userStatus) : ''}>
                   {formatNCTR((opportunity.lock_90_nctr_reward || 0) * (isInviteOpportunity ? userMultiplier : 1))} 90LOCK
                 </span>
               </Badge>
            )}
            {(opportunity.lock_360_nctr_reward || 0) > 0 && (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                  <span className={isInviteOpportunity && userMultiplier > 1 ? getStatusTextColor(userStatus) : ''}>
                    {formatNCTR((opportunity.lock_360_nctr_reward || 0) * (isInviteOpportunity ? userMultiplier : 1))} 360LOCK
                  </span>
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

      {/* Alliance Token Display */}
      {opportunity.alliance_token_enabled && opportunity.alliance_token_ratio > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-4 rounded-lg border-2 border-purple-300 dark:border-purple-700">
          <div className={`${config.perDollarText} font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide text-center mb-2`}>
            Alliance Token Bonus
          </div>
          <div className="text-center space-y-2">
            <div className={config.flex + ' justify-center'}>
              <span className={`${config.amountText} text-purple-700 dark:text-purple-300`}>
                +{formatAllianceToken(opportunity.alliance_token_ratio)}
              </span>
              {opportunity.alliance_token_logo_url && (
                <img 
                  src={opportunity.alliance_token_logo_url} 
                  alt={opportunity.alliance_token_symbol} 
                  className={config.logo}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <span className={`${config.amountText} text-purple-700 dark:text-purple-300`}>
                {opportunity.alliance_token_symbol}
              </span>
            </div>
            <div className={`${config.perDollarText} text-purple-600 dark:text-purple-400`}>
              per $1 spent
            </div>
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
              🔒 Locked for {opportunity.alliance_token_lock_days} days
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};
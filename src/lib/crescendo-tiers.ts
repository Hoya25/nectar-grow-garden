// Crescendo Status tier thresholds (NCTR in 360LOCK)
// These should match the values in opportunity_status_levels table
export const CRESCENDO_TIER_THRESHOLDS = {
  bronze: 0,       // Bronze: 0 NCTR (entry tier)
  silver: 1000,    // Silver: 1,000 NCTR
  gold: 2500,      // Gold: 2,500 NCTR
  platinum: 10000, // Platinum: 10,000 NCTR
  diamond: 50000   // Diamond: 50,000 NCTR
} as const;

// Tier display names with emojis
export const CRESCENDO_TIER_DISPLAY = {
  starter: { name: 'Starter', emoji: '🌱', icon: 'TrendingUp' },
  bronze: { name: 'Bronze', emoji: '🥉', icon: 'Award' },
  silver: { name: 'Silver', emoji: '🥈', icon: 'Star' },
  gold: { name: 'Gold', emoji: '🥇', icon: 'Crown' },
  platinum: { name: 'Platinum', emoji: '💎', icon: 'Gem' },
  diamond: { name: 'Diamond', emoji: '💠', icon: 'Diamond' }
} as const;

// Get tier display with emoji
export const getTierDisplay = (status: string): string => {
  const tier = CRESCENDO_TIER_DISPLAY[status as keyof typeof CRESCENDO_TIER_DISPLAY];
  return tier ? `${tier.emoji} ${tier.name}` : status.charAt(0).toUpperCase() + status.slice(1);
};

// Get tier emoji only
export const getTierEmoji = (status: string): string => {
  const tier = CRESCENDO_TIER_DISPLAY[status as keyof typeof CRESCENDO_TIER_DISPLAY];
  return tier?.emoji || '🌱';
};

// Get tier name only
export const getTierName = (status: string): string => {
  const tier = CRESCENDO_TIER_DISPLAY[status as keyof typeof CRESCENDO_TIER_DISPLAY];
  return tier?.name || status.charAt(0).toUpperCase() + status.slice(1);
};

// Get ordered tier levels for progression
export const getOrderedTierLevels = () => [
  { status: 'bronze', required: CRESCENDO_TIER_THRESHOLDS.bronze },
  { status: 'silver', required: CRESCENDO_TIER_THRESHOLDS.silver },
  { status: 'gold', required: CRESCENDO_TIER_THRESHOLDS.gold },
  { status: 'platinum', required: CRESCENDO_TIER_THRESHOLDS.platinum },
  { status: 'diamond', required: CRESCENDO_TIER_THRESHOLDS.diamond }
];

// Get next tier info based on current status
export const getNextTierInfo = (currentStatus: string): { status: string; required: number } | null => {
  const levels = getOrderedTierLevels();
  const currentIndex = levels.findIndex(level => level.status === currentStatus);
  return levels[currentIndex + 1] || null;
};

// Determine tier based on NCTR amount
export const getTierForAmount = (nctrAmount: number): string => {
  if (nctrAmount >= CRESCENDO_TIER_THRESHOLDS.diamond) return 'diamond';
  if (nctrAmount >= CRESCENDO_TIER_THRESHOLDS.platinum) return 'platinum';
  if (nctrAmount >= CRESCENDO_TIER_THRESHOLDS.gold) return 'gold';
  if (nctrAmount >= CRESCENDO_TIER_THRESHOLDS.silver) return 'silver';
  if (nctrAmount >= CRESCENDO_TIER_THRESHOLDS.bronze) return 'bronze';
  return 'starter';
};

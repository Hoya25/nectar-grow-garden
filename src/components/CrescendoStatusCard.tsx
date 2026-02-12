import { ExternalLink, ChevronRight } from "lucide-react";
import { 
  CRESCENDO_TIER_THRESHOLDS,
  CRESCENDO_TIER_DISPLAY,
  getTierForAmount,
  getTierEmoji,
  getTierName,
  getNextTierInfo,
  getOrderedTierLevels
} from "@/lib/crescendo-tiers";

interface CrescendoStatusCardProps {
  totalNctr: number;
  compact?: boolean;
}

// Tier perks for display
const TIER_PERKS: Record<string, string[]> = {
  bronze: [
    "Access to The Garden shopping",
    "Basic NCTR earning rate",
    "Community access"
  ],
  silver: [
    "5% bonus NCTR on purchases",
    "Early access to new brands",
    "Priority email support"
  ],
  gold: [
    "10% bonus NCTR on purchases",
    "Early access to rewards",
    "Priority support"
  ],
  platinum: [
    "15% bonus NCTR on purchases",
    "Exclusive partner deals",
    "VIP support access"
  ],
  diamond: [
    "20% bonus NCTR on purchases",
    "Founding member perks",
    "Direct team access",
    "Exclusive investment opportunities"
  ]
};

export const CrescendoStatusCard = ({ totalNctr, compact = false }: CrescendoStatusCardProps) => {
  const currentTier = getTierForAmount(totalNctr);
  const tierEmoji = getTierEmoji(currentTier);
  const tierName = getTierName(currentTier);
  const nextTierInfo = getNextTierInfo(currentTier);
  const perks = TIER_PERKS[currentTier] || TIER_PERKS.bronze;

  // Calculate progress to next tier
  const levels = getOrderedTierLevels();
  const currentTierData = levels.find(l => l.status === currentTier);
  const currentThreshold = currentTierData?.required || 0;
  
  let progressPercent = 100;
  let progressText = "Max tier reached!";
  
  if (nextTierInfo) {
    const nctrInCurrentTier = totalNctr - currentThreshold;
    const nctrNeededForNext = nextTierInfo.required - currentThreshold;
    progressPercent = Math.min(100, Math.max(0, (nctrInCurrentTier / nctrNeededForNext) * 100));
    progressText = `${totalNctr.toLocaleString()} / ${nextTierInfo.required.toLocaleString()} NCTR`;
  }

  // Compact version for header/sidebar
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full garden-card border border-[hsl(var(--garden-border))]">
        <span className="text-lg">{tierEmoji}</span>
        <span className="text-sm font-medium garden-text">{tierName}</span>
      </div>
    );
  }

  return (
    <div className="garden-theme garden-card rounded-xl p-5 garden-card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold garden-text-muted uppercase tracking-wider">
          Your Crescendo Status
        </h3>
        <a
          href="https://crescendo.nctr.live"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs garden-accent hover:opacity-80 transition-opacity flex items-center gap-1"
        >
          View on Crescendo
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Current Tier Display */}
      <div className="text-center mb-5">
        <div className="text-5xl mb-2">{tierEmoji}</div>
        <h2 className="text-2xl font-bold garden-text">{tierName}</h2>
        <p className="text-sm garden-text-muted mt-1">
          Total NCTR: {totalNctr.toLocaleString()}
        </p>
      </div>

      {/* Progress to Next Tier */}
      {nextTierInfo ? (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm garden-text">
              Progress to {getTierName(nextTierInfo.status)} {getTierEmoji(nextTierInfo.status)}
            </span>
            <span className="text-sm font-medium garden-accent">
              {Math.round(progressPercent)}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(var(--garden-border))' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${progressPercent}%`,
                backgroundColor: 'hsl(var(--garden-accent))',
                boxShadow: '0 0 10px rgba(191,255,0,0.5)'
              }}
            />
          </div>
          
          <p className="text-xs garden-text-muted mt-2 text-center">
            {progressText}
          </p>
        </div>
      ) : (
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'hsl(var(--garden-accent))', color: 'hsl(var(--garden-bg))' }}>
            <span className="text-lg">💠</span>
            <span className="font-semibold">Max tier reached!</span>
          </div>
        </div>
      )}

      {/* Tier Perks */}
      <div className="rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--garden-bg))' }}>
        <h4 className="text-sm font-semibold garden-text mb-3">
          {tierName} Perks:
        </h4>
        <ul className="space-y-2">
          {perks.map((perk, index) => (
            <li key={index} className="flex items-start gap-2 text-sm garden-text-muted">
              <span className="text-[hsl(var(--garden-accent))]">•</span>
              {perk}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <a
        href="https://crescendo.nctr.live/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold transition-all hover:opacity-90 btn-press"
        style={{ 
          backgroundColor: 'hsl(var(--garden-accent))', 
          color: 'hsl(var(--garden-bg))' 
        }}
      >
        Unlock Rewards on Crescendo
        <ChevronRight className="h-4 w-4" />
      </a>
      <p className="text-xs garden-text-muted text-center mt-2">
        Lock your stakes to level up your status and access exclusive rewards
      </p>
    </div>
  );
};

// Mini badge version for headers
export const CrescendoTierBadge = ({ totalNctr }: { totalNctr: number }) => {
  const currentTier = getTierForAmount(totalNctr);
  const tierEmoji = getTierEmoji(currentTier);
  const tierName = getTierName(currentTier);

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span>{tierEmoji}</span>
      <span className="garden-text-muted">{tierName}</span>
    </span>
  );
};

export default CrescendoStatusCard;

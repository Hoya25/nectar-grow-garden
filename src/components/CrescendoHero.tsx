import { Shield, ChevronRight, Lock, Star } from 'lucide-react';
import { getTierForAmount, getTierName, getNextTierInfo, CRESCENDO_TIER_THRESHOLDS } from '@/lib/crescendo-tiers';

interface CrescendoHeroProps {
  currentBalance?: number;
  onViewRewards?: () => void;
  onLevelUp?: () => void;
}

const CrescendoHero = ({ currentBalance, onViewRewards, onLevelUp }: CrescendoHeroProps) => {
  const isLoggedIn = currentBalance != null;
  const tierKey = isLoggedIn ? getTierForAmount(currentBalance) : null;
  const tierName = tierKey ? getTierName(tierKey) : null;
  const nextTierInfo = tierKey ? getNextTierInfo(tierKey) : null;
  const nextThreshold = nextTierInfo ? CRESCENDO_TIER_THRESHOLDS[nextTierInfo.status as keyof typeof CRESCENDO_TIER_THRESHOLDS] : null;

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-[hsl(var(--nctr-dark))]">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--nctr-light)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--nctr-light)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Accent glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(var(--nctr-accent))] opacity-[0.05] blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 text-center max-w-2xl">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(var(--nctr-accent))]/10 mb-6 animate-fade-in">
          <Shield className="w-8 h-8 text-[hsl(var(--nctr-accent))]" />
        </div>

        {isLoggedIn && tierName ? (
          <>
            {/* Logged-in state */}
            <p className="text-sm font-medium uppercase tracking-widest text-[hsl(var(--nctr-accent))] mb-2 animate-fade-in">
              Your Status
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-3 animate-fade-in [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">
              {tierName}
            </h1>
            <p className="text-lg text-[hsl(var(--nctr-light))]/70 mb-8 animate-fade-in [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
              {currentBalance.toLocaleString()} NCTR committed
              {nextTierInfo && nextThreshold && (
                <> · <strong className="text-white">{(nextThreshold - currentBalance).toLocaleString()}</strong> to {getTierName(nextTierInfo.status)}</>
              )}
            </p>

            {/* Progress bar */}
            {nextThreshold && (
              <div className="w-full max-w-sm mx-auto mb-8 animate-fade-in [animation-delay:250ms] opacity-0 [animation-fill-mode:forwards]">
                <div className="h-2 rounded-full bg-[hsl(var(--nctr-mid))]/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--nctr-accent))] transition-all duration-700"
                    style={{ width: `${Math.min(100, (currentBalance / nextThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
              {onViewRewards && (
                <button
                  onClick={onViewRewards}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-[hsl(var(--nctr-accent))] text-[hsl(var(--nctr-dark))] hover:opacity-90 transition-all hover:scale-105"
                >
                  <Star className="w-4 h-4" />
                  View Rewards
                </button>
              )}
              {onLevelUp && (
                <button
                  onClick={onLevelUp}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-[hsl(var(--nctr-mid))]/30 text-[hsl(var(--nctr-light))] hover:border-[hsl(var(--nctr-accent))]/40 hover:bg-[hsl(var(--nctr-accent))]/10 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Level Up
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Visitor state */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 animate-fade-in [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">
              Your Status.{' '}
              <span className="text-[hsl(var(--nctr-accent))]">Your Rewards.</span>
            </h1>
            <p className="text-lg text-[hsl(var(--nctr-light))]/70 max-w-lg mx-auto mb-8 animate-fade-in [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
              Commit NCTR to climb from Bronze to Diamond. Higher status unlocks better rewards, higher earn rates, and exclusive access.
            </p>

            {/* Tier preview */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-8 animate-fade-in [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
              {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((name) => (
                <span
                  key={name}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(var(--nctr-mid))]/10 border border-[hsl(var(--nctr-mid))]/15 text-[hsl(var(--nctr-light))]/60"
                >
                  {name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default CrescendoHero;

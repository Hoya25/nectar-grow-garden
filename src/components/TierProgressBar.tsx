import { ChevronRight, Lock, Star, TrendingUp } from 'lucide-react';
import {
  getTierForAmount,
  getTierName,
  getNextTierInfo,
  getOrderedTierLevels,
  CRESCENDO_TIER_THRESHOLDS,
} from '@/lib/crescendo-tiers';

interface TierProgressBarProps {
  balance: number;
  lockedBalance?: number;
  onLevelUp?: () => void;
  onViewPerks?: () => void;
}

const TIER_STYLES: Record<string, { color: string; bg: string }> = {
  starter:  { color: 'var(--color-text-muted)', bg: 'var(--color-bg-surface)' },
  bronze:   { color: 'var(--tier-bronze)',       bg: 'var(--tier-bronze-bg)' },
  silver:   { color: 'var(--tier-silver)',       bg: 'var(--tier-silver-bg)' },
  gold:     { color: 'var(--tier-gold)',         bg: 'var(--tier-gold-bg)' },
  platinum: { color: 'var(--tier-platinum)',     bg: 'var(--tier-platinum-bg)' },
  diamond:  { color: 'var(--tier-diamond)',     bg: 'var(--tier-diamond-bg)' },
};

const TierProgressBar = ({ balance, lockedBalance = 0, onLevelUp, onViewPerks }: TierProgressBarProps) => {
  const currentTier = getTierForAmount(balance);
  const nextTierInfo = getNextTierInfo(currentTier);
  const levels = getOrderedTierLevels();
  const style = TIER_STYLES[currentTier] || TIER_STYLES.starter;

  const currentThreshold = CRESCENDO_TIER_THRESHOLDS[currentTier as keyof typeof CRESCENDO_TIER_THRESHOLDS] ?? 0;
  const nextThreshold = nextTierInfo
    ? CRESCENDO_TIER_THRESHOLDS[nextTierInfo.status as keyof typeof CRESCENDO_TIER_THRESHOLDS]
    : null;

  const progress = nextThreshold
    ? Math.min(100, ((balance - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  const remaining = nextThreshold ? nextThreshold - balance : 0;

  return (
    <section
      className="w-full mx-auto animate-fade-in"
      style={{ maxWidth: 720, padding: 'var(--space-6) 0' }}
    >
      {/* Current tier + next tier header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 36, height: 36,
              borderRadius: 'var(--radius-lg)',
              background: style.bg,
            }}
          >
            <Star style={{ width: 18, height: 18, color: style.color }} />
          </span>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-bold)',
                color: style.color,
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 'var(--leading-tight)',
              }}
            >
              {getTierName(currentTier)}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {balance.toLocaleString()} NCTR committed
            </p>
          </div>
        </div>

        {nextTierInfo && (
          <div className="text-right">
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Next: <span style={{ color: TIER_STYLES[nextTierInfo.status]?.color }}>{getTierName(nextTierInfo.status)}</span>
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {remaining.toLocaleString()} NCTR to go
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 10,
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-bg-surface)',
          overflow: 'hidden',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 'var(--radius-full)',
            background: `linear-gradient(90deg, ${style.color}, var(--color-accent))`,
            width: `${progress}%`,
            transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>

      {/* Tier markers */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 'var(--space-5)', gap: 'var(--space-1)' }}
      >
        {levels.map((level) => {
          const reached = balance >= level.required;
          const isCurrent = currentTier === level.status;
          const ls = TIER_STYLES[level.status];
          return (
            <div
              key={level.status}
              className="flex flex-col items-center"
              style={{ flex: 1, gap: 'var(--space-1)' }}
            >
              <span
                style={{
                  width: isCurrent ? 10 : 7,
                  height: isCurrent ? 10 : 7,
                  borderRadius: 'var(--radius-full)',
                  background: reached ? ls.color : 'var(--color-bg-surface)',
                  border: isCurrent ? `2px solid ${ls.color}` : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              />
              <span
                style={{
                  fontSize: '0.625rem',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isCurrent ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                  color: reached ? ls.color : 'var(--color-text-muted)',
                  letterSpacing: 'var(--tracking-wide)',
                  textTransform: 'uppercase' as const,
                }}
              >
                {getTierName(level.status)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Locked balance info + actions */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between"
        style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border)',
          gap: 'var(--space-3)',
        }}
      >
        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
          <Lock style={{ width: 16, height: 16, color: 'var(--color-accent)', opacity: 0.7 }} />
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--weight-medium)' }}>
              {lockedBalance.toLocaleString()} NCTR locked
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {balance > 0 ? `${((lockedBalance / balance) * 100).toFixed(0)}% of total` : 'No balance yet'}
            </p>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
          {onViewPerks && (
            <button
              onClick={onViewPerks}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'border-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-medium)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              <TrendingUp style={{ width: 14, height: 14 }} />
              View Perks
            </button>
          )}
          {onLevelUp && nextTierInfo && (
            <button
              onClick={onLevelUp}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--color-text-on-accent)',
                background: 'var(--color-accent)',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Level Up
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default TierProgressBar;

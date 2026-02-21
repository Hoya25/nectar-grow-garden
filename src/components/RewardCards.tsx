import { useState } from 'react';
import { Lock, ShoppingBag, Star, SlidersHorizontal, X, Gift, PackageOpen } from 'lucide-react';
import { getTierName } from '@/lib/crescendo-tiers';

/* ── Types ── */
export interface RewardCard {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  nctrCost: number;
  category: string;
  requiredTier: string;
  stock?: number | null;
}

interface Props {
  rewards: RewardCard[];
  userTier?: string;
  loading?: boolean;
  onClaim?: (reward: RewardCard) => void;
}

const TIER_ORDER = ['starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
const tierRank = (t: string) => TIER_ORDER.indexOf(t.toLowerCase());

const TIER_COLORS: Record<string, { color: string; bg: string }> = {
  bronze:   { color: 'var(--tier-bronze)',   bg: 'var(--tier-bronze-bg)' },
  silver:   { color: 'var(--tier-silver)',   bg: 'var(--tier-silver-bg)' },
  gold:     { color: 'var(--tier-gold)',     bg: 'var(--tier-gold-bg)' },
  platinum: { color: 'var(--tier-platinum)', bg: 'var(--tier-platinum-bg)' },
  diamond:  { color: 'var(--tier-diamond)',  bg: 'var(--tier-diamond-bg)' },
};

/* ── Skeleton Card ── */
const SkeletonCard = () => (
  <div
    style={{
      background: 'var(--card-bg)',
      border: 'var(--card-border)',
      borderRadius: 'var(--card-radius)',
      overflow: 'hidden',
    }}
  >
    <div
      style={{ height: 160, background: 'var(--color-bg-surface)' }}
      className="animate-soft-pulse"
    />
    <div style={{ padding: 'var(--card-padding)' }} className="flex flex-col" >
      <div style={{ height: 14, width: '60%', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-surface)' }} className="animate-soft-pulse" />
      <div style={{ height: 12, width: '90%', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-surface)', marginTop: 'var(--space-2)' }} className="animate-soft-pulse" />
      <div style={{ height: 12, width: '40%', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-surface)', marginTop: 'var(--space-2)' }} className="animate-soft-pulse" />
      <div style={{ height: 36, borderRadius: 'var(--btn-radius)', background: 'var(--color-bg-surface)', marginTop: 'var(--space-4)' }} className="animate-soft-pulse" />
    </div>
  </div>
);

/* ── Main Component ── */
const RewardCards = ({ rewards, userTier = 'starter', loading = false, onClaim }: Props) => {
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<'cost-asc' | 'cost-desc' | 'tier'>('cost-asc');
  const [previewReward, setPreviewReward] = useState<RewardCard | null>(null);

  const categories = ['All', ...Array.from(new Set(rewards.map((r) => r.category)))];

  const filtered = rewards
    .filter((r) => category === 'All' || r.category === category)
    .sort((a, b) => {
      if (sort === 'cost-asc') return a.nctrCost - b.nctrCost;
      if (sort === 'cost-desc') return b.nctrCost - a.nctrCost;
      return tierRank(a.requiredTier) - tierRank(b.requiredTier);
    });

  const isUnlocked = (tier: string) => tierRank(userTier) >= tierRank(tier);

  /* ── Loading ── */
  if (loading) {
    return (
      <section className="w-full animate-fade-in" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full animate-fade-in" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center"
        style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}
      >
        {/* Category pills */}
        <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)', flex: 1 }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: `var(--space-1) var(--space-4)`,
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase' as const,
                border: '1px solid',
                borderColor: c === category ? 'var(--color-accent)' : 'var(--color-border)',
                background: c === category ? 'var(--color-accent-subtle)' : 'transparent',
                color: c === category ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                transition: `all var(--transition-fast)`,
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            style={{
              background: 'var(--input-bg)',
              border: 'var(--input-border)',
              borderRadius: 'var(--input-radius)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              padding: `var(--space-1) var(--space-3)`,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="cost-asc">NCTR: Low → High</option>
            <option value="cost-desc">NCTR: High → Low</option>
            <option value="tier">Tier Required</option>
          </select>
        </div>
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center text-center animate-fade-in"
          style={{ padding: 'var(--space-16) var(--space-4)', gap: 'var(--space-4)' }}
        >
          <PackageOpen className="w-12 h-12" style={{ color: 'var(--color-text-muted)' }} />
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
            No rewards available
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: 360 }}>
            {category !== 'All'
              ? `No rewards found in "${category}". Try a different category.`
              : 'Check back soon — new rewards are added regularly.'}
          </p>
        </div>
      )}

      {/* ── Grid ── */}
      {filtered.length > 0 && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {filtered.map((reward, idx) => {
            const unlocked = isUnlocked(reward.requiredTier);
            const tierStyle = TIER_COLORS[reward.requiredTier.toLowerCase()];

            return (
              <article
                key={reward.id}
                className="flex flex-col overflow-hidden animate-slide-up"
                style={{
                  background: 'var(--card-bg)',
                  border: 'var(--card-border)',
                  borderRadius: 'var(--card-radius)',
                  boxShadow: 'var(--card-shadow)',
                  transition: `transform var(--transition-standard), box-shadow var(--transition-standard)`,
                  animationDelay: `${idx * 60}ms`,
                  cursor: 'pointer',
                }}
                onClick={() => setPreviewReward(reward)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-strong)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                }}
              >
                {/* Image */}
                <div
                  className="relative"
                  style={{
                    height: 160,
                    background: 'var(--color-bg-surface)',
                    overflow: 'hidden',
                  }}
                >
                  {reward.imageUrl ? (
                    <img
                      src={reward.imageUrl}
                      alt={reward.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                      <Gift className="w-10 h-10" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  )}

                  {/* Tier badge */}
                  {reward.requiredTier !== 'starter' && reward.requiredTier !== 'bronze' && (
                    <span
                      className="absolute"
                      style={{
                        top: 'var(--space-2)',
                        right: 'var(--space-2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        letterSpacing: 'var(--tracking-wider)',
                        textTransform: 'uppercase' as const,
                        background: tierStyle?.bg || 'var(--color-bg-overlay)',
                        color: tierStyle?.color || 'var(--color-text-secondary)',
                      }}
                    >
                      {!unlocked && <Lock className="w-3 h-3" />}
                      {getTierName(reward.requiredTier)}
                    </span>
                  )}

                  {/* Lock overlay */}
                  {!unlocked && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(42,42,40,0.7)', backdropFilter: 'blur(2px)' }}
                    >
                      <Lock className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1" style={{ padding: 'var(--card-padding)', gap: 'var(--space-2)' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--weight-semibold)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {reward.title}
                  </h3>
                  <p
                    className="flex-1"
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 'var(--leading-normal)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }}
                  >
                    {reward.description}
                  </p>

                  {/* Cost & CTA */}
                  <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-3)' }}>
                    <span
                      className="flex items-center"
                      style={{
                        gap: 'var(--space-1)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--weight-bold)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      <Star className="w-3.5 h-3.5" />
                      {reward.nctrCost.toLocaleString()} NCTR
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (unlocked && onClaim) onClaim(reward);
                      }}
                      disabled={!unlocked}
                      className="btn btn-sm"
                      style={{
                        background: unlocked ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                        color: unlocked ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)',
                        border: unlocked ? '1px solid transparent' : '1px solid var(--color-border)',
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        opacity: unlocked ? 1 : 0.6,
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--tracking-wide)',
                      }}
                    >
                      {unlocked ? (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" /> Claim
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" /> Locked
                        </>
                      )}
                    </button>
                  </div>

                  {reward.stock !== undefined && reward.stock !== null && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                      {reward.stock > 0 ? `${reward.stock} remaining` : 'Out of stock'}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewReward && (
        <div
          className="fixed inset-0 flex items-center justify-center animate-fade-in"
          style={{ zIndex: 'var(--z-modal)', padding: 'var(--space-4)' }}
          onClick={() => setPreviewReward(null)}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          <div
            className="relative w-full flex flex-col animate-scale-in"
            style={{
              maxWidth: 480,
              maxHeight: '85vh',
              background: 'var(--color-bg-raised)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal image */}
            <div style={{ height: 200, background: 'var(--color-bg-surface)', position: 'relative' }}>
              {previewReward.imageUrl ? (
                <img src={previewReward.imageUrl} alt={previewReward.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
                  <Gift className="w-14 h-14" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              )}
              <button
                onClick={() => setPreviewReward(null)}
                className="absolute"
                style={{
                  top: 'var(--space-3)',
                  right: 'var(--space-3)',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-bg-overlay)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex flex-col" style={{ padding: 'var(--space-6)', gap: 'var(--space-4)', overflowY: 'auto' }}>
              <div className="flex items-start justify-between" style={{ gap: 'var(--space-3)' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text-primary)',
                  letterSpacing: 'var(--tracking-tight)',
                }}>
                  {previewReward.title}
                </h3>
                {(() => {
                  const ts = TIER_COLORS[previewReward.requiredTier.toLowerCase()];
                  return previewReward.requiredTier !== 'starter' && previewReward.requiredTier !== 'bronze' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        textTransform: 'uppercase',
                        background: ts?.bg,
                        color: ts?.color,
                        flexShrink: 0,
                      }}
                    >
                      {getTierName(previewReward.requiredTier)}
                    </span>
                  ) : null;
                })()}
              </div>

              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                {previewReward.description}
              </p>

              <div
                className="flex items-center justify-between"
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)' }}>
                    Cost
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                    {previewReward.nctrCost.toLocaleString()} NCTR
                  </p>
                </div>
                {previewReward.stock !== undefined && previewReward.stock !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)' }}>
                      Stock
                    </p>
                    <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
                      {previewReward.stock}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (isUnlocked(previewReward.requiredTier) && onClaim) {
                    onClaim(previewReward);
                    setPreviewReward(null);
                  }
                }}
                disabled={!isUnlocked(previewReward.requiredTier)}
                className="btn w-full"
                style={{
                  background: isUnlocked(previewReward.requiredTier) ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                  color: isUnlocked(previewReward.requiredTier) ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)',
                  border: isUnlocked(previewReward.requiredTier) ? '1px solid transparent' : '1px solid var(--color-border)',
                  cursor: isUnlocked(previewReward.requiredTier) ? 'pointer' : 'not-allowed',
                  opacity: isUnlocked(previewReward.requiredTier) ? 1 : 0.6,
                  justifyContent: 'center',
                }}
              >
                {isUnlocked(previewReward.requiredTier) ? (
                  <><ShoppingBag className="w-4 h-4" /> Claim Reward</>
                ) : (
                  <><Lock className="w-4 h-4" /> Requires {getTierName(previewReward.requiredTier)} Status</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default RewardCards;

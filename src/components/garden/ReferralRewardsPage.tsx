import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Copy, Check, Users, Coins, Share2, Gift, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const milestones = [
  { count: 3, reward: 150, label: 'Getting Started' },
  { count: 5, reward: 300, label: 'Community Builder' },
  { count: 10, reward: 750, label: 'Garden Grower' },
  { count: 25, reward: 2000, label: 'Top Advocate' },
  { count: 50, reward: 5000, label: 'Legend' },
];

const ReferralRewardsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const inviteLink = user
    ? `${window.location.origin}/auth?ref=${user.id.slice(0, 8)}`
    : '';

  const { data: stats } = useQuery({
    queryKey: ['referral-stats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals' as any)
        .select('id, is_paid')
        .eq('referrer_id', user!.id);

      if (error) throw error;
      const rows = (data ?? []) as any[];
      const invited = rows.length;
      const earned = rows.filter((r: any) => r.is_paid).length * 50; // 50 NCTR per paid referral
      return { invited, earned };
    },
  });

  const friendsInvited = stats?.invited ?? 0;
  const nctrEarned = stats?.earned ?? 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: 'Link copied!', description: 'Share it with friends.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    const text = encodeURIComponent(
      "Join me on The Garden and start earning NCTR! 🌱"
    );
    const url = encodeURIComponent(inviteLink);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      email: `mailto:?subject=Join%20The%20Garden&body=${text}%20${url}`,
    };
    window.open(urls[platform], '_blank', 'noopener');
  };

  const currentMilestoneIdx = milestones.findIndex(
    (m) => friendsInvited < m.count
  );
  const nextMilestone =
    currentMilestoneIdx >= 0 ? milestones[currentMilestoneIdx] : null;

  return (
    <main className="min-h-screen bg-[hsl(var(--nctr-dark))] text-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(var(--nctr-accent))]/10 mb-6">
            <Gift className="w-8 h-8 text-[hsl(var(--nctr-accent))]" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Share The Garden.{' '}
            <span className="text-[hsl(var(--nctr-accent))]">
              Earn Together.
            </span>
          </h1>
          <p className="text-lg text-[hsl(var(--nctr-light))] max-w-xl mx-auto">
            When a friend joins using your link, you both earn NCTR.
          </p>
        </header>

        {/* Invite Link */}
        <section className="mb-10 animate-fade-in [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">
          <label className="block text-sm font-medium text-[hsl(var(--nctr-light))]/70 mb-2">
            Your Invite Link
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[hsl(var(--nctr-mid))]/15 border border-[hsl(var(--nctr-mid))]/20 rounded-xl px-4 py-3 text-sm truncate text-[hsl(var(--nctr-light))]">
              {inviteLink || 'Sign in to get your link'}
            </div>
            <button
              onClick={handleCopy}
              disabled={!inviteLink}
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-[hsl(var(--nctr-accent))] text-[hsl(var(--nctr-dark))] hover:opacity-90 transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 mb-10 animate-fade-in [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
          <div className="bg-[hsl(var(--nctr-mid))]/10 border border-[hsl(var(--nctr-mid))]/15 rounded-2xl p-5 text-center transition-colors duration-200 hover:border-[hsl(var(--nctr-accent))]/30">
            <Users className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--nctr-accent))]" />
            <p className="text-3xl font-bold">{friendsInvited}</p>
            <p className="text-xs text-[hsl(var(--nctr-light))]/60 mt-1">
              Friends Invited
            </p>
          </div>
          <div className="bg-[hsl(var(--nctr-mid))]/10 border border-[hsl(var(--nctr-mid))]/15 rounded-2xl p-5 text-center transition-colors duration-200 hover:border-[hsl(var(--nctr-accent))]/30">
            <Coins className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--nctr-accent))]" />
            <p className="text-3xl font-bold">
              {nctrEarned.toLocaleString()}
            </p>
            <p className="text-xs text-[hsl(var(--nctr-light))]/60 mt-1">
              NCTR Earned from Invites
            </p>
          </div>
        </section>

        {/* Milestones */}
        <section className="mb-10 animate-fade-in [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-[hsl(var(--nctr-accent))]" />
            Milestone Rewards
          </h2>
          <div className="space-y-3">
            {milestones.map((m) => {
              const reached = friendsInvited >= m.count;
              const isNext = nextMilestone?.count === m.count;
              return (
                <div
                  key={m.count}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 ${
                    reached
                      ? 'bg-[hsl(var(--nctr-accent))]/10 border-[hsl(var(--nctr-accent))]/30'
                      : isNext
                        ? 'bg-[hsl(var(--nctr-mid))]/10 border-[hsl(var(--nctr-accent))]/20'
                        : 'bg-[hsl(var(--nctr-mid))]/5 border-[hsl(var(--nctr-mid))]/10 opacity-60'
                  }`}
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      reached
                        ? 'bg-[hsl(var(--nctr-accent))] text-[hsl(var(--nctr-dark))]'
                        : 'bg-[hsl(var(--nctr-mid))]/20 text-[hsl(var(--nctr-light))]/50'
                    }`}
                  >
                    {reached ? '✓' : m.count}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.label}</p>
                    <p className="text-xs text-[hsl(var(--nctr-light))]/50">
                      Invite {m.count} friends
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      reached
                        ? 'text-[hsl(var(--nctr-accent))]'
                        : 'text-[hsl(var(--nctr-light))]/40'
                    }`}
                  >
                    +{m.reward.toLocaleString()} NCTR
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Social Share */}
        <section className="animate-fade-in [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[hsl(var(--nctr-accent))]" />
            Share Your Link
          </h2>
          <div className="flex flex-wrap gap-3">
            {['twitter', 'facebook', 'email'].map((p) => (
              <button
                key={p}
                onClick={() => handleShare(p)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-[hsl(var(--nctr-mid))]/15 border border-[hsl(var(--nctr-mid))]/20 hover:border-[hsl(var(--nctr-accent))]/40 hover:bg-[hsl(var(--nctr-accent))]/10 transition-all duration-200 capitalize"
              >
                {p}
                <ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </section>

        {/* Empty state */}
        {friendsInvited === 0 && (
          <div className="mt-12 text-center py-10 border border-dashed border-[hsl(var(--nctr-mid))]/20 rounded-2xl animate-fade-in">
            <Users className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--nctr-light))]/30" />
            <p className="text-[hsl(var(--nctr-light))]/50 text-sm">
              You haven't invited anyone yet. Share your link to get started!
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default ReferralRewardsPage;

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface Milestone {
  id: string;
  referral_count: number;
  nctr_reward: number;
  label: string;
}

export const MilestoneProgress = () => {
  const { user } = useAuth();
  const [referralCount, setReferralCount] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [{ count }, { data: milestonesData }] = await Promise.all([
        supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', user.id),
        supabase
          .from('referral_milestones')
          .select('*')
          .order('referral_count', { ascending: true }),
      ]);

      setReferralCount(count || 0);
      setMilestones(milestonesData || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading || !user || milestones.length === 0) return null;

  // Find next milestone
  const nextMilestone = milestones.find((m) => m.referral_count > referralCount);
  // Find last completed milestone
  const completedMilestones = milestones.filter((m) => m.referral_count <= referralCount);

  if (!nextMilestone) {
    // All milestones completed
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">🏆 All Milestones Reached!</p>
              <p className="text-xs text-muted-foreground">{referralCount} friends invited</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const prevCount = completedMilestones.length > 0
    ? completedMilestones[completedMilestones.length - 1].referral_count
    : 0;
  const progress = Math.min(
    100,
    ((referralCount - prevCount) / (nextMilestone.referral_count - prevCount)) * 100
  );
  const remaining = nextMilestone.referral_count - referralCount;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {remaining} more invite{remaining !== 1 ? 's' : ''} to earn {nextMilestone.nctr_reward.toLocaleString()} NCTR
            </p>
            <p className="text-xs text-muted-foreground">
              {referralCount} of {nextMilestone.referral_count} invites
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneProgress;

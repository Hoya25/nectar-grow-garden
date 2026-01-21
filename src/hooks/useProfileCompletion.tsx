import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface ProfileCompletionData {
  completion_score: number;
  completion_details: {
    full_name: boolean;
    username: boolean;
    email: boolean;
    avatar_url: boolean;
    wallet_connected: boolean;
  };
  is_complete: boolean;
  bonus_awarded: boolean;
  eligible_for_bonus: boolean;
}

interface PendingReferral {
  id: string;
  referrer_id: string;
  is_paid: boolean;
  created_at: string;
}

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [completionData, setCompletionData] = useState<ProfileCompletionData | null>(null);
  const [pendingReferral, setPendingReferral] = useState<PendingReferral | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCompletionStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_profile_completion', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching profile completion:', error);
        return;
      }

      setCompletionData(data as unknown as ProfileCompletionData);

      // Check for pending referral rewards
      const { data: referralData } = await supabase
        .from('referrals')
        .select('id, referrer_id, is_paid, created_at')
        .eq('referred_id', user.id)
        .eq('is_paid', false)
        .maybeSingle();

      setPendingReferral(referralData);
    } catch (error) {
      console.error('Error fetching profile completion:', error);
    } finally {
      setLoading(false);
    }
  };

  const awardBonus = async () => {
    if (!user || !completionData?.eligible_for_bonus) return;

    try {
      const { data, error } = await supabase.rpc('award_profile_completion_bonus', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error awarding bonus:', error);
        return;
      }

      const result = data as any;
      if (result.success) {
        toast({
          title: "Profile Complete! 🎉",
          description: `You've earned ${result.bonus_amount} NCTR for completing your profile!`,
        });
        
        // Refresh completion status
        await fetchCompletionStatus();
      }
    } catch (error) {
      console.error('Error awarding bonus:', error);
    }
  };

  useEffect(() => {
    fetchCompletionStatus();
  }, [user]);

  return {
    completionData,
    pendingReferral,
    loading,
    fetchCompletionStatus,
    awardBonus,
    isComplete: completionData?.is_complete || false,
    completionScore: completionData?.completion_score || 0,
    eligibleForBonus: completionData?.eligible_for_bonus || false,
  };
};
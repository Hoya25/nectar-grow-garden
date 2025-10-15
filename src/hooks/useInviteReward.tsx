import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useInviteReward = () => {
  const [inviteReward, setInviteReward] = useState<number>(500); // Default to 500
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInviteReward();
  }, []);

  const fetchInviteReward = async () => {
    try {
      const { data, error } = await supabase
        .from('earning_opportunities')
        .select('lock_360_nctr_reward')
        .eq('opportunity_type', 'invite')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.lock_360_nctr_reward) {
        setInviteReward(data.lock_360_nctr_reward);
      }
    } catch (error) {
      console.error('Error fetching invite reward:', error);
      // Keep default value on error
    } finally {
      setLoading(false);
    }
  };

  return { inviteReward, loading, refetch: fetchInviteReward };
};

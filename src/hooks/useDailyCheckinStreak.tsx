import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  streak_bonuses_earned: number;
  last_checkin_date: string | null;
}

interface StreakConfig {
  enabled: boolean;
  streak_requirement: number;
  bonus_nctr_amount: number;
  bonus_lock_type: string;
  streak_bonus_description: string;
}

export const useDailyCheckinStreak = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [streakConfig, setStreakConfig] = useState<StreakConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStreakData();
      fetchStreakConfig();
    }
  }, [user]);

  const fetchStreakData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_checkin_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching streak data:', error);
        return;
      }

      if (data) {
        setStreakData(data);
      } else {
        // No streak data yet - user hasn't checked in
        setStreakData({
          current_streak: 0,
          longest_streak: 0,
          total_checkins: 0,
          streak_bonuses_earned: 0,
          last_checkin_date: null
        });
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStreakConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'daily_checkin_streak_config')
        .single();

      if (error) throw error;
      if (data?.setting_value) {
        setStreakConfig(data.setting_value as unknown as StreakConfig);
      }
    } catch (error) {
      console.error('Error fetching streak config:', error);
    }
  };

  const getDaysUntilNextBonus = (): number => {
    if (!streakData || !streakConfig) return 0;
    const currentStreak = streakData.current_streak;
    const requirement = streakConfig.streak_requirement;
    const remainder = currentStreak % requirement;
    return remainder === 0 ? requirement : requirement - remainder;
  };

  const getStreakProgress = (): number => {
    if (!streakData || !streakConfig) return 0;
    const currentStreak = streakData.current_streak;
    const requirement = streakConfig.streak_requirement;
    const remainder = currentStreak % requirement;
    return (remainder / requirement) * 100;
  };

  return {
    streakData,
    streakConfig,
    loading,
    getDaysUntilNextBonus,
    getStreakProgress,
    refetch: fetchStreakData
  };
};

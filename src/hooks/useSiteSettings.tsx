import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NCTRDistributionSettings {
  tokens_per_second: number;
  current_total: number;
}

interface SiteStats {
  brand_partners: string;
}

interface SiteSettings {
  nctr_distribution_rate: NCTRDistributionSettings;
  site_stats: SiteStats;
}

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({
    nctr_distribution_rate: { tokens_per_second: 50, current_total: 2500000 },
    site_stats: { brand_partners: "5K+" }
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Error fetching site settings:', error);
        return;
      }

      if (data) {
        const settingsMap: any = {};
        data.forEach(setting => {
          settingsMap[setting.setting_key] = setting.setting_value;
        });
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, refetch: fetchSettings };
};
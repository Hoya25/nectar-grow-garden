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
  [key: string]: any; // Allow additional settings
}

export const useSiteSettings = (settingKeys?: string[]) => {
  const [settings, setSettings] = useState<SiteSettings>({
    nctr_distribution_rate: { tokens_per_second: 50, current_total: 2500000 },
    site_stats: { brand_partners: "5K+" }
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      let query = supabase.from('site_settings').select('setting_key, setting_value');
      
      if (settingKeys && settingKeys.length > 0) {
        query = query.in('setting_key', settingKeys);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching site settings:', error);
        return;
      }

      if (data) {
        const settingsMap: any = { ...settings }; // Keep defaults
        data.forEach(setting => {
          try {
            // Try to parse as JSON first, convert to string if needed
            const valueStr = typeof setting.setting_value === 'string' 
              ? setting.setting_value 
              : JSON.stringify(setting.setting_value);
            settingsMap[setting.setting_key] = JSON.parse(valueStr);
          } catch {
            // If not JSON, use as is
            settingsMap[setting.setting_key] = setting.setting_value;
          }
        });
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (key: string, defaultValue: any = '') => {
    return settings[key] || defaultValue;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { 
    settings, 
    loading, 
    getSetting,
    refetch: fetchSettings 
  };
};
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, RotateCcw } from 'lucide-react';

interface NCTRSettings {
  tokens_per_second: number;
  current_total: number;
}

interface SiteStats {
  brand_partners: string;
}

const SiteSettingsManagement = () => {
  const [nctrSettings, setNCTRSettings] = useState<NCTRSettings>({
    tokens_per_second: 50,
    current_total: 2500000
  });
  const [siteStats, setSiteStats] = useState<SiteStats>({
    brand_partners: "5K+"
  });
  const [treasuryAddress, setTreasuryAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: "Error",
          description: "Failed to load site settings",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        data.forEach(setting => {
          if (setting.setting_key === 'nctr_distribution_rate') {
            setNCTRSettings(setting.setting_value as unknown as NCTRSettings);
          } else if (setting.setting_key === 'site_stats') {
            setSiteStats(setting.setting_value as unknown as SiteStats);
          } else if (setting.setting_key === 'treasury_wallet_address') {
            setTreasuryAddress(String(setting.setting_value));
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load site settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    setSaving(true);
    try {
      // Update NCTR distribution settings
      const { error: nctrError } = await supabase
        .from('site_settings')
        .update({ 
          setting_value: nctrSettings as any,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'nctr_distribution_rate');

      if (nctrError) throw nctrError;

      // Update site stats
      const { error: statsError } = await supabase
        .from('site_settings')
        .update({ 
          setting_value: siteStats as any,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'site_stats');

      if (statsError) throw statsError;

      // Update treasury wallet address
      const { error: treasuryError } = await supabase
        .from('site_settings')
        .upsert({ 
          setting_key: 'treasury_wallet_address',
          setting_value: treasuryAddress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (treasuryError) throw treasuryError;

      toast({
        title: "Success",
        description: "Site settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update site settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            NCTR Distribution Ticker Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tokens-per-second">Tokens per Second</Label>
              <Input
                id="tokens-per-second"
                type="number"
                value={nctrSettings.tokens_per_second}
                onChange={(e) => setNCTRSettings(prev => ({
                  ...prev,
                  tokens_per_second: Number(e.target.value)
                }))}
                placeholder="50"
              />
              <p className="text-sm text-muted-foreground">
                How many NCTR tokens to add to the counter every second
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-total">Current Total Tokens</Label>
              <Input
                id="current-total"
                type="number"
                value={nctrSettings.current_total}
                onChange={(e) => setNCTRSettings(prev => ({
                  ...prev,
                  current_total: Number(e.target.value)
                }))}
                placeholder="2500000"
              />
              <p className="text-sm text-muted-foreground">
                The starting point for the ticker counter
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-partners">Brand Partners Display</Label>
            <Input
              id="brand-partners"
              type="text"
              value={siteStats.brand_partners}
              onChange={(e) => setSiteStats(prev => ({
                ...prev,
                brand_partners: e.target.value
              }))}
              placeholder="5K+"
            />
            <p className="text-sm text-muted-foreground">
              Text displayed for brand partners count (e.g., "5K+", "500+")
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treasury Wallet Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="treasury-address">Treasury Wallet Address (Base Network)</Label>
            <Input
              id="treasury-address"
              type="text"
              value={treasuryAddress}
              onChange={(e) => setTreasuryAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              Base network wallet address for receiving NCTR purchase payments via Coinbase Wallet
            </p>
            {treasuryAddress && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium">Current Address:</p>
                <p className="text-xs font-mono break-all">{treasuryAddress}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button 
          onClick={updateSettings} 
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
        
        <Button 
          variant="outline" 
          onClick={fetchSettings}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default SiteSettingsManagement;
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Flame, Save, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StreakConfig {
  enabled: boolean;
  streak_requirement: number;
  bonus_nctr_amount: number;
  bonus_lock_type: string;
  streak_bonus_description: string;
}

export const DailyCheckinStreakManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<StreakConfig>({
    enabled: true,
    streak_requirement: 7,
    bonus_nctr_amount: 50,
    bonus_lock_type: '360LOCK',
    streak_bonus_description: 'Check in for 7 days in a row to earn 50 NCTR in 360LOCK!'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'daily_checkin_streak_config')
        .single();

      if (error) throw error;
      if (data?.setting_value) {
        setConfig(data.setting_value as unknown as StreakConfig);
      }
    } catch (error) {
      console.error('Error fetching streak config:', error);
      toast({
        title: "Error",
        description: "Failed to load streak configuration",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          setting_value: config as unknown as Record<string, any>,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'daily_checkin_streak_config');

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Streak configuration updated successfully",
      });
    } catch (error) {
      console.error('Error saving streak config:', error);
      toast({
        title: "Error",
        description: "Failed to save streak configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <CardTitle>Daily Check-in Streak Bonuses</CardTitle>
        </div>
        <CardDescription>
          Configure streak rewards for consecutive daily check-ins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="streak-enabled" className="text-base font-medium">
              Enable Streak Bonuses
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow users to earn bonus NCTR for maintaining check-in streaks
            </p>
          </div>
          <Switch
            id="streak-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        {/* Streak Requirement */}
        <div className="space-y-2">
          <Label htmlFor="streak-requirement">
            Consecutive Days Required
          </Label>
          <Input
            id="streak-requirement"
            type="number"
            min="2"
            max="365"
            value={config.streak_requirement}
            onChange={(e) => setConfig({ ...config, streak_requirement: parseInt(e.target.value) || 7 })}
            placeholder="7"
          />
          <p className="text-sm text-muted-foreground">
            Number of consecutive check-ins needed to earn the bonus
          </p>
        </div>

        {/* Bonus NCTR Amount */}
        <div className="space-y-2">
          <Label htmlFor="bonus-amount">
            Bonus NCTR Amount
          </Label>
          <Input
            id="bonus-amount"
            type="number"
            min="1"
            step="1"
            value={config.bonus_nctr_amount}
            onChange={(e) => setConfig({ ...config, bonus_nctr_amount: parseFloat(e.target.value) || 50 })}
            placeholder="50"
          />
          <p className="text-sm text-muted-foreground">
            NCTR bonus awarded when streak requirement is met (will be multiplied by status level)
          </p>
        </div>

        {/* Lock Type */}
        <div className="space-y-2">
          <Label htmlFor="lock-type">
            Bonus Lock Type
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={config.bonus_lock_type === '90LOCK' ? 'default' : 'outline'}
              onClick={() => setConfig({ ...config, bonus_lock_type: '90LOCK' })}
            >
              90LOCK
            </Button>
            <Button
              type="button"
              variant={config.bonus_lock_type === '360LOCK' ? 'default' : 'outline'}
              onClick={() => setConfig({ ...config, bonus_lock_type: '360LOCK' })}
            >
              360LOCK
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Lock type for the streak bonus NCTR
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Streak Description (shown to users)
          </Label>
          <Input
            id="description"
            value={config.streak_bonus_description}
            onChange={(e) => setConfig({ ...config, streak_bonus_description: e.target.value })}
            placeholder="Check in for 7 days in a row to earn 50 NCTR in 360LOCK!"
          />
        </div>

        {/* Preview */}
        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Flame className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Streak Bonus Preview</p>
              <p className="text-sm text-muted-foreground">{config.streak_bonus_description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>
                  {config.streak_requirement} days → {config.bonus_nctr_amount} NCTR ({config.bonus_lock_type})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
};

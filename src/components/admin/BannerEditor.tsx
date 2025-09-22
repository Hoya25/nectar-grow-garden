import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw, Type } from 'lucide-react';

interface BannerContent {
  title: string;
  subtitle: string;
}

const BannerEditor = () => {
  const [bannerContent, setBannerContent] = useState<BannerContent>({
    title: '',
    subtitle: ''
  });
  const [originalContent, setOriginalContent] = useState<BannerContent>({
    title: '',
    subtitle: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBannerContent();
  }, []);

  const fetchBannerContent = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['earning_opportunities_banner_title', 'earning_opportunities_banner_subtitle']);

      if (error) throw error;

      const content = {
        title: 'Earning Opportunities',
        subtitle: 'Support NCTR Alliance partners and earn NCTR with every transaction'
      };

      data?.forEach(setting => {
        if (setting.setting_key === 'earning_opportunities_banner_title') {
          content.title = setting.setting_value as string;
        } else if (setting.setting_key === 'earning_opportunities_banner_subtitle') {
          content.subtitle = setting.setting_value as string;
        }
      });

      setBannerContent(content);
      setOriginalContent(content);
    } catch (error) {
      console.error('Error fetching banner content:', error);
      toast({
        title: "Error",
        description: "Failed to load banner content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBannerContent = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          setting_key: 'earning_opportunities_banner_title',
          setting_value: bannerContent.title,
          description: 'Main title for the earning opportunities section'
        },
        {
          setting_key: 'earning_opportunities_banner_subtitle', 
          setting_value: bannerContent.subtitle,
          description: 'Subtitle text for the earning opportunities section'
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      setOriginalContent(bannerContent);
      toast({
        title: "Success!",
        description: "Banner content updated successfully. Changes are live immediately.",
      });
    } catch (error) {
      console.error('Error saving banner content:', error);
      toast({
        title: "Error",
        description: "Failed to save banner content",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setBannerContent(originalContent);
    toast({
      title: "Changes Reset",
      description: "Banner content reverted to saved version",
    });
  };

  const hasChanges = bannerContent.title !== originalContent.title || 
                    bannerContent.subtitle !== originalContent.subtitle;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="w-5 h-5" />
          Earning Opportunities Banner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Edit the main banner content that appears at the top of the earning opportunities section.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Banner Title</Label>
          <Input
            id="title"
            value={bannerContent.title}
            onChange={(e) => setBannerContent(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter banner title..."
            className="font-medium"
          />
          <p className="text-xs text-muted-foreground">
            This appears as the main heading (large, bold text)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Banner Subtitle</Label>
          <Textarea
            id="subtitle" 
            value={bannerContent.subtitle}
            onChange={(e) => setBannerContent(prev => ({ ...prev, subtitle: e.target.value }))}
            placeholder="Enter banner subtitle..."
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This appears as descriptive text below the title
          </p>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-6 bg-muted/20">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Preview:</h4>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold nctr-glow">
              {bannerContent.title || 'Banner Title'}
            </h1>
            <p className="text-section-text/90 max-w-md mx-auto">
              {bannerContent.subtitle || 'Banner subtitle description text'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button 
            onClick={saveBannerContent} 
            disabled={saving || !hasChanges}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={resetChanges}
            disabled={!hasChanges}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {hasChanges && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            ⚠️ You have unsaved changes
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BannerEditor;
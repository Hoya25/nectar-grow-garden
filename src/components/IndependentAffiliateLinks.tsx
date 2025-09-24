import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, Link, Copy, BarChart3, Eye, Lock } from 'lucide-react';

interface IndependentAffiliateLink {
  id: string;
  original_affiliate_url: string;
  platform_name: string;
  description: string;
  click_count: number;
  conversion_count: number;
  total_commissions: number;
  created_at: string;
  is_active: boolean;
}

const IndependentAffiliateLinks = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<IndependentAffiliateLink[]>([]);

  useEffect(() => {
    if (user) {
      loadLinks();
    }
  }, [user]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('independent_affiliate_links')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading affiliate links:', error);
      toast({
        title: "Error",
        description: "Failed to load affiliate links",
        variant: "destructive",
      });
    }
  };

  const getTrackedUrl = (linkId: string) => {
    const supabaseUrl = 'https://rndivcsonsojgelzewkb.supabase.co';
    return `${supabaseUrl}/functions/v1/affiliate-redirect?id=${linkId}&action=redirect`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to view available affiliate links</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Available Affiliate Links
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Browse affiliate links curated by The Garden team. Click tracking and user identification is automatic.
          </p>
        </CardHeader>
      </Card>

      {/* Links List */}
      {links.length > 0 ? (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card key={link.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{link.platform_name}</h3>
                      <Badge variant={link.is_active ? "default" : "secondary"}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {link.description && (
                      <p className="text-sm text-muted-foreground mb-2">{link.description}</p>
                    )}
                    
                    {/* Stats */}
                    <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {link.click_count} clicks
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {link.conversion_count} conversions
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tracked URL Display */}
                <div className="bg-muted rounded-lg p-3 mb-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Your Tracked Link (share this one):
                  </Label>
                  <p className="text-sm font-mono break-all mt-1">
                    {getTrackedUrl(link.id)}
                  </p>
                </div>

                {/* Original URL Display */}
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Original Affiliate Link:
                  </Label>
                  <p className="text-sm font-mono break-all mt-1">
                    {link.original_affiliate_url}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getTrackedUrl(link.id), 'Tracked link')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Tracked Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getTrackedUrl(link.id), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Test Link
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(link.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-lg bg-muted flex items-center justify-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Affiliate Links Available</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                The Garden team hasn't added any affiliate links yet. Check back soon for curated affiliate opportunities that automatically track your referrals and reward you with NCTR.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="font-semibold text-primary">1.</span>
            <span>Garden admins curate quality affiliate partners</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary">2.</span>
            <span>Each link includes automatic user tracking parameters</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary">3.</span>
            <span>Share your tracked link - clicks are automatically recorded</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary">4.</span>
            <span>Report conversions to earn NCTR rewards</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndependentAffiliateLinks;
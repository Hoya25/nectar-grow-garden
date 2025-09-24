import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, Link, Copy, Loader2, Plus, BarChart3, Eye } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    originalUrl: '',
    platformName: '',
    description: ''
  });

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
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading affiliate links:', error);
      toast({
        title: "Error",
        description: "Failed to load your affiliate links",
        variant: "destructive",
      });
    }
  };

  const createTrackedLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-redirect', {
        body: {
          action: 'create',
          userId: user.id,
          originalUrl: formData.originalUrl,
          platformName: formData.platformName,
          description: formData.description || `${formData.platformName} affiliate link`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Affiliate Link Created",
          description: `Your tracked link for ${formData.platformName} is ready!`,
        });
        
        setFormData({ originalUrl: '', platformName: '', description: '' });
        setModalOpen(false);
        loadLinks();
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Error creating affiliate link:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create affiliate link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to create tracked affiliate links</p>
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
            Independent Affiliate Links
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add any affiliate link and we'll wrap it with user tracking. Works with Ledger, Amazon Associates, and any affiliate program.
          </p>
        </CardHeader>
        <CardContent>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add New Affiliate Link
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Independent Affiliate Link</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={createTrackedLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={formData.platformName}
                    onChange={(e) => setFormData({...formData, platformName: e.target.value})}
                    placeholder="e.g., Ledger, Amazon, Nike"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="originalUrl">Your Affiliate Link</Label>
                  <Input
                    id="originalUrl"
                    type="url"
                    value={formData.originalUrl}
                    onChange={(e) => setFormData({...formData, originalUrl: e.target.value})}
                    placeholder="https://shop.ledger.com/?r=4c47a8c09777"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your existing affiliate link from any platform
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Hardware wallet deals"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || !validateUrl(formData.originalUrl)}
                    className="flex-1"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Create Link
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
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
              <Link className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No Affiliate Links Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Add your existing affiliate links from any platform. We'll wrap them with user tracking so you can earn NCTR rewards.
              </p>
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Link
              </Button>
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
            <span>Paste any affiliate link (Ledger, Amazon, etc.)</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary">2.</span>
            <span>We create a tracked version that adds user parameters</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary">3.</span>
            <span>Share your tracked link - clicks are automatically recorded</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary">4.</span>
            <span>Report conversions manually to earn NCTR rewards</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndependentAffiliateLinks;
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { ExternalLink, Link, Copy, Loader2, Plus, BarChart3, Eye, Edit, Trash2 } from 'lucide-react';

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

const AffiliateLinksManagement = () => {
  const { user } = useAuth();
  const { isAdmin, logActivity } = useAdmin();
  const [links, setLinks] = useState<IndependentAffiliateLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<IndependentAffiliateLink | null>(null);
  const [formData, setFormData] = useState({
    originalUrl: '',
    platformName: '',
    description: ''
  });

  useEffect(() => {
    if (user && isAdmin) {
      loadLinks();
    }
  }, [user, isAdmin]);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('independent_affiliate_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out NoBull links
      const filteredLinks = (data || []).filter(link => 
        !link.platform_name.toLowerCase().includes('nobull') &&
        !link.original_affiliate_url.toLowerCase().includes('nobull')
      );
      
      setLinks(filteredLinks);
    } catch (error) {
      console.error('Error loading affiliate links:', error);
      toast({
        title: "Error",
        description: "Failed to load affiliate links",
        variant: "destructive",
      });
    }
  };

  const createTrackedLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

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
          description: `Tracked link for ${formData.platformName} created successfully!`,
        });
        
        await logActivity('created', 'affiliate_link', data.link_id, {
          platform_name: formData.platformName,
          original_url: formData.originalUrl
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

  const toggleLinkStatus = async (link: IndependentAffiliateLink) => {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('independent_affiliate_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);

      if (error) throw error;

      await logActivity(
        link.is_active ? 'deactivated' : 'activated',
        'affiliate_link',
        link.id,
        { platform_name: link.platform_name }
      );

      toast({
        title: `Link ${link.is_active ? 'Deactivated' : 'Activated'}`,
        description: `${link.platform_name} link has been ${link.is_active ? 'deactivated' : 'activated'}.`,
      });

      loadLinks();
    } catch (error) {
      console.error('Error toggling link status:', error);
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive",
      });
    }
  };

  const deleteLink = async (link: IndependentAffiliateLink) => {
    if (!isAdmin) return;
    
    if (!confirm(`Are you sure you want to delete the ${link.platform_name} affiliate link? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('independent_affiliate_links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;

      await logActivity('deleted', 'affiliate_link', link.id, {
        platform_name: link.platform_name
      });

      toast({
        title: "Link Deleted",
        description: `${link.platform_name} affiliate link has been deleted.`,
      });

      loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: "Error",
        description: "Failed to delete affiliate link",
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

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Affiliate Links Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage affiliate links available to all users
              </p>
            </div>
            
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Link
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Affiliate Link</DialogTitle>
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
                    <Label htmlFor="originalUrl">Affiliate URL</Label>
                    <Input
                      id="originalUrl"
                      type="url"
                      value={formData.originalUrl}
                      onChange={(e) => setFormData({...formData, originalUrl: e.target.value})}
                      placeholder="https://shop.ledger.com/?r=4c47a8c09777"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
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
          </div>
        </CardHeader>
      </Card>

      {/* Links List */}
      {links.length > 0 ? (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
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
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={link.is_active}
                      onCheckedChange={() => toggleLinkStatus(link)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteLink(link)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* URLs */}
                <div className="space-y-2 mb-3">
                  <div className="bg-muted rounded-lg p-3">
                    <Label className="text-xs font-medium text-muted-foreground">
                      User Tracked Link:
                    </Label>
                    <p className="text-sm font-mono break-all mt-1">
                      {getTrackedUrl(link.id)}
                    </p>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Original Affiliate URL:
                    </Label>
                    <p className="text-sm font-mono break-all mt-1">
                      {link.original_affiliate_url}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getTrackedUrl(link.id), 'Tracked link')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getTrackedUrl(link.id), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Test
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
              <h3 className="text-lg font-semibold">No Affiliate Links</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Add your first affiliate link to make it available to all users with automatic tracking.
              </p>
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AffiliateLinksManagement;
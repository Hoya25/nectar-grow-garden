import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Twitter, 
  Instagram, 
  FileText, 
  Edit, 
  Save,
  X,
  ExternalLink,
  Coins
} from 'lucide-react';

interface SocialOpportunity {
  id: string;
  title: string;
  description: string;
  nctr_reward: number;
  affiliate_link: string;
  is_active: boolean;
  partner_name: string;
}

const SocialMediaBountyManager = () => {
  const [opportunities, setOpportunities] = useState<SocialOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    affiliate_link: string;
    nctr_reward: number;
  }>({ affiliate_link: '', nctr_reward: 0 });

  useEffect(() => {
    fetchSocialOpportunities();
  }, []);

  const fetchSocialOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('earning_opportunities')
        .select('id, title, description, nctr_reward, affiliate_link, is_active, partner_name')
        .eq('opportunity_type', 'bonus')
        .in('title', [
          'Follow Us on X (Twitter)',
          'Follow Us on Instagram', 
          'Subscribe to Our Substack'
        ])
        .order('title');

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching social opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to load social media opportunities.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSocialIcon = (title: string) => {
    if (title.toLowerCase().includes('twitter') || title.toLowerCase().includes('x ')) {
      return Twitter;
    }
    if (title.toLowerCase().includes('instagram')) {
      return Instagram;
    }
    if (title.toLowerCase().includes('substack')) {
      return FileText;
    }
    return Coins;
  };

  const startEditing = (opportunity: SocialOpportunity) => {
    setEditingId(opportunity.id);
    setEditData({
      affiliate_link: opportunity.affiliate_link,
      nctr_reward: opportunity.nctr_reward
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({ affiliate_link: '', nctr_reward: 0 });
  };

  const saveChanges = async (opportunityId: string) => {
    try {
      const { error } = await supabase
        .from('earning_opportunities')
        .update({
          affiliate_link: editData.affiliate_link,
          nctr_reward: editData.nctr_reward
        })
        .eq('id', opportunityId);

      if (error) throw error;

      toast({
        title: "Updated Successfully",
        description: "Social media bounty has been updated.",
      });

      await fetchSocialOpportunities();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to update social media bounty.",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (opportunity: SocialOpportunity) => {
    try {
      const { error } = await supabase
        .from('earning_opportunities')
        .update({ is_active: !opportunity.is_active })
        .eq('id', opportunity.id);

      if (error) throw error;

      toast({
        title: `Bounty ${opportunity.is_active ? 'Deactivated' : 'Activated'}`,
        description: `${opportunity.title} bounty has been ${opportunity.is_active ? 'deactivated' : 'activated'}.`,
      });

      await fetchSocialOpportunities();
    } catch (error) {
      console.error('Error toggling opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to update bounty status.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading social media bounties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Social Media Bounty Manager
        </h3>
        <p className="text-sm text-muted-foreground">
          Update your social media accounts and NCTR rewards for one-time follow bounties
        </p>
      </div>

      {opportunities.length === 0 ? (
        <Card className="bg-section-highlight border border-section-border">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No social media bounties found. They should have been created automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opportunity) => {
            const Icon = getSocialIcon(opportunity.title);
            const isEditing = editingId === opportunity.id;

            return (
              <Card key={opportunity.id} className="bg-white border border-section-border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {opportunity.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {opportunity.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={opportunity.is_active ? "default" : "secondary"}
                        className={opportunity.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {opportunity.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch
                        checked={opportunity.is_active}
                        onCheckedChange={() => toggleActive(opportunity)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`link-${opportunity.id}`}>
                              Social Media URL
                            </Label>
                            <Input
                              id={`link-${opportunity.id}`}
                              value={editData.affiliate_link}
                              onChange={(e) => setEditData({
                                ...editData,
                                affiliate_link: e.target.value
                              })}
                              placeholder="https://..."
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`reward-${opportunity.id}`}>
                              NCTR Reward
                            </Label>
                            <Input
                              id={`reward-${opportunity.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={editData.nctr_reward}
                              onChange={(e) => setEditData({
                                ...editData,
                                nctr_reward: parseFloat(e.target.value) || 0
                              })}
                              className="w-full"
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => saveChanges(opportunity.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">URL:</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {opportunity.affiliate_link || 'Not set'}
                              </span>
                              {opportunity.affiliate_link && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.open(opportunity.affiliate_link, '_blank')}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">Reward:</span>
                            <Badge variant="outline" className="bg-primary/5 text-primary">
                              {opportunity.nctr_reward} NCTR
                            </Badge>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          onClick={() => startEditing(opportunity)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SocialMediaBountyManager;
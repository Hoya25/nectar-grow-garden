import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import BrandSearchInterface from './BrandSearchInterface';
import { 
  Plus, 
  Gift, 
  Edit, 
  Trash2, 
  Search,
  Users,
  ShoppingBag,
  Star,
  Loader2,
  ExternalLink,
  Video
} from 'lucide-react';

interface EarningOpportunity {
  id: string;
  title: string;
  description: string;
  opportunity_type: string;
  nctr_reward: number;
  reward_per_dollar: number;
  partner_name: string;
  partner_logo_url: string;
  affiliate_link: string;
  video_url?: string;
  video_title?: string;
  video_description?: string;
  is_active: boolean;
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  category?: string;
  website_url?: string;
  commission_rate?: number;
  nctr_per_dollar?: number;
  is_active: boolean;
  featured?: boolean;
}

interface OpportunityManagementProps {
  onStatsUpdate: () => void;
}

const OpportunityManagement = ({ onStatsUpdate }: OpportunityManagementProps) => {
  const { logActivity } = useAdmin();
  const [opportunities, setOpportunities] = useState<EarningOpportunity[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<EarningOpportunity | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    opportunity_type: 'shopping',
    nctr_reward: 0,
    reward_per_dollar: 100.0, // Default 100 NCTR per $1 spent
    partner_name: '',
    partner_logo_url: '',
    affiliate_link: '',
    video_url: '',
    video_title: '',
    video_description: '',
    is_active: true
  });

  useEffect(() => {
    fetchOpportunities();
    fetchBrands();
  }, []);

  // Debug logging for brands loading
  useEffect(() => {
    console.log(`=== BRAND LOADING DEBUG ===`);
    console.log(`Total brands loaded: ${brands.length}`);
    
    if (brands.length > 0) {
      // Test search for Uber brands
      const uberBrands = brands.filter(b => b.name.toLowerCase().includes('uber'));
      console.log(`Uber brands found: ${uberBrands.length}`);
      console.log('Uber brand names:', uberBrands.map(b => b.name));
      
      // Log first few brands for verification
      console.log('First 5 brands:', brands.slice(0, 5).map(b => ({ name: b.name, id: b.id })));
    }
    console.log(`=== END DEBUG ===`);
  }, [brands]);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('earning_opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to load opportunities.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      console.log('Fetching brands...');
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, logo_url, description, category, website_url, commission_rate, nctr_per_dollar, is_active, featured')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} brands successfully`);
      
      // Log some Uber brands for debugging
      const uberBrands = data?.filter(b => b.name.toLowerCase().includes('uber')) || [];
      console.log('Uber brands in fetched data:', uberBrands.map(b => ({ name: b.name, id: b.id })));
      
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]); // Ensure we set empty array on error
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (opp.partner_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (opp.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || opp.opportunity_type === filterType;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      opportunity_type: 'shopping',
      nctr_reward: 0,
      reward_per_dollar: 100.0,
      partner_name: '',
      partner_logo_url: '',
      affiliate_link: '',
      video_url: '',
      video_title: '',
      video_description: '',
      is_active: true
    });
    setEditingOpportunity(null);
    setSelectedBrand(null);
  };

  const handleEdit = (opportunity: EarningOpportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      description: opportunity.description || '',
      opportunity_type: opportunity.opportunity_type,
      nctr_reward: opportunity.nctr_reward || 0,
      reward_per_dollar: opportunity.reward_per_dollar || 0,
      partner_name: opportunity.partner_name || '',
      partner_logo_url: opportunity.partner_logo_url || '',
      affiliate_link: opportunity.affiliate_link || '',
      video_url: opportunity.video_url || '',
      video_title: opportunity.video_title || '',
      video_description: opportunity.video_description || '',
      is_active: opportunity.is_active
    });
    
    // Set selected brand if available
    if (opportunity.partner_name) {
      const brand = brands.find(b => b.name === opportunity.partner_name);
      setSelectedBrand(brand || null);
    }
    
    setModalOpen(true);
  };

  const fetchBrandDetails = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching brand details:', error);
      return null;
    }
  };

  const generateUserTrackingLink = (baseUrl: string, brandName: string) => {
    if (!baseUrl) return '';
    
    // Create a parameterized link that includes user tracking
    const url = new URL(baseUrl);
    url.searchParams.set('ref', 'nctr_platform');
    url.searchParams.set('source', brandName.toLowerCase().replace(/\s+/g, '_'));
    url.searchParams.set('user_id', '{{USER_ID}}'); // Placeholder for actual user ID
    url.searchParams.set('tracking_id', '{{TRACKING_ID}}'); // Placeholder for tracking ID
    
    return url.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOpportunity) {
        const { error } = await supabase
          .from('earning_opportunities')
          .update(formData)
          .eq('id', editingOpportunity.id);

        if (error) throw error;

        await logActivity('updated', 'opportunity', editingOpportunity.id, { 
          title: formData.title,
          changes: formData 
        });

        toast({
          title: "Opportunity Updated",
          description: `${formData.title} has been updated successfully.`,
        });
      } else {
        const { data, error } = await supabase
          .from('earning_opportunities')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;

        await logActivity('created', 'opportunity', data.id, { 
          title: formData.title 
        });

        toast({
          title: "Opportunity Created",
          description: `${formData.title} has been created successfully.`,
        });
      }

      fetchOpportunities();
      onStatsUpdate();
      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to save opportunity.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (opportunity: EarningOpportunity) => {
    if (!confirm(`Are you sure you want to delete "${opportunity.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('earning_opportunities')
        .delete()
        .eq('id', opportunity.id);

      if (error) throw error;

      await logActivity('deleted', 'opportunity', opportunity.id, { 
        title: opportunity.title 
      });

      toast({
        title: "Opportunity Deleted",
        description: `${opportunity.title} has been deleted.`,
      });

      fetchOpportunities();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to delete opportunity.",
        variant: "destructive",
      });
    }
  };

  const toggleOpportunityStatus = async (opportunity: EarningOpportunity) => {
    try {
      const { error } = await supabase
        .from('earning_opportunities')
        .update({ is_active: !opportunity.is_active })
        .eq('id', opportunity.id);

      if (error) throw error;

      await logActivity(
        opportunity.is_active ? 'deactivated' : 'activated', 
        'opportunity', 
        opportunity.id, 
        { title: opportunity.title }
      );

      toast({
        title: `Opportunity ${opportunity.is_active ? 'Deactivated' : 'Activated'}`,
        description: `${opportunity.title} has been ${opportunity.is_active ? 'deactivated' : 'activated'}.`,
      });

      fetchOpportunities();
      onStatsUpdate();
    } catch (error) {
      console.error('Error toggling opportunity status:', error);
      toast({
        title: "Error",
        description: "Failed to update opportunity status.",
        variant: "destructive",
      });
    }
  };

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case 'invite': return Users;
      case 'shopping': return ShoppingBag;
      case 'partner': return Star;
      default: return Gift;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Start Guide */}
      <Card className="bg-section-highlight border border-section-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Gift className="w-5 h-5" />
            Create New Opportunities
          </CardTitle>
          <p className="text-muted-foreground">
            Start here to create earning opportunities for your users
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              <span className="font-medium">Step 1:</span> Need brands? Use the "Find Brands" tab to search and add partners from Loyalize
            </p>
            <p className="text-sm text-foreground">
              <span className="font-medium">Step 2:</span> Create opportunities below and select from your added brands
            </p>
            <div className="flex gap-2 text-sm pt-2">
              <Badge variant="outline" className="bg-white">✅ {opportunities.filter(o => o.is_active).length} Active Opportunities</Badge>
              <Badge variant="outline" className="bg-white">🏢 {brands.length} Brands Ready</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Your Opportunities</h3>
          <p className="text-muted-foreground">Manage your earning opportunities</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="invite">Invite</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Opportunity
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl text-foreground">
                  {editingOpportunity ? 'Edit Opportunity' : 'Create New Opportunity'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Opportunity Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g., Nike Shopping Rewards"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="opportunity_type">Type *</Label>
                    <Select
                      value={formData.opportunity_type}
                      onValueChange={(value) => setFormData({...formData, opportunity_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shopping">Shopping Rewards</SelectItem>
                        <SelectItem value="invite">Invite Friends</SelectItem>
                        <SelectItem value="partner">Partner Bonus</SelectItem>
                        <SelectItem value="bonus">Special Bonus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe what users need to do to earn NCTR..."
                    rows={3}
                  />
                </div>

                {/* Brand Selection */}
                <div className="bg-section-highlight p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Brand Partner Selection
                  </h4>
                  
                  <BrandSearchInterface
                    onBrandSelect={(brand) => {
                      if (brand) {
                        setSelectedBrand(brand);
                        // Get brand details and generate tracking link
                        fetchBrandDetails(brand.id).then((brandDetails) => {
                          const trackingLink = generateUserTrackingLink(brandDetails?.website_url || '', brand.name);
                          
                          setFormData({
                            ...formData,
                            partner_name: brand.name,
                            partner_logo_url: brand.logo_url || '',
                            affiliate_link: trackingLink,
                            title: `Shop with ${brand.name}`,
                            description: brandDetails?.description || `Earn NCTR when you shop with ${brand.name}. Get rewarded for every purchase!`
                          });
                        });
                      } else {
                        setSelectedBrand(null);
                      }
                    }}
                    selectedBrand={selectedBrand}
                    showFullDetails={true}
                    placeholder="🔍 Search for partner brands and gift cards..."
                  />

                  {/* Manual Brand Entry */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partner_name">Brand Name</Label>
                      <Input
                        id="partner_name"
                        value={formData.partner_name}
                        onChange={(e) => setFormData({...formData, partner_name: e.target.value})}
                        placeholder="Enter brand name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="partner_logo_url">Brand Logo URL</Label>
                      <Input
                        id="partner_logo_url"
                        type="url"
                        value={formData.partner_logo_url}
                        onChange={(e) => setFormData({...formData, partner_logo_url: e.target.value})}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    💡 Tip: Use "Find Brands" tab to search and add new brands from Loyalize
                  </div>
                </div>

                {/* Rewards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reward_per_dollar">NCTR per Dollar Spent *</Label>
                    <Input
                      id="reward_per_dollar"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.reward_per_dollar}
                      onChange={(e) => setFormData({...formData, reward_per_dollar: parseFloat(e.target.value) || 100})}
                      placeholder="100.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: 100 NCTR per $1 spent (independent of brand commission rates)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nctr_reward">Sign-up Bonus NCTR</Label>
                    <Input
                      id="nctr_reward"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.nctr_reward}
                      onChange={(e) => setFormData({...formData, nctr_reward: parseFloat(e.target.value) || 0})}
                      placeholder="1000.00"
                    />
                  </div>
                </div>

                {/* Video Section */}
                <div className="bg-section-highlight p-4 rounded-lg space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Brand Video (Optional)
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Video URL</Label>
                      <Input
                        id="video_url"
                        type="url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                        placeholder="https://example.com/brand-video.mp4"
                      />
                      <div className="text-xs text-muted-foreground">
                        📹 Upload your video to a hosting service and paste the URL here
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="video_title">Video Title</Label>
                        <Input
                          id="video_title"
                          value={formData.video_title}
                          onChange={(e) => setFormData({...formData, video_title: e.target.value})}
                          placeholder="About Nike"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="video_description">Video Description</Label>
                        <Input
                          id="video_description"
                          value={formData.video_description}
                          onChange={(e) => setFormData({...formData, video_description: e.target.value})}
                          placeholder="Learn about Nike's innovation..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links & Activation */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="affiliate_link">Affiliate Link *</Label>
                    <Input
                      id="affiliate_link"
                      type="url"
                      value={formData.affiliate_link}
                      onChange={(e) => setFormData({...formData, affiliate_link: e.target.value})}
                      placeholder="https://partner-tracking-url.com/?user_id={{USER_ID}}"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      ✅ Auto-populated from selected brand with user tracking. {'{USER_ID}'} and {'{TRACKING_ID}'} will be replaced dynamically.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium">
                      Activate opportunity immediately
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-section-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingOpportunity ? 'Update' : 'Create'} Opportunity
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <Card className="bg-white border border-section-border text-center py-12">
          <CardContent>
            <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              {searchTerm || filterType !== 'all' ? 'No opportunities match your filters.' : 'No opportunities created yet.'}
            </h3>
            <p className="text-muted-foreground mb-4">Start by creating your first earning opportunity!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opportunity) => {
            const IconComponent = getOpportunityIcon(opportunity.opportunity_type);
            return (
              <Card key={opportunity.id} className="bg-white border border-section-border shadow-soft hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-section-highlight rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{opportunity.title}</h4>
                        <p className="text-sm text-muted-foreground">{opportunity.partner_name || 'No Partner'}</p>
                      </div>
                    </div>
                    <Badge variant={opportunity.is_active ? "default" : "secondary"} className="text-xs">
                      {opportunity.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {opportunity.nctr_reward > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sign-up Bonus:</span>
                        <span className="font-medium text-section-accent">{opportunity.nctr_reward} NCTR</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per Dollar:</span>
                      <span className="font-medium text-section-accent">{opportunity.reward_per_dollar} NCTR</span>
                    </div>
                    {opportunity.video_url && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Has Video:</span>
                        <Video className="w-4 h-4 text-section-accent" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(opportunity)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={opportunity.is_active ? "secondary" : "default"}
                      size="sm"
                      onClick={() => toggleOpportunityStatus(opportunity)}
                      className="flex-1 border-0"
                    >
                      {opportunity.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(opportunity)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default OpportunityManagement;
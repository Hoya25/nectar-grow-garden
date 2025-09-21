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
import { 
  Plus, 
  Gift, 
  Edit, 
  Trash2, 
  Search,
  Users,
  ShoppingBag,
  Star,
  Loader2
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
  is_active: boolean;
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string;
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    opportunity_type: 'shopping',
    nctr_reward: 0,
    reward_per_dollar: 0.01,
    partner_name: '',
    partner_logo_url: '',
    affiliate_link: '',
    is_active: true
  });

  useEffect(() => {
    fetchOpportunities();
    fetchBrands();
  }, []);

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
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.partner_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || opp.opportunity_type === filterType;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      opportunity_type: 'shopping',
      nctr_reward: 0,
      reward_per_dollar: 0.01,
      partner_name: '',
      partner_logo_url: '',
      affiliate_link: '',
      is_active: true
    });
    setEditingOpportunity(null);
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
      is_active: opportunity.is_active
    });
    setModalOpen(true);
  };

  const handleBrandSelect = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      setFormData({
        ...formData,
        partner_name: brand.name,
        partner_logo_url: brand.logo_url || ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOpportunity) {
        // Update existing opportunity
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
        // Create new opportunity
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
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">Opportunity Management</h3>
          <p className="text-muted-foreground">Create and manage earning opportunities for users</p>
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
                className="bg-gradient-hero hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingOpportunity ? 'Edit Opportunity' : 'Create New Opportunity'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                        <SelectItem value="shopping">Shopping</SelectItem>
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
                    placeholder="Describe this earning opportunity..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Brand Partner (Optional)</Label>
                  <Select onValueChange={handleBrandSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose from existing brands..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partner_name">Partner Name</Label>
                    <Input
                      id="partner_name"
                      value={formData.partner_name}
                      onChange={(e) => setFormData({...formData, partner_name: e.target.value})}
                      placeholder="Brand or partner name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="partner_logo_url">Partner Logo URL</Label>
                    <Input
                      id="partner_logo_url"
                      type="url"
                      value={formData.partner_logo_url}
                      onChange={(e) => setFormData({...formData, partner_logo_url: e.target.value})}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nctr_reward">Fixed NCTR Reward</Label>
                    <Input
                      id="nctr_reward"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.nctr_reward}
                      onChange={(e) => setFormData({...formData, nctr_reward: parseFloat(e.target.value) || 0})}
                      placeholder="One-time reward amount"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reward_per_dollar">NCTR per Dollar</Label>
                    <Input
                      id="reward_per_dollar"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.reward_per_dollar}
                      onChange={(e) => setFormData({...formData, reward_per_dollar: parseFloat(e.target.value) || 0})}
                      placeholder="Reward rate for purchases"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="affiliate_link">Affiliate Link</Label>
                  <Input
                    id="affiliate_link"
                    type="url"
                    value={formData.affiliate_link}
                    onChange={(e) => setFormData({...formData, affiliate_link: e.target.value})}
                    placeholder="https://partner.com/affiliate/..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Active</Label>
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
                    disabled={loading}
                    className="flex-1 bg-gradient-hero hover:opacity-90"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingOpportunity ? 'Update Opportunity' : 'Create Opportunity'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' ? 'No opportunities match your filters.' : 'No opportunities created yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opportunity) => {
            const IconComponent = getOpportunityIcon(opportunity.opportunity_type);
            return (
              <Card key={opportunity.id} className="bg-card/80 backdrop-blur-sm hover:shadow-glow transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className="w-4 h-4" />
                        <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <Badge variant={opportunity.is_active ? 'default' : 'secondary'}>
                          {opportunity.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          {opportunity.opportunity_type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    {opportunity.partner_logo_url && (
                      <img 
                        src={opportunity.partner_logo_url} 
                        alt={opportunity.partner_name}
                        className="w-10 h-10 object-contain rounded"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {opportunity.description || 'No description available.'}
                  </p>
                  
                  {opportunity.partner_name && (
                    <p className="text-sm font-medium mb-2">Partner: {opportunity.partner_name}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    {opportunity.nctr_reward > 0 && (
                      <div>
                        <span className="text-muted-foreground">Fixed Reward:</span>
                        <p className="font-medium text-primary">{opportunity.nctr_reward} NCTR</p>
                      </div>
                    )}
                    {opportunity.reward_per_dollar > 0 && (
                      <div>
                        <span className="text-muted-foreground">Rate:</span>
                        <p className="font-medium text-primary">{opportunity.reward_per_dollar} NCTR/$1</p>
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
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleOpportunityStatus(opportunity)}
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
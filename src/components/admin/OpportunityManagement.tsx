import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Search, Filter, Gift, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import BrandSearchInterface from './BrandSearchInterface';

interface EarningOpportunity {
  id?: string;
  title: string;
  description: string;
  opportunity_type: string;
  affiliate_link: string;
  partner_id?: string;
  partner_name?: string;
  is_active: boolean;
  category?: string;
  tracking_link?: string;
  available_nctr_reward?: number;
  lock_90_nctr_reward?: number;
  lock_360_nctr_reward?: number;
  reward_distribution_type?: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
  is_active: boolean;
}

interface OpportunityManagementProps {
  onStatsUpdate?: () => void;
}

const OpportunityManagement = ({ onStatsUpdate }: OpportunityManagementProps) => {
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<EarningOpportunity[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<EarningOpportunity | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<EarningOpportunity>({
    title: '',
    description: '',
    opportunity_type: '',
    affiliate_link: '',
    partner_id: '',
    partner_name: '',
    is_active: true,
    category: '',
    tracking_link: '',
    available_nctr_reward: 0,
    lock_90_nctr_reward: 0,
    lock_360_nctr_reward: 0,
    reward_distribution_type: 'available'
  });

  useEffect(() => {
    fetchOpportunities();
    fetchBrands();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
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
        description: "Failed to fetch opportunities",
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
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      opportunity_type: '',
      affiliate_link: '',
      partner_id: '',
      partner_name: '',
      is_active: true,
      category: '',
      tracking_link: '',
      available_nctr_reward: 0,
      lock_90_nctr_reward: 0,
      lock_360_nctr_reward: 0,
      reward_distribution_type: 'available'
    });
    setEditingOpportunity(null);
    setSelectedBrand(null);
  };

  const handleEdit = (opportunity: EarningOpportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title || '',
      description: opportunity.description || '',
      opportunity_type: opportunity.opportunity_type || '',
      affiliate_link: opportunity.affiliate_link || '',
      partner_id: opportunity.partner_id || '',
      partner_name: opportunity.partner_name || '',
      is_active: opportunity.is_active,
      category: opportunity.category || '',
      tracking_link: opportunity.tracking_link || '',
      available_nctr_reward: opportunity.available_nctr_reward || 0,
      lock_90_nctr_reward: opportunity.lock_90_nctr_reward || 0,
      lock_360_nctr_reward: opportunity.lock_360_nctr_reward || 0,
      reward_distribution_type: opportunity.reward_distribution_type || 'available'
    });
    
    // Set selected brand if available
    if (opportunity.partner_id) {
      const brand = brands.find(b => b.id === opportunity.partner_id);
      if (brand) setSelectedBrand(brand);
    }
    
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const opportunityData = {
        ...formData,
        partner_id: selectedBrand?.id || null,
        partner_name: selectedBrand?.name || formData.partner_name || null,
      };

      let result;
      if (editingOpportunity) {
        result = await supabase
          .from('earning_opportunities')
          .update(opportunityData)
          .eq('id', editingOpportunity.id);
      } else {
        result = await supabase
          .from('earning_opportunities')
          .insert([opportunityData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Opportunity ${editingOpportunity ? 'updated' : 'created'} successfully`,
      });

      setModalOpen(false);
      resetForm();
      fetchOpportunities();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to save opportunity",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const { error } = await supabase
        .from('earning_opportunities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity deleted successfully",
      });

      fetchOpportunities();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to delete opportunity",
        variant: "destructive",
      });
    }
  };

  const toggleOpportunityStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('earning_opportunities')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Opportunity ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      fetchOpportunities();
      onStatsUpdate?.();
    } catch (error) {
      console.error('Error toggling opportunity status:', error);
      toast({
        title: "Error",
        description: "Failed to toggle opportunity status",
        variant: "destructive",
      });
    }
  };

  const generateTrackingLink = (affiliateLink: string, userId?: string) => {
    try {
      const url = new URL(affiliateLink);
      if (userId) {
        url.searchParams.set('user_id', userId);
      }
      url.searchParams.set('source', 'nctr_garden');
      return url.toString();
    } catch {
      return affiliateLink;
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.partner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || opportunity.opportunity_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Opportunity Management</h2>
          <p className="text-muted-foreground">Create and manage earning opportunities for users</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Opportunity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOpportunity ? 'Edit' : 'Create'} Earning Opportunity
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="rewards">Rewards & Distribution</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Shop at Amazon"
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
                          <SelectValue placeholder="Select opportunity type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shopping">🛒 Shopping</SelectItem>
                          <SelectItem value="signup">📝 Sign Up</SelectItem>
                          <SelectItem value="trial">🎯 Free Trial</SelectItem>
                          <SelectItem value="survey">📊 Survey</SelectItem>
                          <SelectItem value="daily_checkin">✅ Daily Check-in Bonus</SelectItem>
                          <SelectItem value="social">👥 Social Media</SelectItem>
                          <SelectItem value="other">🔧 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe the opportunity and how users can earn NCTR"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="affiliate_link">Affiliate Link *</Label>
                    <Input
                      id="affiliate_link"
                      type="url"
                      value={formData.affiliate_link}
                      onChange={(e) => setFormData({...formData, affiliate_link: e.target.value})}
                      placeholder="https://partner.com/affiliate-link"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Partner Brand (Optional)</Label>
                    <BrandSearchInterface
                      brands={brands}
                      selectedBrand={selectedBrand}
                      onBrandSelect={setSelectedBrand}
                      onBrandClear={() => setSelectedBrand(null)}
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
                </TabsContent>

                <TabsContent value="rewards" className="space-y-6">
                  {formData.opportunity_type === 'daily_checkin' ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2">⚠️ Important: Admin-Only Configuration</h5>
                        <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                          <p><strong>Only the amounts you specify below will be distributed</strong></p>
                          <p><strong>The total shown is exactly what users receive (before status multipliers)</strong></p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="daily_reward_distribution_type" className="text-base font-semibold">Reward Distribution</Label>
                        <Select
                          value={formData.reward_distribution_type}
                          onValueChange={(value) => {
                            setFormData({...formData, reward_distribution_type: value});
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select distribution type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">🟢 Available Balance Only</SelectItem>
                            <SelectItem value="lock_90">🟠 90LOCK Only</SelectItem>
                            <SelectItem value="lock_360">🔵 360LOCK Only</SelectItem>
                            <SelectItem value="combined">🎯 Multi-Tier Distribution</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Available Only */}
                      {formData.reward_distribution_type === 'available' && (
                        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                          <h5 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Available Balance Reward</h5>
                          <div className="space-y-2">
                            <Label htmlFor="daily_available_nctr_reward">Daily NCTR Amount (Available Balance)</Label>
                            <Input
                              id="daily_available_nctr_reward"
                              type="number"
                              step="1"
                              min="0"
                              value={formData.available_nctr_reward}
                              onChange={(e) => setFormData({...formData, available_nctr_reward: parseInt(e.target.value) || 0})}
                              placeholder="50"
                            />
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Goes directly to user's available NCTR balance
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 90LOCK Only */}
                      {formData.reward_distribution_type === 'lock_90' && (
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                          <h5 className="font-medium mb-3 text-gray-700 dark:text-gray-300">90LOCK Reward</h5>
                          <div className="space-y-2">
                            <Label htmlFor="daily_lock_90_nctr_reward">Daily NCTR Amount (90LOCK)</Label>
                            <Input
                              id="daily_lock_90_nctr_reward"
                              type="number"
                              step="1"
                              min="0"
                              value={formData.lock_90_nctr_reward}
                              onChange={(e) => setFormData({...formData, lock_90_nctr_reward: parseInt(e.target.value) || 0})}
                              placeholder="50"
                            />
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Locked for 90 days, can be upgraded to 360LOCK
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 360LOCK Only */}
                      {formData.reward_distribution_type === 'lock_360' && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h5 className="font-medium mb-3 text-gray-700 dark:text-gray-300">360LOCK Reward</h5>
                          <div className="space-y-2">
                            <Label htmlFor="daily_lock_360_nctr_reward">Daily NCTR Amount (360LOCK)</Label>
                            <Input
                              id="daily_lock_360_nctr_reward"
                              type="number"
                              step="1"
                              min="0"
                              value={formData.lock_360_nctr_reward}
                              onChange={(e) => setFormData({...formData, lock_360_nctr_reward: parseInt(e.target.value) || 0})}
                              placeholder="50"
                            />
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Locked for 360 days, contributes to alliance status
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Multi-Tier for Daily Check-in */}
                      {formData.reward_distribution_type === 'combined' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                              <Label className="text-sm font-medium text-green-800 dark:text-green-300">Available Balance</Label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className="mt-2"
                                value={formData.available_nctr_reward}
                                onChange={(e) => setFormData({...formData, available_nctr_reward: parseInt(e.target.value) || 0})}
                                placeholder="25"
                              />
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                              <Label className="text-sm font-medium text-orange-800 dark:text-orange-300">90LOCK</Label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className="mt-2"
                                value={formData.lock_90_nctr_reward}
                                onChange={(e) => setFormData({...formData, lock_90_nctr_reward: parseInt(e.target.value) || 0})}
                                placeholder="25"
                              />
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                              <Label className="text-sm font-medium text-blue-800 dark:text-blue-300">360LOCK</Label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                className="mt-2"
                                value={formData.lock_360_nctr_reward}
                                onChange={(e) => setFormData({...formData, lock_360_nctr_reward: parseInt(e.target.value) || 0})}
                                placeholder="25"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Total Daily Reward Display */}
                      {(formData.available_nctr_reward > 0 || formData.lock_90_nctr_reward > 0 || formData.lock_360_nctr_reward > 0) && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                          <h5 className="font-bold text-lg text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                            <Gift className="w-5 h-5" />
                            Daily Reward Total
                          </h5>
                          <div className="text-2xl font-bold text-purple-800 dark:text-purple-300 mb-3">
                            {(formData.available_nctr_reward || 0) + (formData.lock_90_nctr_reward || 0) + (formData.lock_360_nctr_reward || 0)} NCTR/day
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {(formData.available_nctr_reward || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {formData.available_nctr_reward} Available
                              </span>
                            )}
                            {(formData.lock_90_nctr_reward || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                {formData.lock_90_nctr_reward} 90LOCK
                              </span>
                            )}
                            {(formData.lock_360_nctr_reward || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                {formData.lock_360_nctr_reward} 360LOCK
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                            * Final amount may vary based on user status multipliers
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Reward configuration is currently only available for Daily Check-in opportunities.</p>
                      <p>Other opportunity types use default reward mechanisms.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingOpportunity ? 'Update' : 'Create'} Opportunity
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px] pl-10">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="signup">Sign Up</SelectItem>
              <SelectItem value="trial">Free Trial</SelectItem>
              <SelectItem value="survey">Survey</SelectItem>
              <SelectItem value="daily_checkin">Daily Check-in</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterType !== 'all' ? 'No opportunities match your filters' : 'No opportunities created yet'}
          </p>
          <Button onClick={() => {resetForm(); setModalOpen(true);}}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Opportunity
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{opportunity.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={opportunity.is_active ? "default" : "secondary"}>
                        {opportunity.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{opportunity.opportunity_type}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {opportunity.description}
                </p>

                {opportunity.partner_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Partner:</span>
                    <span className="text-xs text-muted-foreground">{opportunity.partner_name}</span>
                  </div>
                )}

                {/* Reward Display */}
                <div className="space-y-2">
                  <span className="text-xs font-medium">Rewards:</span>
                  
                  {opportunity.opportunity_type === 'daily_checkin' ? (
                    <div className="space-y-2">
                      {((opportunity.available_nctr_reward || 0) > 0 || (opportunity.lock_90_nctr_reward || 0) > 0 || (opportunity.lock_360_nctr_reward || 0) > 0) ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-primary">
                            Daily: {
                              (() => {
                                const total = (opportunity.available_nctr_reward || 0) + 
                                            (opportunity.lock_90_nctr_reward || 0) + 
                                            (opportunity.lock_360_nctr_reward || 0);
                                return total;
                              })()
                            } NCTR
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(opportunity.available_nctr_reward || 0) > 0 && (
                              <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                                {opportunity.available_nctr_reward} Available
                              </Badge>
                            )}
                            {(opportunity.lock_90_nctr_reward || 0) > 0 && (
                              <Badge className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100">
                                {opportunity.lock_90_nctr_reward} 90LOCK
                              </Badge>
                            )}
                            {(opportunity.lock_360_nctr_reward || 0) > 0 && (
                              <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100">
                                {opportunity.lock_360_nctr_reward} 360LOCK
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No rewards configured</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Uses default reward mechanism
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(opportunity)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOpportunityStatus(opportunity.id!, opportunity.is_active)}
                      className="h-8 w-8 p-0"
                    >
                      <Switch checked={opportunity.is_active} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(opportunity.id!)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(generateTrackingLink(opportunity.affiliate_link), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpportunityManagement;

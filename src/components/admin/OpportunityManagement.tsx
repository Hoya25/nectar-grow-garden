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
  // New reward structure fields
  available_nctr_reward?: number;
  lock_90_nctr_reward?: number;
  lock_360_nctr_reward?: number;
  reward_distribution_type?: string;
  reward_structure?: any;
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
    reward_per_dollar: 100, // Default 100 NCTR per $1 spent
    partner_name: '',
    partner_logo_url: '',
    affiliate_link: '',
    video_url: '',
    video_title: '',
    video_description: '',
    is_active: true,
    // New reward structure fields
    available_nctr_reward: 0,
    lock_90_nctr_reward: 0,
    lock_360_nctr_reward: 0,
    reward_distribution_type: 'legacy'
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
      reward_per_dollar: 100,
      partner_name: '',
      partner_logo_url: '',
      affiliate_link: '',
      video_url: '',
      video_title: '',
      video_description: '',
      is_active: true,
      // New reward structure fields
      available_nctr_reward: 0,
      lock_90_nctr_reward: 0,
      lock_360_nctr_reward: 0,
      reward_distribution_type: 'legacy'
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
      is_active: opportunity.is_active,
      // New reward structure fields
      available_nctr_reward: opportunity.available_nctr_reward || 0,
      lock_90_nctr_reward: opportunity.lock_90_nctr_reward || 0,
      lock_360_nctr_reward: opportunity.lock_360_nctr_reward || 0,
      reward_distribution_type: opportunity.reward_distribution_type || 'legacy'
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
              <SelectItem value="daily_checkin">Daily Check-in</SelectItem>
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
                      placeholder="e.g., Daily Check-in Bonus"
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
                        <SelectItem value="daily_checkin">Daily Check-in Bonus</SelectItem>
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

                {/* Brand Selection - Only for non-daily-checkin opportunities */}
                {formData.opportunity_type !== 'daily_checkin' && (
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
                )}

                {/* Daily Check-in Specific Configuration */}
                {formData.opportunity_type === 'daily_checkin' && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6 rounded-lg border-2 border-green-300 dark:border-green-700 space-y-4">
                    <div className="flex items-center gap-3">
                      <Gift className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-lg text-green-800 dark:text-green-300">Daily Check-in Reward Configuration</h4>
                    </div>
                    
                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2">⚠️ Important: Admin-Only Configuration</h5>
                      <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                        <p><strong>Only the amounts you specify below will be distributed</strong></p>
                        <p><strong>No legacy or hardcoded amounts will be added</strong></p>
                        <p><strong>The total shown is exactly what users receive (before status multipliers)</strong></p>
                      </div>
                    </div>

                    {/* Distribution Strategy for Daily Check-in */}
                    <div className="space-y-3">
                      <Label htmlFor="daily_reward_distribution_type" className="text-base font-semibold">Reward Distribution</Label>
                      <Select
                        value={formData.reward_distribution_type}
                        onValueChange={(value) => {
                          setFormData({...formData, reward_distribution_type: value});
                          // Reset reward fields when changing type
                          if (value === 'legacy') {
                            setFormData(prev => ({
                              ...prev,
                              available_nctr_reward: 0,
                              lock_90_nctr_reward: 0,
                              lock_360_nctr_reward: 0,
                              nctr_reward: 50, // Default for legacy
                              reward_distribution_type: value
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              nctr_reward: 0,
                              reward_distribution_type: value
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">🟢 Available Balance Only</SelectItem>
                          <SelectItem value="lock_90">🟠 90LOCK Only</SelectItem>
                          <SelectItem value="lock_360">🔵 360LOCK Only</SelectItem>
                          <SelectItem value="combined">🎯 Multi-Tier Distribution</SelectItem>
                          <SelectItem value="legacy">🔄 Legacy (Available Balance)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Available Only */}
                    {formData.reward_distribution_type === 'available' && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <h5 className="font-semibold text-green-800 dark:text-green-300">Daily Available Balance Reward</h5>
                        </div>
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
                          <p className="text-xs text-green-600 dark:text-green-400">This exact amount goes to user's available balance daily</p>
                        </div>
                      </div>
                    )}

                    {/* 90LOCK Only */}
                    {formData.reward_distribution_type === 'lock_90' && (
                      <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                          <h5 className="font-semibold text-orange-800 dark:text-orange-300">Daily 90LOCK Reward</h5>
                        </div>
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
                          <p className="text-xs text-orange-600 dark:text-orange-400">This exact amount is locked in 90LOCK daily</p>
                        </div>
                      </div>
                    )}

                    {/* 360LOCK Only */}
                    {formData.reward_distribution_type === 'lock_360' && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          <h5 className="font-semibold text-blue-800 dark:text-blue-300">Daily 360LOCK Reward</h5>
                        </div>
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
                          <p className="text-xs text-blue-600 dark:text-blue-400">This exact amount is locked in 360LOCK daily</p>
                        </div>
                      </div>
                    )}

                    {/* Multi-Tier for Daily Check-in */}
                    {formData.reward_distribution_type === 'combined' && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-green-50 via-orange-50 to-blue-50 dark:from-green-950/20 dark:via-orange-950/20 dark:to-blue-950/20 p-4 rounded-lg border border-primary/30">
                          <h5 className="font-semibold mb-2 text-primary">🎯 Multi-Tier Daily Reward</h5>
                          <p className="text-sm text-muted-foreground">
                            Set daily amounts for each NCTR type. Only the amounts you specify will be distributed.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Available Balance */}
                          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <Label className="font-medium text-green-800 dark:text-green-300">Available</Label>
                            </div>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={formData.available_nctr_reward}
                              onChange={(e) => setFormData({...formData, available_nctr_reward: parseInt(e.target.value) || 0})}
                              placeholder="20"
                              className="mb-2"
                            />
                            <p className="text-xs text-green-600 dark:text-green-400">Usable immediately</p>
                          </div>
                          
                          {/* 90LOCK */}
                          <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <Label className="font-medium text-orange-800 dark:text-orange-300">90LOCK</Label>
                            </div>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={formData.lock_90_nctr_reward}
                              onChange={(e) => setFormData({...formData, lock_90_nctr_reward: parseInt(e.target.value) || 0})}
                              placeholder="15"
                              className="mb-2"
                            />
                            <p className="text-xs text-orange-600 dark:text-orange-400">90-day lock</p>
                          </div>
                          
                          {/* 360LOCK */}
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <Label className="font-medium text-blue-800 dark:text-blue-300">360LOCK</Label>
                            </div>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={formData.lock_360_nctr_reward}
                              onChange={(e) => setFormData({...formData, lock_360_nctr_reward: parseInt(e.target.value) || 0})}
                              placeholder="15"
                              className="mb-2"
                            />
                            <p className="text-xs text-blue-600 dark:text-blue-400">360-day premium lock</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Legacy for Daily Check-in */}
                    {formData.reward_distribution_type === 'legacy' && (
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h5 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Legacy Daily Reward</h5>
                        <div className="space-y-2">
                          <Label htmlFor="daily_legacy_nctr_reward">Daily NCTR Amount (Available Balance)</Label>
                          <Input
                            id="daily_legacy_nctr_reward"
                            type="number"
                            step="1"
                            min="0"
                            value={formData.nctr_reward}
                            onChange={(e) => setFormData({...formData, nctr_reward: parseInt(e.target.value) || 0})}
                            placeholder="50"
                          />
                          <p className="text-xs text-gray-600 dark:text-gray-400">Goes to available balance daily</p>
                        </div>
                      </div>
                    )}

                    {/* Total Daily Reward Display */}
                    {(formData.available_nctr_reward > 0 || formData.lock_90_nctr_reward > 0 || formData.lock_360_nctr_reward > 0 || formData.nctr_reward > 0) && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                        <h5 className="font-bold text-lg text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                          <Gift className="w-5 h-5" />
                          Daily Reward Total
                        </h5>
                        <div className="text-2xl font-bold text-purple-800 dark:text-purple-300 mb-3">
                          {(formData.available_nctr_reward || 0) + (formData.lock_90_nctr_reward || 0) + (formData.lock_360_nctr_reward || 0) + (formData.nctr_reward || 0)} NCTR/day
                        </div>
                        
                        {/* Breakdown */}
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
                          {(formData.nctr_reward || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                              {formData.nctr_reward} Legacy
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                          * Final amount may vary based on user status multipliers
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Links & Activation */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="affiliate_link">
                      Affiliate Link {formData.opportunity_type === 'daily_checkin' ? '(Not required for Daily Check-in)' : formData.opportunity_type !== 'bonus' ? '*' : '(Optional for Bonus Opportunities)'}
                    </Label>
                    <Input
                      id="affiliate_link"
                      type="url"
                      value={formData.affiliate_link}
                      onChange={(e) => setFormData({...formData, affiliate_link: e.target.value})}
                      placeholder="https://partner-tracking-url.com/?user_id={{USER_ID}}"
                      required={formData.opportunity_type !== 'bonus' && formData.opportunity_type !== 'daily_checkin'}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.opportunity_type === 'daily_checkin' 
                        ? '💡 Daily check-in is handled automatically and doesn\'t require external links.'
                        : formData.opportunity_type === 'bonus' 
                          ? '💡 Bonus opportunities typically don\'t require external links - they\'re internal rewards like daily check-ins or profile completion.'
                          : '✅ Auto-populated from selected brand with user tracking. {USER_ID} and {TRACKING_ID} will be replaced dynamically.'
                      }
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

                  <div className="space-y-3 mb-4">
                    {/* Total NCTR Bounty Display */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-800 dark:text-purple-300">Total NCTR Bounty</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-purple-800 dark:text-purple-300">
                            {(() => {
                              const total = (opportunity.available_nctr_reward || 0) + 
                                          (opportunity.lock_90_nctr_reward || 0) + 
                                          (opportunity.lock_360_nctr_reward || 0) + 
                                          (opportunity.nctr_reward || 0);
                              return total > 0 ? `${total} NCTR` : 'No bounty set';
                            })()}
                            {opportunity.opportunity_type === 'daily_checkin' && '/day'}
                          </div>
                          {opportunity.reward_per_dollar > 0 && (
                            <div className="text-sm text-purple-600 dark:text-purple-400">
                              +{opportunity.reward_per_dollar} NCTR per $1
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    {(opportunity.available_nctr_reward > 0 || opportunity.lock_90_nctr_reward > 0 || opportunity.lock_360_nctr_reward > 0) && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bounty Breakdown</div>
                        <div className="flex flex-wrap gap-1">
                          {opportunity.available_nctr_reward > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {opportunity.available_nctr_reward} Available
                            </span>
                          )}
                          {opportunity.lock_90_nctr_reward > 0 && (
                            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              {opportunity.lock_90_nctr_reward} 90LOCK
                            </span>
                          )}
                          {opportunity.lock_360_nctr_reward > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {opportunity.lock_360_nctr_reward} 360LOCK
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(opportunity)}
                        className="text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOpportunityStatus(opportunity)}
                        className="text-xs"
                      >
                        {opportunity.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(opportunity)}
                      className="text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
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

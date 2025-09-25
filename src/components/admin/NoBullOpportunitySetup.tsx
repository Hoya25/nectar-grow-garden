import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  Plus, 
  ExternalLink, 
  Loader2, 
  ShoppingBag,
  Star,
  Settings,
  RefreshCw
} from 'lucide-react';

interface NoBullData {
  brand_id?: string;
  loyalize_id?: string;
  name: string;
  description: string;
  logo_url: string;
  commission_rate: number;
  nctr_per_dollar: number;
  category: string;
  website_url: string;
  affiliate_link?: string;
}

interface OpportunityFormData {
  title: string;
  description: string;
  opportunity_type: string;
  partner_name: string;
  partner_logo_url: string;
  affiliate_link: string;
  reward_per_dollar: number;
  lock_90_nctr_reward: number;
  reward_distribution_type: string;
  min_status: string;
  featured: boolean;
  is_active: boolean;
  cta_text: string;
  display_order: number;
}

const NoBullOpportunitySetup = () => {
  const [loading, setLoading] = useState(false);
  const [noBullData, setNoBullData] = useState<NoBullData | null>(null);
  const [formData, setFormData] = useState<OpportunityFormData>({
    title: '',
    description: '',
    opportunity_type: 'shopping',
    partner_name: '',
    partner_logo_url: '',
    affiliate_link: '',
    reward_per_dollar: 0,
    lock_90_nctr_reward: 0,
    reward_distribution_type: 'lock_90',
    min_status: 'starter',
    featured: true,
    is_active: true,
    cta_text: '',
    display_order: 1
  });

  const fetchNoBullData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching NOBull data from Loyalize API...');
      
      // First check if NOBull exists in our brands table
      const { data: existingBrand, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .ilike('name', '%nobull%')
        .single();

      if (existingBrand && !brandError) {
        console.log('✅ Found NOBull in database:', existingBrand);
        
        const data: NoBullData = {
          brand_id: existingBrand.id,
          loyalize_id: existingBrand.loyalize_id,
          name: existingBrand.name,
          description: existingBrand.description || '',
          logo_url: existingBrand.logo_url || '',
          commission_rate: existingBrand.commission_rate || 0.056,
          nctr_per_dollar: existingBrand.nctr_per_dollar || 100,
          category: existingBrand.category || 'clothing-footwear-accessories',
          website_url: existingBrand.website_url || 'https://www.nobullproject.com/',
          affiliate_link: `${existingBrand.website_url}?utm_source=nctr&utm_medium=affiliate&utm_campaign=training_gear`
        };
        
        setNoBullData(data);
        populateFormWithData(data);
        
        toast({
          title: "NOBull Data Loaded",
          description: "Successfully loaded NOBull brand data from database",
        });
      } else {
        // Try to fetch from Loyalize API
        console.log('🌐 Fetching from Loyalize API...');
        
        const { data: apiData, error: apiError } = await supabase.functions.invoke('loyalize-brands', {
          body: { 
            action: 'search',
            query: 'nobull',
            limit: 5
          }
        });

        if (apiError) throw apiError;
        
        const noBullBrand = apiData.brands?.find((brand: any) => 
          brand.name.toLowerCase().includes('nobull')
        );

        if (noBullBrand) {
          console.log('✅ Found NOBull from API:', noBullBrand);
          
          const data: NoBullData = {
            loyalize_id: noBullBrand.loyalize_id,
            name: noBullBrand.name,
            description: noBullBrand.description || 'Premium training gear and athletic footwear for high-performance athletes.',
            logo_url: noBullBrand.logo_url || '',
            commission_rate: noBullBrand.commission_rate || 0.056,
            nctr_per_dollar: noBullBrand.nctr_per_dollar || 100,
            category: noBullBrand.category || 'clothing-footwear-accessories',
            website_url: noBullBrand.website_url || 'https://www.nobullproject.com/',
            affiliate_link: `${noBullBrand.website_url}?utm_source=nctr&utm_medium=affiliate&utm_campaign=training_gear`
          };
          
          setNoBullData(data);
          populateFormWithData(data);
          
          toast({
            title: "NOBull Data Fetched",
            description: "Successfully loaded NOBull data from Loyalize API",
          });
        } else {
          throw new Error('NOBull brand not found in API response');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching NOBull data:', error);
      
      // Fallback to manual data entry with known NOBull info
      const fallbackData: NoBullData = {
        loyalize_id: '30095',
        name: 'Nobull',
        description: 'Nobull specializes in performance footwear, apparel, and accessories designed for training and active lifestyles. Their products include training shoes, running shoes, gym bags, and workout gear.',
        logo_url: 'https://api.loyalize.com/resources/stores/30095/logo',
        commission_rate: 0.056,
        nctr_per_dollar: 100,
        category: 'clothing-footwear-accessories',
        website_url: 'https://www.nobullproject.com/',
        affiliate_link: 'https://www.nobullproject.com/?utm_source=nctr&utm_medium=affiliate&utm_campaign=training_gear'
      };
      
      setNoBullData(fallbackData);
      populateFormWithData(fallbackData);
      
      toast({
        title: "Using Cached NOBull Data",
        description: "API unavailable - using known NOBull information",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  const populateFormWithData = (data: NoBullData) => {
    setFormData({
      title: `${data.name} Training Gear - Performance Footwear & Apparel`,
      description: data.description,
      opportunity_type: 'shopping',
      partner_name: data.name,
      partner_logo_url: data.logo_url,
      affiliate_link: data.affiliate_link || data.website_url,
      reward_per_dollar: data.nctr_per_dollar,
      lock_90_nctr_reward: data.commission_rate * 100, // Convert to NCTR
      reward_distribution_type: 'lock_90',
      min_status: 'starter',
      featured: true,
      is_active: true,
      cta_text: `Shop ${data.name} Training Gear`,
      display_order: 1
    });
  };

  const createOpportunity = async () => {
    setLoading(true);
    try {
      console.log('🚀 Creating NOBull opportunity with data:', formData);
      
      const { data, error } = await supabase
        .from('earning_opportunities')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Opportunity Created",
        description: `${formData.title} has been created successfully!`,
      });

      console.log('✅ Created opportunity:', data);
    } catch (error) {
      console.error('❌ Error creating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to create opportunity. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormField = (field: keyof OpportunityFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              NOBull Opportunity Setup
            </div>
            <Button 
              onClick={fetchNoBullData}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Fetch NOBull Data'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Pull NOBull brand data from the Loyalize API and set up an earning opportunity 
            with all the correct commission rates, logos, and tracking links.
          </div>
        </CardContent>
      </Card>

      {/* NOBull Data Display */}
      {noBullData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img 
                src={noBullData.logo_url} 
                alt="NOBull Logo"
                className="w-8 h-8 rounded object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              {noBullData.name} Brand Data
              <Badge className="bg-green-500 text-white">
                Loaded
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Commission Rate</Label>
                <p className="text-lg font-semibold text-green-600">
                  {(noBullData.commission_rate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">NCTR per Dollar</Label>
                <p className="text-lg font-semibold text-blue-600">
                  {noBullData.nctr_per_dollar} NCTR
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Badge variant="secondary">{noBullData.category}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Loyalize ID</Label>
                <p className="text-sm font-mono">{noBullData.loyalize_id}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {noBullData.description}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(noBullData.website_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Website
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(noBullData.affiliate_link, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Test Affiliate Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunity Form */}
      {noBullData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Opportunity Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="cta_text">Call to Action Text</Label>
                <Input
                  id="cta_text"
                  value={formData.cta_text}
                  onChange={(e) => updateFormField('cta_text', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="reward_per_dollar">NCTR per Dollar</Label>
                <Input
                  id="reward_per_dollar"
                  type="number"
                  value={formData.reward_per_dollar}
                  onChange={(e) => updateFormField('reward_per_dollar', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="lock_90_nctr_reward">90LOCK NCTR Reward</Label>
                <Input
                  id="lock_90_nctr_reward"
                  type="number"
                  step="0.1"
                  value={formData.lock_90_nctr_reward}
                  onChange={(e) => updateFormField('lock_90_nctr_reward', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => updateFormField('display_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => updateFormField('featured', e.target.checked)}
                  />
                  <span className="text-sm">Featured</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => updateFormField('is_active', e.target.checked)}
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
              
              <Button 
                onClick={createOpportunity}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Opportunity'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!noBullData && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <Download className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold">No NOBull Data Loaded</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Fetch NOBull Data" to pull all brand information from the Loyalize API
                </p>
              </div>
              <Button onClick={fetchNoBullData} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                Fetch NOBull Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NoBullOpportunitySetup;
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/hooks/use-toast';
import LoyalizeBrandSearch from './LoyalizeBrandSearch';
import BrandGiftCardSearch from './BrandGiftCardSearch';
import { 
  Plus, 
  Building2, 
  Edit, 
  Trash2, 
  ExternalLink,
  Star,
  Loader2
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  website_url: string;
  category: string;
  loyalize_id: string;
  commission_rate: number;
  nctr_per_dollar: number;
  is_active: boolean;
  featured: boolean;
  created_at: string;
}

interface BrandManagementProps {
  onStatsUpdate: () => void;
}

const BrandManagement = ({ onStatsUpdate }: BrandManagementProps) => {
  const { logActivity } = useAdmin();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'manage'>('search');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('featured', { ascending: false })
        .order('category')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brands.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBrandsUpdate = () => {
    fetchBrands();
    onStatsUpdate();
  };

  const toggleBrandStatus = async (brand: Brand) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ is_active: !brand.is_active })
        .eq('id', brand.id);

      if (error) throw error;

      await logActivity(
        brand.is_active ? 'deactivated' : 'activated', 
        'brand', 
        brand.id, 
        { brand_name: brand.name }
      );

      toast({
        title: `Brand ${brand.is_active ? 'Deactivated' : 'Activated'}`,
        description: `${brand.name} has been ${brand.is_active ? 'deactivated' : 'activated'}.`,
      });

      handleBrandsUpdate();
    } catch (error) {
      console.error('Error toggling brand status:', error);
      toast({
        title: "Error",
        description: "Failed to update brand status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete ${brand.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brand.id);

      if (error) throw error;

      await logActivity('deleted', 'brand', brand.id, { 
        brand_name: brand.name 
      });

      toast({
        title: "Brand Deleted",
        description: `${brand.name} has been deleted.`,
      });

      handleBrandsUpdate();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: "Failed to delete brand.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">Brand & Gift Card Management</h3>
          <p className="text-muted-foreground">Manage partnerships, gift cards, and commission rates</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'search' ? 'default' : 'outline'}
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Browse & Search
          </Button>
          <Button 
            variant={activeTab === 'manage' ? 'default' : 'outline'}
            onClick={() => setActiveTab('manage')}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Manage Existing
          </Button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'search' ? (
        <>
          {/* Loyalize Import Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Import New Brands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoyalizeBrandSearch onBrandImported={handleBrandsUpdate} />
            </CardContent>
          </Card>

          {/* Search & Browse Section */}
          {loading ? (
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading brands...</p>
              </CardContent>
            </Card>
          ) : (
            <BrandGiftCardSearch 
              brands={brands} 
              onBrandsUpdate={handleBrandsUpdate}
            />
          )}
        </>
      ) : (
        <>
          {/* Management Grid */}
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
          ) : brands.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No brands added yet.</p>
                <Button 
                  onClick={() => setActiveTab('search')}
                  className="bg-gradient-hero hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Import Your First Brand
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand) => (
                <Card key={brand.id} className="bg-card/80 backdrop-blur-sm hover:shadow-glow transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{brand.name}</CardTitle>
                          {brand.featured && <Star className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <div className="flex gap-2 mb-2">
                          <Button
                            variant={brand.is_active ? 'default' : 'secondary'}
                            size="sm"
                            onClick={() => toggleBrandStatus(brand)}
                            className="text-xs h-6"
                          >
                            {brand.is_active ? 'Active' : 'Inactive'}
                          </Button>
                          {brand.category === 'Gift Cards' && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              Gift Card
                            </span>
                          )}
                        </div>
                      </div>
                      {brand.logo_url && (
                        <img 
                          src={brand.logo_url} 
                          alt={brand.name}
                          className="w-12 h-12 object-contain rounded"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {brand.description || 'No description available.'}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Commission:</span>
                        <p className="font-medium">{(brand.commission_rate * 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">User Rate:</span>
                        <p className="font-medium">{brand.nctr_per_dollar} NCTR/$1</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {brand.website_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(brand.website_url, '_blank')}
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Visit
                        </Button>
                      )}
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(brand)}
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrandManagement;
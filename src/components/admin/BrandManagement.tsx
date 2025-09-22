import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Loader2,
  Search,
  Filter,
  CreditCard
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
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'giftcards'>('all');
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);

  useEffect(() => {
    fetchBrands();
  }, []);

  // Filter brands based on search term and active filter
  useEffect(() => {
    let filtered = brands;

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(brand => 
        brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category/type filters
    switch (activeFilter) {
      case 'popular':
        // Sort by featured first, then by commission rate
        filtered = filtered
          .filter(brand => brand.featured || brand.commission_rate >= 0.05)
          .sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.commission_rate - a.commission_rate;
          });
        break;
      case 'giftcards':
        filtered = filtered.filter(brand => 
          brand.category.toLowerCase().includes('gift') || 
          brand.name.toLowerCase().includes('gift')
        );
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredBrands(filtered);
  }, [brands, searchTerm, activeFilter]);

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
          {/* Search and Filter Section */}
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Find and Add Brands
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="space-y-2">
                <Label htmlFor="brand-search">Search Brands</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="brand-search"
                    placeholder="Search by name, category, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  All Brands
                </Button>
                <Button 
                  variant={activeFilter === 'popular' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('popular')}
                  className="flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Most Popular
                </Button>
                <Button 
                  variant={activeFilter === 'giftcards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('giftcards')}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Gift Cards
                </Button>
              </div>

              {/* Search Results */}
              {(searchTerm || activeFilter !== 'all') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">
                      Search Results ({filteredBrands.length} found)
                    </h4>
                    {(searchTerm || activeFilter !== 'all') && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSearchTerm('');
                          setActiveFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                  
                  {filteredBrands.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
                      {filteredBrands.map((brand) => (
                        <Card key={brand.id} className="bg-card/90 backdrop-blur-sm hover:shadow-glow transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <CardTitle className="text-base">{brand.name}</CardTitle>
                                  {brand.featured && <Star className="w-4 h-4 text-yellow-500" />}
                                </div>
                                <div className="flex gap-1 mb-1">
                                  <Badge variant={brand.is_active ? 'default' : 'secondary'} className="text-xs">
                                    {brand.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {brand.category}
                                  </Badge>
                                  {(brand.category.toLowerCase().includes('gift') || brand.name.toLowerCase().includes('gift')) && (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                      Gift Card
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {brand.logo_url && (
                                <img 
                                  src={brand.logo_url} 
                                  alt={brand.name}
                                  className="w-10 h-10 object-contain rounded"
                                />
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {brand.description || 'No description available.'}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="text-muted-foreground">Earning Rate:</span>
                                <p className="font-medium text-primary">{brand.nctr_per_dollar} NCTR/$1</p>
                                <span className="text-muted-foreground">Commission: {(brand.commission_rate * 100).toFixed(2)}%</span>
                              </div>
                              {brand.website_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(brand.website_url, '_blank')}
                                  className="h-7"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No brands found matching your criteria.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
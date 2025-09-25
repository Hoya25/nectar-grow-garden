import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  ExternalLink, 
  Plus, 
  DollarSign, 
  Star,
  Building2,
  TrendingUp,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Brand {
  id: string;
  loyalize_id: string;
  name: string;
  description: string;
  logo_url: string;
  commission_rate: number;
  nctr_per_dollar: number;
  category: string;
  website_url: string;
  is_active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

const LoyalizeBrandManager = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [creatingOpportunity, setCreatingOpportunity] = useState<string | null>(null);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('commission_rate', { ascending: false });

      if (error) throw error;

      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brands",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOpportunity = async (brand: Brand) => {
    setCreatingOpportunity(brand.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: {
          action: 'create_opportunity_from_brand',
          brand_id: brand.id,
          opportunity_type: 'shopping',
          min_status: 'starter'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: `Created earning opportunity for ${brand.name}`,
        });
      } else {
        throw new Error(data.error || 'Failed to create opportunity');
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast({
        title: "Error", 
        description: `Failed to create opportunity: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setCreatingOpportunity(null);
    }
  };

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || brand.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(brands.map(brand => brand.category))].sort();
  
  const averageCommission = brands.length > 0 
    ? (brands.reduce((sum, brand) => sum + (brand.commission_rate * 100), 0) / brands.length).toFixed(2)
    : '0.00';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Loyalize Brands...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Brands</p>
              <p className="text-2xl font-bold">{brands.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Avg Commission</p>
              <p className="text-2xl font-bold">{averageCommission}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Featured</p>
              <p className="text-2xl font-bold">{brands.filter(b => b.featured).length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Filter className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{categories.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Loyalize Brand Commission Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search brands or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brands Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBrands.map((brand) => (
              <Card key={brand.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {brand.logo_url ? (
                        <img 
                          src={brand.logo_url} 
                          alt={brand.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<Building2 class="w-6 h-6 text-muted-foreground" />`;
                            }
                          }}
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-sm leading-tight mb-1 truncate">
                          {brand.name}
                        </h3>
                        {brand.featured && (
                          <Star className="w-4 h-4 text-yellow-500 ml-2 flex-shrink-0" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {brand.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Commission:</span>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="font-bold text-green-600">
                          {(brand.commission_rate * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">NCTR per $:</span>
                      <span className="font-semibold">
                        {brand.nctr_per_dollar.toFixed(0)}
                      </span>
                    </div>

                    {brand.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {brand.description}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => createOpportunity(brand)}
                        disabled={creatingOpportunity === brand.id}
                        className="flex-1"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {creatingOpportunity === brand.id ? 'Creating...' : 'Create Opportunity'}
                      </Button>
                      
                      {brand.website_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(brand.website_url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredBrands.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No brands found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No active brands available'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoyalizeBrandManager;
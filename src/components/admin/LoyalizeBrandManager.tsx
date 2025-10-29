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
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  Edit,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [commissionRange, setCommissionRange] = useState<[number, number]>([0, 10]);
  const [sortBy, setSortBy] = useState<'name' | 'commission' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [creatingOpportunity, setCreatingOpportunity] = useState<string | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [nctrRate, setNctrRate] = useState('');
  const [updatingNCTR, setUpdatingNCTR] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async (useComprehensiveSearch = false) => {
    try {
      let data, error;
      
      if (useComprehensiveSearch) {
        const searchParams = {
          action: 'get_comprehensive_brands',
          search: searchTerm || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          min_commission: commissionRange[0],
          max_commission: commissionRange[1],
          sort_by: sortBy,
          sort_order: sortOrder
        };
        
        const response = await supabase.functions.invoke('loyalize-integration', {
          body: searchParams
        });
        
        if (response.error) throw response.error;
        
        data = response.data?.brands || [];
        error = null;
      } else {
        const result = await supabase
          .from('brands')
          .select('*')
          .eq('is_active', true)
          .order('featured', { ascending: false })
          .order('commission_rate', { ascending: false });
        
        data = result.data;
        error = result.error;
      }

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

  const syncBrands = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { action: 'sync_brands' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: `Synced ${data.brands_count || 0} brands from Loyalize API`,
        });
        await loadBrands();
      } else {
        throw new Error(data.error || 'Failed to sync brands');
      }
    } catch (error) {
      console.error('Error syncing brands:', error);
      toast({
        title: "Error",
        description: `Failed to sync brands: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };


  const editBrandNCTR = (brand: Brand) => {
    setEditingBrand(brand);
    setNctrRate(brand.nctr_per_dollar ? brand.nctr_per_dollar.toString() : '');
  };

  const updateBrandNCTR = async () => {
    if (!editingBrand || !nctrRate) return;

    setUpdatingNCTR(true);
    try {
      const nctrValue = parseFloat(nctrRate);
      if (isNaN(nctrValue) || nctrValue < 0) {
        toast({
          title: "Invalid NCTR Rate",
          description: "Please enter a valid number greater than or equal to 0",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('brands')
        .update({ nctr_per_dollar: nctrValue })
        .eq('id', editingBrand.id);

      if (error) throw error;

      toast({
        title: "NCTR Rate Updated",
        description: `${editingBrand.name} NCTR rate updated to ${nctrValue} per dollar`,
      });

      await loadBrands();
      setEditingBrand(null);
      setNctrRate('');
    } catch (error) {
      console.error('Error updating NCTR rate:', error);
      toast({
        title: "Error",
        description: "Failed to update NCTR rate",
        variant: "destructive",
      });
    } finally {
      setUpdatingNCTR(false);
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

  const filteredAndSortedBrands = brands
    .filter(brand => {
      // Exclude NoBull brand
      if (brand.loyalize_id === '30095' || brand.name.toLowerCase().includes('nobull')) {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        brand.name.toLowerCase().includes(searchLower) ||
        brand.description?.toLowerCase().includes(searchLower) ||
        brand.category.toLowerCase().includes(searchLower);
      
      const matchesCategory = selectedCategory === 'all' || brand.category === selectedCategory;
      
      const commissionPercent = brand.commission_rate * 100;
      const matchesCommission = commissionPercent >= commissionRange[0] && commissionPercent <= commissionRange[1];
      
      return matchesSearch && matchesCategory && matchesCommission;
    })
    .sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      
      switch (sortBy) {
        case 'commission':
          aVal = a.commission_rate;
          bVal = b.commission_rate;
          break;
        case 'category':
          aVal = a.category;
          bVal = b.category;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
          break;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? result : -result;
      } else {
        const result = (aVal as number) - (bVal as number);
        return sortOrder === 'asc' ? result : -result;
      }
    });

  const categories = [...new Set(brands.map(brand => brand.category))].sort();
  
  const averageCommission = brands.length > 0 
    ? (brands.reduce((sum, brand) => sum + (brand.commission_rate * 100), 0) / brands.length).toFixed(2)
    : '0.00';

  const maxCommission = brands.length > 0
    ? Math.max(...brands.map(brand => brand.commission_rate * 100))
    : 10;

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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Loyalize Brand Commission Manager
            </div>
            <Button 
              onClick={syncBrands}
              disabled={syncing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All Brands'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primary search and controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search brands, descriptions, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {setSortBy('name'); setSortOrder('asc')}}>
                      Name (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy('name'); setSortOrder('desc')}}>
                      Name (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy('commission'); setSortOrder('desc')}}>
                      Highest Commission
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy('commission'); setSortOrder('asc')}}>
                      Lowest Commission
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {setSortBy('category'); setSortOrder('asc')}}>
                      Category (A-Z)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
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
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Commission Rate: {commissionRange[0]}% - {commissionRange[1]}%
                  </label>
                  <Slider
                    value={commissionRange}
                    onValueChange={(value) => setCommissionRange(value as [number, number])}
                    max={Math.ceil(maxCommission)}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Results summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredAndSortedBrands.length} of {brands.length} brands
              </span>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          </div>

          {/* Brands Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
            {filteredAndSortedBrands.map((brand) => (
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
                        {brand.nctr_per_dollar ? brand.nctr_per_dollar.toFixed(3) : 'Not Set'}
                      </span>
                    </div>

                    {brand.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {brand.description}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => editBrandNCTR(brand)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Set NCTR
                      </Button>
                      <Button 
                        onClick={() => createOpportunity(brand)}
                        disabled={creatingOpportunity === brand.id}
                        size="sm"
                        className="flex-1 bg-gradient-hero hover:opacity-90"
                      >
                        {creatingOpportunity === brand.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create
                          </>
                        )}
                      </Button>
                    </div>

                    {brand.website_url && (
                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => window.open(brand.website_url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Visit Site
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAndSortedBrands.length === 0 && (
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

      {/* NCTR Rate Edit Dialog */}
      <Dialog open={!!editingBrand} onOpenChange={(open) => !open && setEditingBrand(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set NCTR Rate for {editingBrand?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nctr-rate">NCTR per Dollar Spent</Label>
              <Input
                id="nctr-rate"
                type="number"
                step="0.001"
                min="0"
                value={nctrRate}
                onChange={(e) => setNctrRate(e.target.value)}
                placeholder="e.g., 0.025 for 2.5 NCTR per $1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is what users earn in NCTR for every dollar they spend with this brand
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditingBrand(null)}
                disabled={updatingNCTR}
              >
                Cancel
              </Button>
              <Button 
                onClick={updateBrandNCTR}
                disabled={updatingNCTR || !nctrRate}
              >
                {updatingNCTR ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update NCTR Rate'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoyalizeBrandManager;
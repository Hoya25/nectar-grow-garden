import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandLogo } from '@/components/ui/brand-logo';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  ShoppingBag, 
  Building2,
  Star,
  ExternalLink,
  Gift,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  category?: string;
  loyalize_id?: string;
  commission_rate?: number;
  nctr_per_dollar?: number;
  is_active: boolean;
  featured?: boolean;
}

interface LoyalizeBrandDetails {
  id: string;
  name: string;
  description?: string;
  commission_rate?: number;
  category?: string;
  website_url?: string;
  status?: string;
  terms?: string;
  cookie_duration?: number;
}

interface BrandSearchInterfaceProps {
  onBrandSelect?: (brand: Brand) => void;
  selectedBrand?: Brand | null;
  placeholder?: string;
  showFullDetails?: boolean;
  mode?: 'selection' | 'management';
  className?: string;
}

const BrandSearchInterface = ({ 
  onBrandSelect, 
  selectedBrand, 
  placeholder = "🔍 Search brands by name, category, or description...",
  showFullDetails = false,
  mode = 'selection',
  className = ''
}: BrandSearchInterfaceProps) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loyalizeDetails, setLoyalizeDetails] = useState<Record<string, LoyalizeBrandDetails>>({});
  const [loadingLoyalize, setLoadingLoyalize] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLDivElement>(null);

  const categories = [
    'all', 'gifts-flowers', 'clothing-footwear-accessories', 'health-beauty', 
    'electronics', 'home-garden', 'automotive', 'food-drink', 'education',
    'services', 'web', 'books-media', 'financial-services'
  ];

  useEffect(() => {
    fetchBrands();
  }, []);

  // Fetch brands when search term or category changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm || selectedCategory !== 'all') {
        fetchBrands(searchTerm, selectedCategory);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchBrands = async (currentSearchTerm?: string, currentCategory?: string) => {
    setLoading(true);
    try {
      const searchValue = currentSearchTerm !== undefined ? currentSearchTerm : searchTerm;
      const categoryValue = currentCategory !== undefined ? currentCategory : selectedCategory;
      
      console.log('🔍 [BrandSearch] Fetching brands with:', { searchValue, categoryValue });
      
      // Check authentication status
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 [BrandSearch] Auth status:', { 
        authenticated: !!user, 
        userId: user?.id 
      });
      
      // Build query with server-side filtering for better performance
      let query = supabase
        .from('brands')
        .select('id, name, logo_url, description, category, website_url, commission_rate, nctr_per_dollar, is_active, featured, loyalize_id')
        .eq('is_active', true);
      
      // Apply search filter on server side if search term exists
      if (searchValue && searchValue.trim()) {
        const searchLower = searchValue.toLowerCase().trim();
        query = query.or(`name.ilike.%${searchLower}%,description.ilike.%${searchLower}%,category.ilike.%${searchLower}%`);
      }
      
      // Apply category filter on server side
      if (categoryValue !== 'all') {
        query = query.ilike('category', `%${categoryValue}%`);
      }
      
      query = query
        .order('featured', { ascending: false })
        .order('name')
        .limit(1000); // Keep reasonable limit since we're filtering server-side now
      
      const { data, error } = await query;

      if (error) {
        console.error('🔍 [BrandSearch] Supabase error fetching brands:', error);
        throw error;
      }
      
      console.log(`🔍 [BrandSearch] Successfully fetched ${data?.length || 0} brands`);
      
      // Check for specific brands
      const coinbaseBrands = data?.filter(b => b.name.toLowerCase().includes('coinbase')) || [];
      console.log(`🔍 [BrandSearch] Found ${coinbaseBrands.length} Coinbase brands:`, 
        coinbaseBrands.map(b => ({ name: b.name, category: b.category, id: b.loyalize_id }))
      );
      
      const uberBrands = data?.filter(b => b.name.toLowerCase().includes('uber')) || [];
      console.log(`🔍 [BrandSearch] Found ${uberBrands.length} Uber brands:`, 
        uberBrands.map(b => b.name)
      );
      
      setBrands(data || []);
    } catch (error) {
      console.error('🔍 [BrandSearch] Error fetching brands:', error);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  // Minimal client-side filtering for Uber gift card validation only
  const filteredBrands = brands.filter(brand => {
    const brandName = (brand.name || '').toLowerCase();
    const brandCategory = (brand.category || '').toLowerCase();
    
    // Filter out non-Loyalize gift card sources for Uber
    const isUberGiftCard = brandName.includes('uber') && (brandName.includes('gift') || brandCategory.includes('gift'));
    const isLoyalizeSourced = brand.loyalize_id && /^\d+$/.test(brand.loyalize_id);
    
    // For Uber gift cards, only show Loyalize API sourced ones
    if (isUberGiftCard && !isLoyalizeSourced) {
      return false;
    }
    
    return true;
  });

  console.log(`🔍 [BrandSearch] Results:`, {
    totalBrands: brands.length,
    searchTerm,
    selectedCategory,
    filteredCount: filteredBrands.length,
    firstFive: filteredBrands.slice(0, 5).map(b => b.name)
  });

  const handleBrandSelect = (brand: Brand) => {
    if (onBrandSelect) {
      onBrandSelect(brand);
    }
    setSearchTerm(brand.name);
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      setShowDropdown(true);
    }
  };

  const clearSelection = () => {
    setSearchTerm('');
    if (onBrandSelect) {
      onBrandSelect(null as any);
    }
  };

  const fetchLoyalizeBrandDetails = async (brand: Brand) => {
    if (!brand.loyalize_id) {
      console.warn('No loyalize_id for brand:', brand.name);
      return;
    }
    if (loyalizeDetails[brand.id]) {
      console.log('Already have details for:', brand.name);
      return; // Already fetched
    }
    
    setLoadingLoyalize(prev => ({ ...prev, [brand.id]: true }));
    
    try {
      console.log('🔍 Fetching Loyalize details for brand:', brand.name, 'ID:', brand.loyalize_id);
      
      const { data, error } = await supabase.functions.invoke('loyalize-brands', {
        body: { 
          action: 'get_brand_details',
          brand_id: brand.loyalize_id 
        }
      });

      console.log('📦 Raw response:', { data, error });

      if (error) {
        console.error('❌ Error fetching Loyalize brand details:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ No data returned from edge function');
        return;
      }

      console.log('✅ Loyalize brand details received:', data);

      if (data.success && data.brand) {
        console.log('💾 Storing brand details:', data.brand);
        setLoyalizeDetails(prev => ({
          ...prev,
          [brand.id]: data.brand
        }));
      } else {
        console.error('❌ Invalid response format:', data);
      }
    } catch (error) {
      console.error('💥 Exception fetching Loyalize brand details:', error);
    } finally {
      setLoadingLoyalize(prev => ({ ...prev, [brand.id]: false }));
    }
  };

  return (
    <div className={`space-y-3 ${className}`} ref={searchRef}>
      {/* Search Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Brand Search</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchBrands(searchTerm, selectedCategory);
              if (searchTerm) {
                setShowDropdown(true);
              }
            }}
            disabled={loading}
            className="h-7 gap-2"
          >
            <Search className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Search
          </Button>
        </div>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-80 overflow-hidden">
              {/* Category Filter */}
              <div className="p-3 border-b bg-muted/50">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.filter(c => c !== 'all').map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' & ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Results Header */}
              <div className="p-2 text-sm text-muted-foreground border-b bg-muted">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading brands...
                  </div>
                ) : (
                  <>
                    {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''} found
                    {searchTerm && ` matching "${searchTerm}"`}
                    {selectedCategory !== 'all' && ` in ${selectedCategory.replace('-', ' & ')}`}
                  </>
                )}
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading brands...</p>
                  </div>
                ) : filteredBrands.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchTerm || selectedCategory !== 'all' ? (
                      <>
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No brands match your search.</p>
                        <p className="text-xs mt-1">Try a different search term or category.</p>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No brands available.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-1">
                    {filteredBrands.map((brand) => {
                      const loyalizeData = loyalizeDetails[brand.id];
                      const isLoadingLoyalize = loadingLoyalize[brand.id];
                      const hasLoyalizeId = brand.loyalize_id && /^\d+$/.test(brand.loyalize_id);
                      
                      return (
                        <div
                          key={brand.id}
                          className="border-b border-border/30 last:border-b-0"
                        >
                          <div
                            className="px-3 py-2 hover:bg-muted cursor-pointer"
                            onClick={() => {
                              handleBrandSelect(brand);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <BrandLogo 
                                  src={brand.logo_url} 
                                  alt={brand.name}
                                  size="sm"
                                  variant="auto"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-foreground truncate">
                                    {brand.name}
                                  </div>
                                  {brand.featured && <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                                  {(brand.category?.toLowerCase().includes('gift') || brand.name.toLowerCase().includes('gift')) && (
                                    <Gift className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  )}
                                  {hasLoyalizeId && (
                                    <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                                      Loyalize
                                    </Badge>
                                  )}
                                </div>
                                {brand.category && (
                                  <div className="text-xs text-muted-foreground">
                                    {brand.category.split('-').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' & ')}
                                  </div>
                                )}
                                {showFullDetails && brand.description && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {brand.description}
                                  </div>
                                )}
                                {showFullDetails && brand.nctr_per_dollar && (
                                  <div className="text-xs text-primary font-medium mt-1">
                                    {brand.nctr_per_dollar} NCTR per $1
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {brand.website_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(brand.website_url, '_blank');
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                )}
                                {hasLoyalizeId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!loyalizeData && !isLoadingLoyalize) {
                                        fetchLoyalizeBrandDetails(brand);
                                      }
                                    }}
                                    disabled={isLoadingLoyalize}
                                    className="h-6 w-6 p-0"
                                    title={loyalizeData ? "View offerings" : "Load Loyalize offerings"}
                                  >
                                    {isLoadingLoyalize ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : loyalizeData ? (
                                      <ShoppingBag className="w-3 h-3 text-primary" />
                                    ) : (
                                      <ShoppingBag className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Loyalize Brand Details */}
                          {hasLoyalizeId && (
                            <>
                              {/* Loading State */}
                              {isLoadingLoyalize && (
                                <div className="px-3 pb-3 pt-1 bg-muted/30">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading Loyalize offerings...
                                  </div>
                                </div>
                              )}

                              {/* Show offerings when loaded */}
                              {loyalizeData && (
                                <div className="px-3 pb-3 pt-1 bg-gradient-to-r from-blue-50/50 to-transparent border-l-2 border-blue-400 space-y-2">
                                  <div className="text-xs font-medium text-blue-700 mb-1.5 flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-blue-100 text-blue-700 border-blue-300">
                                      <ShoppingBag className="w-3 h-3 mr-1 inline" />
                                      Loyalize API
                                    </Badge>
                                    Affiliate Program Details
                                  </div>
                                  
                                  <div className="bg-background rounded-lg p-3 space-y-2 shadow-sm">
                                    {/* Commission Rate */}
                                    {loyalizeData.commission_rate && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Commission Rate:</span>
                                        <span className="font-semibold text-primary text-sm">{loyalizeData.commission_rate}%</span>
                                      </div>
                                    )}

                                    {/* Cookie Duration */}
                                    {loyalizeData.cookie_duration && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Cookie Duration:</span>
                                        <span className="font-semibold">{loyalizeData.cookie_duration} days</span>
                                      </div>
                                    )}

                                    {/* Category */}
                                    {loyalizeData.category && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Category:</span>
                                        <span className="font-medium capitalize">{loyalizeData.category.replace(/-/g, ' ')}</span>
                                      </div>
                                    )}

                                    {/* Status */}
                                    {loyalizeData.status && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Status:</span>
                                        <Badge 
                                          variant={loyalizeData.status === 'active' ? 'default' : 'secondary'}
                                          className="text-[10px] h-4 px-1"
                                        >
                                          {loyalizeData.status}
                                        </Badge>
                                      </div>
                                    )}

                                    {/* Description */}
                                    {loyalizeData.description && (
                                      <div className="pt-2 border-t">
                                        <div className="text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Description</div>
                                        <div className="text-xs text-foreground">{loyalizeData.description}</div>
                                      </div>
                                    )}

                                    {/* Terms */}
                                    {loyalizeData.terms && (
                                      <div className="pt-2 border-t">
                                        <div className="text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Terms & Conditions</div>
                                        <div className="text-xs text-foreground max-h-20 overflow-y-auto">{loyalizeData.terms}</div>
                                      </div>
                                    )}

                                    {/* Website Link */}
                                    {loyalizeData.website_url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(loyalizeData.website_url, '_blank')}
                                        className="w-full mt-2 h-7 text-xs gap-2"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Visit Merchant Site
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Prompt to load if not loaded yet */}
                              {!loyalizeData && !isLoadingLoyalize && (
                                <div className="px-3 pb-2 pt-1 bg-muted/30">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchLoyalizeBrandDetails(brand);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                  >
                                    <ShoppingBag className="w-3 h-3" />
                                    Click to load Loyalize affiliate program details
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropdown(false)}
                  className="w-full text-xs"
                >
                  Close search results
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Brand Preview */}
      {selectedBrand && mode === 'selection' && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <BrandLogo 
                src={selectedBrand.logo_url} 
                alt={selectedBrand.name}
                size="sm"
                variant="auto"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{selectedBrand.name}</div>
                {selectedBrand.category && (
                  <div className="text-xs text-muted-foreground">
                    {selectedBrand.category.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' & ')}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BrandSearchInterface;
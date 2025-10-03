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
  Loader2
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
  const searchRef = useRef<HTMLDivElement>(null);

  const categories = [
    'all', 'gifts-flowers', 'clothing-footwear-accessories', 'health-beauty', 
    'electronics', 'home-garden', 'automotive', 'food-drink', 'education',
    'services', 'web', 'books-media', 'financial-services'
  ];

  useEffect(() => {
    fetchBrands();
  }, []);

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

  const fetchBrands = async () => {
    setLoading(true);
    try {
      console.log('Fetching brands for search interface...');
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, logo_url, description, category, website_url, commission_rate, nctr_per_dollar, is_active, featured, loyalize_id')
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('name');

      if (error) {
        console.error('Supabase error fetching brands:', error);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} brands`);
      
      // Debug log for Uber brands
      const uberBrands = data?.filter(b => b.name.toLowerCase().includes('uber')) || [];
      console.log(`Found ${uberBrands.length} Uber brands:`, uberBrands.map(b => b.name));
      
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter(brand => {
    if (!searchTerm && selectedCategory === 'all') return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    const brandName = (brand.name || '').toLowerCase();
    const brandDescription = (brand.description || '').toLowerCase();
    const brandCategory = (brand.category || '').toLowerCase();
    
    const matchesSearch = !searchTerm || (
      brandName.includes(searchLower) ||
      brandDescription.includes(searchLower) ||
      brandCategory.includes(searchLower)
    );
    
    const matchesCategory = selectedCategory === 'all' || brandCategory.includes(selectedCategory);
    
    // Filter out non-Loyalize gift card sources for Uber
    const isUberGiftCard = brandName.includes('uber') && (brandName.includes('gift') || brandCategory.includes('gift'));
    const isLoyalizeSourced = brand.loyalize_id && /^\d+$/.test(brand.loyalize_id); // Numeric loyalize_id indicates real API source
    
    // For Uber gift cards, only show Loyalize API sourced ones
    if (isUberGiftCard && !isLoyalizeSourced) {
      console.log(`Filtering out non-Loyalize Uber gift card: ${brand.name} (ID: ${brand.loyalize_id})`);
      return false;
    }
    
    // Debug logging for Uber searches
    if (searchLower.includes('uber')) {
      console.log(`Checking brand: "${brand.name}" - matches search: ${matchesSearch}, matches category: ${matchesCategory}, loyalize_id: ${brand.loyalize_id}`);
    }
    
    return matchesSearch && matchesCategory;
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
    setShowDropdown(true);
  };

  const clearSelection = () => {
    setSearchTerm('');
    if (onBrandSelect) {
      onBrandSelect(null as any);
    }
  };

  return (
    <div className={`space-y-3 ${className}`} ref={searchRef}>
      {/* Search Input */}
      <div className="space-y-2">
        <Label>Brand Search</Label>
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
                    {filteredBrands.map((brand) => (
                      <div
                        key={brand.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border/30 last:border-b-0"
                        onClick={() => handleBrandSelect(brand)}
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
                              {/* Show Loyalize badge for verified API sources */}
                              {brand.loyalize_id && /^\d+$/.test(brand.loyalize_id) && (
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
                        </div>
                      </div>
                    ))}
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
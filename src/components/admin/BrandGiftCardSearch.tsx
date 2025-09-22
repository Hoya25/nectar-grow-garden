import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  RefreshCcw, 
  Gift,
  Building2,
  Loader2,
  ExternalLink,
  Star,
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
}

interface BrandGiftCardSearchProps {
  brands: Brand[];
  onBrandsUpdate: () => void;
}

const BrandGiftCardSearch = ({ brands, onBrandsUpdate }: BrandGiftCardSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [syncingGiftCards, setSyncingGiftCards] = useState(false);

  const categories = [
    'Gift Cards', 'Fashion', 'Electronics', 'Home & Garden', 
    'Health & Fitness', 'Beauty', 'Sports', 'Books', 'Automotive', 
    'Food & Beverages'
  ];

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = !searchTerm || 
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || brand.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const syncGiftCardOffers = async () => {
    setSyncingGiftCards(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { action: 'sync_brands' }
      });

      if (error) throw error;

      toast({
        title: "Gift Cards Synced!",
        description: data.message || "Gift card offers have been updated.",
      });

      onBrandsUpdate();
      
    } catch (error) {
      console.error('Error syncing gift cards:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync gift card offers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncingGiftCards(false);
    }
  };

  const giftCardBrands = filteredBrands.filter(brand => brand.category === 'Gift Cards');
  const otherBrands = filteredBrands.filter(brand => brand.category !== 'Gift Cards');

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Brand & Gift Card Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-term">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-term"
                  placeholder="Brand name, gift cards, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quick Actions</Label>
              <Button 
                onClick={syncGiftCardOffers}
                disabled={syncingGiftCards}
                className="w-full bg-gradient-hero hover:opacity-90"
              >
                {syncingGiftCards ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4 mr-2" />
                )}
                Sync Gift Card Offers
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              <span>{giftCardBrands.length} Gift Cards</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{otherBrands.length} Other Brands</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span>{filteredBrands.filter(b => b.featured).length} Featured</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gift Cards Section */}
      {giftCardBrands.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Gift Cards ({giftCardBrands.length})</h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {giftCardBrands.map((brand) => (
              <Card key={brand.id} className="bg-card/80 backdrop-blur-sm hover:shadow-glow transition-shadow border-green-200 dark:border-green-800">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{brand.name}</CardTitle>
                        {brand.featured && <Star className="w-4 h-4 text-yellow-500" />}
                        <CreditCard className="w-4 h-4 text-green-600" />
                      </div>
                      <Badge variant={brand.is_active ? 'default' : 'secondary'} className="text-xs">
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </Badge>
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
                    {brand.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground">Earning Rate:</span>
                      <p className="font-medium text-green-600">{brand.nctr_per_dollar} NCTR/$1</p>
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
        </div>
      )}

      {/* Other Brands Section */}
      {otherBrands.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Other Brands ({otherBrands.length})</h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherBrands.map((brand) => (
              <Card key={brand.id} className="bg-card/80 backdrop-blur-sm hover:shadow-glow transition-shadow">
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
                    {brand.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground">Earning Rate:</span>
                      <p className="font-medium text-primary">{brand.nctr_per_dollar} NCTR/$1</p>
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
        </div>
      )}

      {/* No Results */}
      {filteredBrands.length === 0 && (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory 
                ? 'No brands or gift cards match your search criteria.' 
                : 'No brands or gift cards available.'}
            </p>
            {searchTerm || selectedCategory ? (
              <Button 
                variant="outline" 
                onClick={() => {setSearchTerm(''); setSelectedCategory('');}}
                className="mt-2"
              >
                Clear Search
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BrandGiftCardSearch;

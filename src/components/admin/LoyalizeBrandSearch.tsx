import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Download, 
  ExternalLink, 
  Loader2,
  Building2,
  Star
} from 'lucide-react';

interface LoyalizeBrand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  category?: string;
  commission_rate: number;
  status: string;
}

interface LoyalizeBrandSearchProps {
  onBrandImported: () => void;
}

const LoyalizeBrandSearch = ({ onBrandImported }: LoyalizeBrandSearchProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [brands, setBrands] = useState<LoyalizeBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const categories = [
    'Fashion', 'Electronics', 'Home & Garden', 'Health & Fitness', 
    'Beauty', 'Sports', 'Books', 'Automotive', 'Food & Beverages', 'Gift Cards'
  ];

  const searchBrands = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a brand name to search.",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-brands', {
        body: {
          action: 'search',
          query: searchTerm,
          category: selectedCategory === 'all' ? '' : selectedCategory,
          limit: 50
        }
      });

      if (error) throw error;

      // Filter out NoBull brand
      const filteredBrands = (data.brands || []).filter((brand: LoyalizeBrand) => 
        brand.id !== '30095' && 
        !brand.name.toLowerCase().includes('nobull')
      );

      setBrands(filteredBrands);
      
      if (filteredBrands.length === 0) {
        toast({
          title: "No Results",
          description: `No brands found for "${searchTerm}". Try a different search term.`,
        });
      } else {
        toast({
          title: "Search Complete",
          description: `Found ${data.brands?.length || 0} brands matching "${searchTerm}".`,
        });
      }
    } catch (error) {
      console.error('Error searching brands:', error);
      toast({
        title: "Search Error",
        description: "Failed to search Loyalize brands. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const importBrand = async (brand: LoyalizeBrand) => {
    setImporting(brand.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-brands', {
        body: { brandId: brand.id },
        method: 'POST'
      });

      if (error) throw error;

      toast({
        title: "Brand Imported!",
        description: data.message || `${brand.name} has been added to your brands.`,
      });

      onBrandImported();
      
    } catch (error) {
      console.error('Error importing brand:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import brand. It may already exist.",
        variant: "destructive",
      });
    } finally {
      setImporting(null);
    }
  };

  const syncAllBrands = async () => {
    setSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-brands', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: "Brands Synced!",
        description: data.message || "All brands have been synced with Loyalize.",
      });

      onBrandImported();
      
    } catch (error) {
      console.error('Error syncing brands:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync brands with Loyalize.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 mb-4">
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Search Loyalize
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Search Loyalize Brands</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              {/* Search Controls */}
              <div className="space-y-4 mb-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-term">Brand Name Search</Label>
                    <div className="flex gap-2">
                      <Input
                        id="search-term"
                        placeholder="Type exact brand name (e.g., Amazon, Target, Nike)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchBrands()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={searchBrands} 
                        disabled={loading || !searchTerm.trim()}
                        className="bg-gradient-hero hover:opacity-90 px-6"
                      >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Search
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the exact brand name to find their commission rates and offerings
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Filter by Category (Optional)</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {brands.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Brand Offerings ({brands.length} found)</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setBrands([]);
                        setSearchTerm('');
                      }}
                    >
                      Clear Results
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 max-h-96 overflow-y-auto">
                    {brands.map((brand) => (
                      <Card key={brand.id} className="bg-card/80 backdrop-blur-sm border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              {brand.logo_url && (
                                <img 
                                  src={brand.logo_url} 
                                  alt={brand.name}
                                  className="w-16 h-16 object-contain rounded border bg-white"
                                />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-bold text-lg">{brand.name}</h5>
                                  {brand.status === 'featured' && (
                                    <Star className="w-5 h-5 text-yellow-500" />
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div className="space-y-1">
                                    <Badge variant="outline" className="font-semibold">
                                      {brand.commission_rate}% Commission
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                      What we earn per sale
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <Badge variant="secondary" className="font-semibold text-green-700 bg-green-100">
                                      ~{(brand.commission_rate * 0.25).toFixed(3)} NCTR/$1
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                      What users earn per dollar
                                    </p>
                                  </div>
                                </div>

                                {brand.category && (
                                  <Badge variant="outline" className="mb-3">
                                    {brand.category}
                                  </Badge>
                                )}
                                
                                {brand.description && (
                                  <div className="mb-3">
                                    <h6 className="font-semibold text-sm mb-1">Brand Overview:</h6>
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                      {brand.description}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              {brand.website_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(brand.website_url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Visit Store
                                </Button>
                              )}
                              
                              <Button 
                                size="sm"
                                onClick={() => importBrand(brand)}
                                disabled={importing === brand.id}
                                className="bg-gradient-hero hover:opacity-90"
                              >
                                {importing === brand.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-1" />
                                    Add Brand
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {brands.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">Search for Brand Offerings</h4>
                  <p className="text-muted-foreground mb-4">
                    Enter a brand name above to see their commission rates, categories, and partnership details.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-1">Try searching for popular brands like:</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {['Amazon', 'Target', 'Nike', 'Apple', 'Best Buy', 'Walmart'].map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchTerm(suggestion);
                            // Auto-search after setting the term
                            setTimeout(() => searchBrands(), 100);
                          }}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline" 
          onClick={syncAllBrands}
          disabled={syncing}
          className="flex items-center"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Sync All Brands
        </Button>
      </div>
    </>
  );
};

export default LoyalizeBrandSearch;
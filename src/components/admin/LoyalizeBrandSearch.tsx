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
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-brands', {
        body: {
          query: searchTerm,
          category: selectedCategory === 'all' ? '' : selectedCategory,
          limit: 20
        }
      });

      if (error) throw error;

      setBrands(data.brands || []);
      
      if (data.brands?.length === 0) {
        toast({
          title: "No Results",
          description: "No brands found matching your search criteria.",
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-term">Search Term</Label>
                     <Input
                      id="search-term"
                      placeholder="Brand name, gift cards, or keywords..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchBrands()}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
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

                <Button 
                  onClick={searchBrands} 
                  disabled={loading}
                  className="w-full bg-gradient-hero hover:opacity-90"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Search Brands
                </Button>
              </div>

              {/* Search Results */}
              {brands.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Search Results ({brands.length} brands found)</h4>
                  
                  <div className="grid gap-4 max-h-96 overflow-y-auto">
                    {brands.map((brand) => (
                      <Card key={brand.id} className="bg-card/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              {brand.logo_url && (
                                <img 
                                  src={brand.logo_url} 
                                  alt={brand.name}
                                  className="w-12 h-12 object-contain rounded border"
                                />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-semibold truncate">{brand.name}</h5>
                                  {brand.status === 'featured' && (
                                    <Star className="w-4 h-4 text-yellow-500" />
                                  )}
                                </div>
                                
                                <div className="flex gap-2 mb-2">
                                  <Badge variant="outline">
                                    {brand.commission_rate}% Commission
                                  </Badge>
                                  {brand.category && (
                                    <Badge variant="secondary">{brand.category}</Badge>
                                  )}
                                </div>
                                
                                {brand.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {brand.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              {brand.website_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(brand.website_url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                              
                              <Button 
                                size="sm"
                                onClick={() => importBrand(brand)}
                                disabled={importing === brand.id}
                                className="bg-gradient-hero hover:opacity-90"
                              >
                                {importing === brand.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-1" />
                                    Import
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

              {brands.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Search for brands above to see available partnerships from Loyalize.
                  </p>
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
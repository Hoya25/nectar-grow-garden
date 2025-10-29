import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, ExternalLink, Plus, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Brand {
  id: string;
  loyalize_id: string;
  name: string;
  description?: string;
  logo_url?: string;
  commission_rate: number;
  nctr_per_dollar: number;
  category?: string;
  website_url?: string;
  is_active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

interface LoyalizeBrandSyncProps {
  onBrandsUpdated: () => void;
}

const LoyalizeBrandSync = ({ onBrandsUpdated }: LoyalizeBrandSyncProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isCreatingOpportunity, setIsCreatingOpportunity] = useState(false);

  const syncBrands = async () => {
    setIsSyncing(true);
    try {
      console.log('Starting brand sync...');
      
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { action: 'sync_brands' }
      });

      if (error) {
        console.error('Sync error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      let toastTitle = "Brands Synced Successfully";
      let toastDescription = `${data.brands_count} brands have been synced`;
      
      if (data.is_sample_data) {
        toastTitle = "Sample Brands Loaded";
        toastDescription = `${data.brands_count} sample brands loaded (API key not configured)`;
      } else if (data.is_fallback_data) {
        toastTitle = "Fallback Brands Loaded";
        toastDescription = `${data.brands_count} brands loaded (API temporarily unavailable)`;
      } else {
        toastDescription += " from Loyalize";
      }

      toast({
        title: toastTitle,
        description: toastDescription,
      });

      onBrandsUpdated();
      loadBrandOfferings();
    } catch (error) {
      console.error('Error syncing brands:', error);
      
      const isAuthError = error.message?.includes('401') || error.message?.includes('Unauthorized');
      
      toast({
        title: "Sync Failed",
        description: isAuthError 
          ? "Authentication failed. Please check the Loyalize API key configuration." 
          : error.message || "Failed to sync brands from Loyalize",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const loadBrandOfferings = async () => {
    setIsLoadingBrands(true);
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { action: 'get_brand_offerings' }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Filter out NoBull brand
      const filteredBrands = (data.brands || []).filter((brand: Brand) => 
        brand.loyalize_id !== '30095' && 
        !brand.name.toLowerCase().includes('nobull')
      );
      
      setBrands(filteredBrands);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brand offerings",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const createOpportunityFromBrand = async (brand: Brand) => {
    setIsCreatingOpportunity(true);
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { 
          action: 'create_opportunity_from_brand',
          brand_id: brand.id,
          opportunity_type: 'shopping'
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Opportunity Created",
        description: `Created earning opportunity for ${brand.name}`,
      });

      onBrandsUpdated();
      setSelectedBrand(null);
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to create earning opportunity",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOpportunity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Loyalize Brand Integration</span>
            <div className="flex gap-2">
              <Button 
                onClick={loadBrandOfferings}
                variant="outline"
                size="sm"
                disabled={isLoadingBrands}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isLoadingBrands ? 'Loading...' : 'View Brands'}
              </Button>
              <Button 
                onClick={syncBrands}
                disabled={isSyncing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Brands'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Sync brand offerings from Loyalize API including logos, commission rates, and gift card offerings.
            If the API key is not configured, sample brands will be loaded for testing.
          </p>
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <strong>Note:</strong> Configure the LOYALIZE_API_KEY in Supabase Edge Function secrets to connect to the live Loyalize API.
          </div>
        </CardContent>
      </Card>

      {/* Brand Offerings Grid */}
      {brands.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id} className="hover:shadow-glow transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {brand.logo_url ? (
                      <img 
                        src={brand.logo_url} 
                        alt={`${brand.name} logo`}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gradient-hero flex items-center justify-center">
                        <span className="text-foreground font-bold text-sm">
                          {brand.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-sm">{brand.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {brand.category}
                      </Badge>
                    </div>
                  </div>
                  {brand.featured && (
                    <Badge className="bg-crypto-gold text-crypto-gold-foreground">
                      Featured
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission (Admin Only):</span>
                    <span className="font-medium">{(brand.commission_rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">User Earning Rate:</span>
                    <span className="font-medium text-foreground">{brand.nctr_per_dollar.toFixed(4)} NCTR/$1</span>
                  </div>
                </div>

                {brand.description && (
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                    {brand.description}
                  </p>
                )}

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedBrand(brand)}
                        className="flex-1"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Create Opportunity
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Earning Opportunity</DialogTitle>
                      </DialogHeader>
                      {selectedBrand && (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            {selectedBrand.logo_url && (
                              <img 
                                src={selectedBrand.logo_url} 
                                alt={selectedBrand.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <div>
                              <h3 className="font-semibold">{selectedBrand.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {(selectedBrand.commission_rate * 100).toFixed(1)}% commission • {selectedBrand.nctr_per_dollar.toFixed(4)} NCTR per $1
                              </p>
                            </div>
                          </div>
                          
                          <p className="text-sm">
                            This will create an earning opportunity that allows users to earn {selectedBrand.nctr_per_dollar.toFixed(4)} NCTR 
                            for every $1 spent with {selectedBrand.name}.
                          </p>
                          
                          <div className="flex gap-2 pt-4">
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedBrand(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                             <Button 
                               onClick={() => createOpportunityFromBrand(selectedBrand)}
                               disabled={isCreatingOpportunity}
                               className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                             >
                              {isCreatingOpportunity ? 'Creating...' : 'Create Opportunity'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {brand.website_url && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => window.open(brand.website_url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {brands.length === 0 && !isLoadingBrands && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No brands loaded yet</p>
            <Button onClick={loadBrandOfferings} variant="outline">
              Load Brand Offerings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoyalizeBrandSync;
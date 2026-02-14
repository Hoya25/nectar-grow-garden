import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus } from 'lucide-react';

interface ImpactCampaign {
  Id: string;
  Name: string;
  AdvertiserName?: string;
  Status?: string;
  LogoUrl?: string;
  CommissionRate?: number;
  CommissionType?: string;
  Description?: string;
  WebsiteUrl?: string;
  DefaultCommission?: {
    Type?: string;
    Amount?: number;
  };
}

interface ImpactBrandSearchProps {
  onOpportunitiesUpdated: () => void;
  onBrandSelect?: (brandData: {
    name: string;
    logoUrl: string | null;
    affiliateLink: string;
    description: string;
    commissionRate: number;
  }) => void;
}

const ImpactBrandSearch = ({ onOpportunitiesUpdated, onBrandSelect }: ImpactBrandSearchProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns, setCampaigns] = useState<ImpactCampaign[]>([]);
  const [generatingForCampaign, setGeneratingForCampaign] = useState<string | null>(null);

  const handleCampaignSelect = async (campaign: ImpactCampaign) => {
    console.log('🎯 handleCampaignSelect called with:', campaign);
    
    if (!campaign || !campaign.Id) {
      console.error('❌ Invalid campaign object:', campaign);
      toast({
        title: "Error",
        description: "Invalid campaign data. Please try searching again.",
        variant: "destructive",
      });
      return;
    }

    if (!onBrandSelect) {
      console.log('⚠️ No onBrandSelect callback provided');
      return;
    }

    setGeneratingForCampaign(campaign.Id);
    
    try {
      console.log('🔗 Auto-generating affiliate link for campaign ID:', campaign.Id);
      console.log('📋 Campaign details:', {
        name: campaign.Name,
        advertiser: campaign.AdvertiserName,
        websiteUrl: campaign.WebsiteUrl
      });
      
      // Generate the Impact.com tracking link
      // The API will return Impact's native tracking URL format
      const { data, error } = await supabase.functions.invoke('impact-affiliate', {
        body: { 
          action: 'generate',
          advertiserId: campaign.Id,
          productUrl: campaign.WebsiteUrl || ''
        }
      });

      if (error) {
        console.error('Generate link error:', error);
        throw error;
      }

      if (!data.success || !data.affiliateLink) {
        throw new Error(data.error || 'Failed to generate link');
      }

      const commissionRate = campaign.CommissionRate || campaign.DefaultCommission?.Amount || 5;
      
      // Auto-populate form
      onBrandSelect({
        name: campaign.AdvertiserName || campaign.Name || 'Unknown Brand',
        logoUrl: campaign.LogoUrl || null,
        affiliateLink: data.affiliateLink,
        description: campaign.Description || `Earn NCTR tokens when you shop at ${campaign.Name || campaign.AdvertiserName}. Commission: ${commissionRate}%`,
        commissionRate: commissionRate
      });

      toast({
        title: "Brand Loaded",
        description: `${campaign.AdvertiserName || campaign.Name} tracking link generated and form populated`,
      });

    } catch (error) {
      console.error('Error generating link:', error);
      
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate affiliate link",
        variant: "destructive",
      });
    } finally {
      setGeneratingForCampaign(null);
    }
  };

  const searchCampaigns = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a brand or advertiser name to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setCampaigns([]); // Clear previous results
    try {
      console.log('Searching Impact.com campaigns for:', searchTerm);
      
      const { data, error } = await supabase.functions.invoke('impact-affiliate', {
        body: { 
          action: 'search',
          searchTerm: searchTerm.trim()
        }
      });

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      // Check if the response contains an error from the API
      if (data.error) {
        const errorMsg = data.help ? `${data.error}\n\n${data.help}` : data.error;
        throw new Error(errorMsg);
      }

      if (!data.campaigns) {
        throw new Error('No campaigns data returned');
      }

      setCampaigns(data.campaigns);
      
      toast({
        title: "Search Complete",
        description: `Found ${data.campaigns.length} US brands matching "${searchTerm}"`,
      });

    } catch (error) {
      console.error('Error searching Impact.com:', error);
      
      const errorMessage = error.message || "Failed to search Impact.com. Check your API credentials.";
      const lines = errorMessage.split('\n');
      
      toast({
        title: "Search Failed",
        description: lines[0],
        variant: "destructive",
      });
      
      // If there's help text, show it in a separate toast
      if (lines.length > 1) {
        setTimeout(() => {
          toast({
            title: "How to Fix",
            description: lines.slice(1).join('\n'),
            variant: "default",
          });
        }, 500);
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Impact.com Campaign Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Brands or Advertisers</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="search"
                  placeholder="e.g., Nike, Amazon, Target..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCampaigns()}
                />
                <Button 
                  onClick={searchCampaigns}
                  disabled={isSearching}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Search className={`w-4 h-4 mr-2 ${isSearching ? 'animate-pulse' : ''}`} />
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Search Impact.com's US network. Click any brand to auto-generate tracking link and populate the form.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Results Grid */}
      {campaigns.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium text-foreground">
            {campaigns.length} US {campaigns.length === 1 ? 'brand' : 'brands'} found - click to use
          </p>
        </div>
      )}
      
      {campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const isGenerating = generatingForCampaign === campaign.Id;
            
            return (
              <Card 
                key={campaign.Id} 
                className={`hover:shadow-glow transition-all ${isGenerating ? 'ring-2 ring-primary' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {campaign.LogoUrl && (
                      <img 
                        src={campaign.LogoUrl} 
                        alt={`${campaign.Name} logo`}
                        className="w-12 h-12 object-contain rounded bg-muted p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{campaign.Name}</h4>
                      {campaign.AdvertiserName && campaign.AdvertiserName !== campaign.Name && (
                        <p className="text-xs text-muted-foreground">{campaign.AdvertiserName}</p>
                      )}
                      {campaign.Status && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {campaign.Status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(campaign.CommissionRate || campaign.DefaultCommission) && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Commission:</span>
                          <span className="font-medium text-primary">
                            {campaign.CommissionRate 
                              ? `${campaign.CommissionRate}${campaign.CommissionType === 'percentage' ? '%' : ''}` 
                              : campaign.DefaultCommission?.Amount 
                                ? `${campaign.DefaultCommission.Amount}%` 
                                : 'Variable'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Est. NCTR per $1:</span>
                          <span className="font-medium text-primary">
                            {(campaign.CommissionRate || campaign.DefaultCommission?.Amount)
                              ? ((campaign.CommissionRate || campaign.DefaultCommission?.Amount || 0) * 20).toFixed(0) 
                              : 'TBD'} NCTR
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <Button 
                    size="sm" 
                    variant={isGenerating ? "secondary" : "default"}
                    disabled={isGenerating}
                    className="w-full"
                    onClick={() => {
                      console.log('🖱️ Button clicked for campaign:', campaign);
                      handleCampaignSelect(campaign);
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-3 h-3 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        Use This Brand
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && campaigns.length === 0 && searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No campaigns found for "{searchTerm}". Try searching for different brand names.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImpactBrandSearch;

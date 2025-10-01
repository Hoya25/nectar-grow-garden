import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, ExternalLink, Plus, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  const [selectedCampaign, setSelectedCampaign] = useState<ImpactCampaign | null>(null);
  const [productUrl, setProductUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

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
        description: `Found ${data.campaigns.length} campaigns on Impact.com`,
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

  const generateAffiliateLink = async (campaign: ImpactCampaign) => {
    if (!productUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a product URL to generate tracking link",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingLink(true);
    try {
      console.log('Generating affiliate link for campaign:', campaign.Id);
      
      const { data, error } = await supabase.functions.invoke('impact-affiliate', {
        body: { 
          action: 'generate',
          advertiserId: campaign.Id,
          productUrl: productUrl.trim()
        }
      });

      if (error) {
        console.error('Generate link error:', error);
        throw error;
      }

      if (!data.success || !data.affiliateLink) {
        throw new Error(data.error || 'Failed to generate link');
      }

      setGeneratedLink(data.affiliateLink);
      
      toast({
        title: "Link Generated",
        description: `Created tracking link for ${campaign.Name}`,
      });

      // Auto-populate form if callback provided
      if (onBrandSelect) {
        const commissionRate = campaign.CommissionRate || campaign.DefaultCommission?.Amount || 5;
        onBrandSelect({
          name: campaign.AdvertiserName || campaign.Name || 'Unknown Brand',
          logoUrl: campaign.LogoUrl || null,
          affiliateLink: data.affiliateLink,
          description: campaign.Description || `Earn NCTR tokens when you shop at ${campaign.Name || campaign.AdvertiserName}. Commission: ${commissionRate}%`,
          commissionRate: commissionRate
        });
      }

    } catch (error) {
      console.error('Error generating link:', error);
      
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate affiliate link",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const createOpportunityFromCampaign = async () => {
    if (!selectedCampaign || !generatedLink) {
      toast({
        title: "Missing Information",
        description: "Please generate an affiliate link first",
        variant: "destructive",
      });
      return;
    }

    try {
      const commissionRate = selectedCampaign.CommissionRate || selectedCampaign.DefaultCommission?.Amount || 5;
      const nctrPerDollar = commissionRate * 20; // Convert commission % to NCTR per dollar

      const { data, error } = await supabase
        .from('earning_opportunities')
        .insert({
          title: `Shop ${selectedCampaign.Name || selectedCampaign.AdvertiserName}`,
          description: selectedCampaign.Description || `Earn NCTR tokens when you shop at ${selectedCampaign.Name || selectedCampaign.AdvertiserName} through Impact.com. Commission: ${commissionRate}%`,
          opportunity_type: 'shopping',
          partner_name: selectedCampaign.AdvertiserName || selectedCampaign.Name,
          partner_logo_url: selectedCampaign.LogoUrl || null,
          affiliate_link: generatedLink,
          reward_per_dollar: nctrPerDollar,
          is_active: true,
          featured: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Opportunity Created",
        description: `Created earning opportunity for ${selectedCampaign.Name}`,
      });

      onOpportunitiesUpdated();
      setSelectedCampaign(null);
      setGeneratedLink('');
      setProductUrl('');
      
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create earning opportunity",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
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
              Search Impact.com's network of advertisers and brands. View commission rates and generate tracked affiliate links.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Results Grid */}
      {campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.Id} className="hover:shadow-glow transition-shadow">
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
                        <span className="font-medium text-crypto-gold">
                          {campaign.CommissionRate 
                            ? `${campaign.CommissionRate}${campaign.CommissionType === 'percentage' ? '%' : ''}` 
                            : campaign.DefaultCommission?.Amount 
                              ? `${campaign.DefaultCommission.Amount}%` 
                              : 'Variable'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Est. NCTR per $1:</span>
                        <span className="font-medium text-crypto-gold">
                          {(campaign.CommissionRate || campaign.DefaultCommission?.Amount)
                            ? ((campaign.CommissionRate || campaign.DefaultCommission?.Amount || 0) * 20).toFixed(0) 
                            : 'TBD'} NCTR
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setGeneratedLink('');
                        setProductUrl('');
                      }}
                      className="w-full"
                    >
                      <LinkIcon className="w-3 h-3 mr-1" />
                      Generate Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Generate Affiliate Link</DialogTitle>
                    </DialogHeader>
                    {selectedCampaign && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-1">{selectedCampaign.Name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Campaign ID: {selectedCampaign.Id}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="productUrl">Product URL</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="productUrl"
                              placeholder="https://example.com/product"
                              value={productUrl}
                              onChange={(e) => setProductUrl(e.target.value)}
                            />
                            <Button 
                              onClick={() => generateAffiliateLink(selectedCampaign)}
                              disabled={isGeneratingLink}
                            >
                              {isGeneratingLink ? 'Generating...' : 'Generate'}
                            </Button>
                          </div>
                        </div>

                        {generatedLink && (
                          <div className="space-y-3">
                            <div>
                              <Label>Generated Tracking Link</Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  value={generatedLink}
                                  readOnly
                                  className="font-mono text-xs"
                                />
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(generatedLink)}
                                >
                                  Copy
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(generatedLink, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t">
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setSelectedCampaign(null);
                                  setGeneratedLink('');
                                  setProductUrl('');
                                }}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={createOpportunityFromCampaign}
                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Opportunity
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {campaigns.length === 0 && !isSearching && searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No campaigns found. Try a different search term.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImpactBrandSearch;

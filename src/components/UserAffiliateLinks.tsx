import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, Link, Copy, Loader2, User, TrendingUp } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  commission_rate: number;
  nctr_per_dollar: number;
  category?: string;
  is_gift_card?: boolean;
}

interface GeneratedLink {
  brand: Brand;
  affiliate_link: string;
  tracking_id: string;
  expires_at: string;
  created_at: string;
}

const UserAffiliateLinks = () => {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [productUrl, setProductUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadBrands();
      loadUserLinks();
    }
  }, [user]);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brands",
        variant: "destructive",
      });
    }
  };

  const loadUserLinks = async () => {
    // Load user's generated affiliate links from transactions
    try {
      const { data, error } = await supabase
        .from('nctr_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('transaction_type', 'pending')
        .eq('earning_source', 'affiliate_purchase')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      // Transform transaction data to match GeneratedLink interface
      // This is a simplified version - in production you'd store links properly
    } catch (error) {
      console.error('Error loading user links:', error);
    }
  };

  const generateAffiliateLink = async (brand: Brand) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate affiliate links",
        variant: "destructive",
      });
      return;
    }

    if (!productUrl.trim()) {
      toast({
        title: "Product URL Required",
        description: "Please enter a product URL to create an affiliate link",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-affiliate', {
        body: {
          action: 'generate',
          brandId: brand.id,
          userId: user.id,
          productUrl: productUrl.trim()
        }
      });

      if (error) throw error;

      const newLink: GeneratedLink = {
        brand: data.brand,
        affiliate_link: data.affiliate_link,
        tracking_id: data.tracking_id,
        expires_at: data.expires_at,
        created_at: new Date().toISOString()
      };

      setGeneratedLinks(prev => [newLink, ...prev]);
      setProductUrl('');

      toast({
        title: "Affiliate Link Generated",
        description: `Your personalized link for ${brand.name} is ready!`,
      });

    } catch (error) {
      console.error('Error generating affiliate link:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate affiliate link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Copied!",
        description: "Affiliate link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to generate affiliate links</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Your Affiliate Links
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate personalized affiliate links and earn NCTR tokens when people make purchases through your links.
          </p>
        </CardHeader>
      </Card>

      {/* Timeline Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  ⏱️ Purchase Credit Timeline
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  NCTR rewards are credited after merchant confirmation, typically within <strong>24-72 hours</strong> of purchase.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span><strong>Step 1:</strong> Purchase made through your link</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span><strong>Step 2:</strong> Merchant confirms order (1-24 hours)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span><strong>Step 3:</strong> Commission reported to system (24-48 hours)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span><strong>Step 4:</strong> NCTR automatically credited to your account</span>
                </div>
              </div>

              <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                💡 Returns or cancellations may delay or void rewards. Track your pending transactions in your dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product URL Input */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product URL</label>
              <Input
                placeholder="Enter the product URL you want to promote..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Search Brands</label>
              <Input
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Brands */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBrands.map((brand) => (
          <Card key={brand.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {brand.logo_url && (
                    <img 
                      src={brand.logo_url} 
                      alt={brand.name}
                      className="w-8 h-8 object-contain"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{brand.name}</h3>
                    {brand.category && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {brand.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>


              <Button
                onClick={() => generateAffiliateLink(brand)}
                disabled={loading || !productUrl.trim()}
                className="w-full"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link className="w-4 h-4 mr-2" />
                )}
                Generate Link
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generated Links */}
      {generatedLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Generated Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedLinks.map((link, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {link.brand.logo_url && (
                      <img 
                        src={link.brand.logo_url} 
                        alt={link.brand.name}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <span className="font-semibold">{link.brand.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {link.tracking_id.substring(0, 8)}...
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(link.affiliate_link)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(link.affiliate_link, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground break-all">
                  {link.affiliate_link}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Created: {new Date(link.created_at).toLocaleString()}</span>
                  <span>Expires: {new Date(link.expires_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserAffiliateLinks;
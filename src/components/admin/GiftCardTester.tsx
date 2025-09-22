import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Search, ExternalLink, Gift, Loader2, CheckCircle, User } from 'lucide-react';

interface TestResult {
  brand_name: string;
  found: boolean;
  commission_rate?: number;
  affiliate_link?: string;
  tracking_id?: string;
  user_credited?: string;
  error?: string;
}

const GiftCardTester = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('Uber Gift Cards');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const testGiftCardSearch = async () => {
    setTesting(true);
    setResults([]);

    try {
      console.log(`🔍 Testing search for: ${searchTerm}`);
      
      // Test 1: Search for the brand
      const { data: searchData, error: searchError } = await supabase.functions.invoke('loyalize-brands', {
        body: {
          action: 'search',
          query: searchTerm,
          limit: 10
        }
      });

      if (searchError) {
        console.error('Search error:', searchError);
        setResults([{
          brand_name: searchTerm,
          found: false,
          error: `Search failed: ${searchError.message}`
        }]);
        return;
      }

      const brands = searchData?.brands || [];
      console.log(`Found ${brands.length} brands for "${searchTerm}"`);

      const testResults: TestResult[] = [];

      if (brands.length === 0) {
        testResults.push({
          brand_name: searchTerm,
          found: false,
          error: 'No brands found in search results'
        });
      } else {
        // Test each found brand
        for (const brand of brands.slice(0, 3)) { // Test first 3 results
          try {
            // Test 2: Try to generate affiliate link with real user ID
            const testUserId = user?.id || 'test-user-admin';
            const { data: affiliateData, error: affiliateError } = await supabase.functions.invoke('loyalize-affiliate', {
              body: {
                action: 'generate',
                brandId: brand.id,
                userId: testUserId,
                productUrl: brand.website_url || `https://${brand.name.toLowerCase().replace(/\s+/g, '')}.com`
              }
            });

            testResults.push({
              brand_name: brand.name,
              found: true,
              commission_rate: brand.commission_rate,
              affiliate_link: affiliateData?.affiliate_link,
              tracking_id: affiliateData?.tracking_id,
              user_credited: testUserId,
              error: affiliateError ? `Affiliate link generation failed: ${affiliateError.message}` : undefined
            });

          } catch (error) {
            testResults.push({
              brand_name: brand.name,
              found: true,
              commission_rate: brand.commission_rate,
              error: `Affiliate test failed: ${error.message}`
            });
          }
        }
      }

      setResults(testResults);

      // Show summary toast
      const foundCount = testResults.filter(r => r.found).length;
      const workingLinks = testResults.filter(r => r.found && r.affiliate_link && !r.error).length;
      
      toast({
        title: "Test Complete",
        description: `Found ${foundCount} brands, ${workingLinks} with working affiliate links`,
      });

    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test Failed",
        description: `Testing failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Gift Card Partnership Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter brand name (e.g., Uber Gift Cards, Amazon, Target)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && testGiftCardSearch()}
            className="flex-1"
          />
          <Button 
            onClick={testGiftCardSearch}
            disabled={testing || !searchTerm.trim()}
            className="bg-gradient-hero hover:opacity-90"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Test Partnership
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          This tool tests if a brand is available through our Loyalize integration and can generate affiliate links.
        </p>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Test Results:</h4>
            {results.map((result, index) => (
              <Card key={index} className={`border-l-4 ${result.found && !result.error ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold">{result.brand_name}</h5>
                        {result.found && !result.error ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        )}
                      </div>

                      {result.found && (
                        <div className="space-y-1 mb-2">
                          {result.commission_rate && (
                            <Badge variant="outline" className="text-xs">
                              {result.commission_rate}% Commission
                            </Badge>
                          )}
                          {result.affiliate_link && (
                            <Badge variant="secondary" className="text-xs">
                              Affiliate Link Generated
                            </Badge>
                          )}
                          {result.tracking_id && (
                            <Badge variant="outline" className="text-xs">
                              <User className="w-3 h-3 mr-1" />
                              Tracking: {result.tracking_id.substring(0, 12)}...
                            </Badge>
                          )}
                          {result.user_credited && (
                            <Badge variant="secondary" className="text-xs">
                              Credits: {result.user_credited === user?.id ? 'You' : 'Test User'}
                            </Badge>
                          )}
                        </div>
                      )}

                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>

                    {result.affiliate_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(result.affiliate_link, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Test Link
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Test Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <p className="text-sm text-muted-foreground w-full mb-2">Quick Tests:</p>
          {['Uber Gift Cards', 'Amazon', 'Target', 'Starbucks', 'Apple'].map((brand) => (
            <Button
              key={brand}
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm(brand);
                setTimeout(() => testGiftCardSearch(), 100);
              }}
              className="text-xs"
            >
              Test {brand}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GiftCardTester;
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Play, RefreshCw, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LoyalizeApiTester = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testFullSync = async () => {
    setIsTesting(true);
    setResults(null);
    
    try {
      console.log('🧪 Starting comprehensive Loyalize API test...');
      
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { action: 'sync_brands' }
      });

      if (error) {
        console.error('❌ Sync test error:', error);
        throw error;
      }

      console.log('✅ Sync test completed:', data);
      setResults(data);

      if (data.success) {
        toast({
          title: "API Test Completed",
          description: `Retrieved ${data.brands_count} brands. Check console for details.`,
        });
      } else {
        toast({
          title: "API Test Warning", 
          description: data.message || 'Check console for details',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || 'Check console for details',
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const checkCurrentBrandCount = async () => {
    try {
      const { count, error } = await supabase
        .from('brands')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      toast({
        title: "Current Brand Count",
        description: `Database contains ${count} brands`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check brand count",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Loyalize API Comprehensive Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Test the full Loyalize API integration to fetch thousands of brands and gift cards.
          This will show detailed API responses and pagination info in the console.
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={testFullSync}
            disabled={isTesting}
            className="flex-1"
          >
            <Play className={`w-4 h-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing Full API Sync...' : 'Test Full Sync'}
          </Button>
          
          <Button 
            onClick={checkCurrentBrandCount}
            variant="outline"
          >
            <Database className="w-4 h-4 mr-2" />
            Check Current Count
          </Button>
        </div>

        {results && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold mb-3">Test Results:</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium">Success:</span>
                <Badge variant={results.success ? "default" : "destructive"} className="ml-2">
                  {results.success ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Brands Count:</span>
                <Badge variant="secondary" className="ml-2">
                  {results.brands_count || 0}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Data Source:</span>
                <Badge variant="outline" className="ml-2">
                  {results.is_sample_data ? 'Sample' : results.is_fallback_data ? 'Fallback' : 'Live API'}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Gift Cards Included:</span>
                <Badge variant={results.uber_gift_cards_included ? "default" : "secondary"} className="ml-2">
                  {results.uber_gift_cards_included ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
            
            {results.message && (
              <p className="text-sm text-muted-foreground bg-background/50 p-2 rounded">
                <strong>Message:</strong> {results.message}
              </p>
            )}
            
            {results.error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded mt-2">
                <strong>Error:</strong> {results.error}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground mt-4">
              💡 Check the Edge Function logs for detailed API responses and pagination info.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyalizeApiTester;
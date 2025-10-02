import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search, Link, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const TrackingDiagnostics = () => {
  console.log('🔍 TrackingDiagnostics component mounted');
  const [checking, setChecking] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [userId, setUserId] = useState('');
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const checkTracking = async () => {
    if (!trackingId && !userId) {
      toast({
        title: "Input Required",
        description: "Please enter either a tracking ID or user ID",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);
    setDiagnosticResult(null);

    try {
      console.log('🔍 Running tracking diagnostics...');
      
      // Check affiliate_link_mappings
      let mappingQuery = supabase
        .from('affiliate_link_mappings')
        .select('*');
      
      if (trackingId) {
        mappingQuery = mappingQuery.eq('tracking_id', trackingId);
      } else {
        mappingQuery = mappingQuery.eq('user_id', userId);
      }

      const { data: mappings, error: mappingError } = await mappingQuery;

      if (mappingError) throw mappingError;

      // Check recent transactions for this user
      let transactionsData = null;
      if (userId || (mappings && mappings.length > 0)) {
        const targetUserId = userId || mappings[0]?.user_id;
        const { data: transactions } = await supabase
          .from('nctr_transactions')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        transactionsData = transactions;
      }

      // Check if tracking IDs exist in Loyalize's recent transactions
      const result = {
        mappings_found: mappings?.length || 0,
        mappings: mappings || [],
        recent_transactions: transactionsData || [],
        status: mappings && mappings.length > 0 ? 'active' : 'not_found',
        recommendation: mappings && mappings.length > 0
          ? 'Tracking is set up correctly. Purchases should credit within 24-72 hours after merchant confirmation.'
          : 'No tracking mapping found. This purchase may not be tracked. Create a new affiliate link before making purchases.'
      };

      setDiagnosticResult(result);

      toast({
        title: "Diagnostic Complete",
        description: `Found ${result.mappings_found} tracking mapping(s)`,
      });

    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      toast({
        title: "Diagnostic Failed",
        description: error.message || "Failed to check tracking",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const createTestMapping = async () => {
    if (!trackingId || !userId) {
      toast({
        title: "Missing Information",
        description: "Please enter both tracking ID and user ID",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔧 Creating test mapping...');
      
      const { error } = await supabase
        .from('affiliate_link_mappings')
        .insert({
          tracking_id: trackingId,
          user_id: userId,
          brand_id: null, // Will be determined during sync
        });

      if (error) throw error;

      toast({
        title: "✅ Mapping Created",
        description: "You can now run the Loyalize sync to credit this transaction",
      });

      // Rerun diagnostic
      await checkTracking();

    } catch (error: any) {
      console.error('❌ Mapping creation error:', error);
      toast({
        title: "Failed to Create Mapping",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Tracking Diagnostics
          </CardTitle>
          <CardDescription>
            Check if affiliate link tracking is properly configured for a purchase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              This checks if tracking IDs from Loyalize purchases match entries in our database. 
              Use this to debug why purchases aren&apos;t being credited.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tracking_id">Tracking ID (sid from Loyalize)</Label>
              <Input
                id="tracking_id"
                placeholder="e.g., 68cd62bc2b6bd0277b3b7df3"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found in Loyalize transaction details
              </p>
            </div>

            <div>
              <Label htmlFor="user_id">User ID (Optional)</Label>
              <Input
                id="user_id"
                placeholder="User UUID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Check all mappings for this user
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={checkTracking} 
              disabled={checking}
              className="flex-1"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Check Tracking
                </>
              )}
            </Button>

            {trackingId && userId && (
              <Button 
                onClick={createTestMapping}
                variant="outline"
              >
                <Link className="w-4 h-4 mr-2" />
                Create Mapping
              </Button>
            )}
          </div>

          {diagnosticResult && (
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                {diagnosticResult.status === 'active' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <h4 className="font-semibold">
                  {diagnosticResult.status === 'active' ? 'Tracking Active' : 'Tracking Not Found'}
                </h4>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Mappings Found:</span>
                  <span className="ml-2 font-semibold">{diagnosticResult.mappings_found}</span>
                </div>

                {diagnosticResult.mappings_found > 0 && (
                  <div className="border-t pt-2">
                    <p className="font-medium mb-2">Tracking Details:</p>
                    {diagnosticResult.mappings.map((mapping: any, idx: number) => (
                      <div key={idx} className="bg-background p-2 rounded text-xs space-y-1">
                        <div>Tracking ID: <code>{mapping.tracking_id}</code></div>
                        <div>User ID: <code>{mapping.user_id.slice(0, 8)}...</code></div>
                        <div>Created: {new Date(mapping.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                {diagnosticResult.recent_transactions?.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="font-medium mb-2">Recent Transactions:</p>
                    {diagnosticResult.recent_transactions.map((txn: any, idx: number) => (
                      <div key={idx} className="bg-background p-2 rounded text-xs">
                        <div>{txn.description}</div>
                        <div className="text-muted-foreground">
                          {txn.nctr_amount} NCTR • {txn.status} • {new Date(txn.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Alert className="mt-2">
                  <AlertDescription>
                    <strong>Recommendation:</strong> {diagnosticResult.recommendation}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-sm">💡 Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0">1</div>
            <div>
              <strong>Before purchase:</strong> Generate an affiliate link from the Partner Brands or Curated Links tabs
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0">2</div>
            <div>
              <strong>During purchase:</strong> Make sure you click through the generated link
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0">3</div>
            <div>
              <strong>After purchase:</strong> Use this diagnostic tool to verify tracking ID exists
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0">4</div>
            <div>
              <strong>Force sync:</strong> If tracking exists, run Loyalize sync to credit immediately (don&apos;t wait 24h)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

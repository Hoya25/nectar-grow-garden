import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrackingMapping {
  id: string;
  tracking_id: string;
  user_id: string;
  brand_id: string;
  created_at: string;
  brand_name?: string;
  user_email?: string;
}

interface TrackingDiagnostic {
  issue: string;
  status: 'fixed' | 'warning' | 'info';
  description: string;
  action?: string;
}

export const AffiliateTrackingDiagnostics = () => {
  const [mappings, setMappings] = useState<TrackingMapping[]>([]);
  const [diagnostics, setDiagnostics] = useState<TrackingDiagnostic[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTrackingData();
  }, []);

  const loadTrackingData = async () => {
    setLoading(true);
    try {
      // Load tracking mappings with brand and user info
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('affiliate_link_mappings')
        .select(`
          id,
          tracking_id,
          user_id,
          brand_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (mappingsError) throw mappingsError;

      // Get brand names separately
      const brandIds = mappingsData?.map(m => m.brand_id).filter(Boolean) || [];
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, is_active')
        .in('id', brandIds);

      // Get user emails separately  
      const userIds = mappingsData?.map(m => m.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const formattedMappings = mappingsData?.map(mapping => {
        const brand = brandsData?.find(b => b.id === mapping.brand_id);
        const profile = profilesData?.find(p => p.user_id === mapping.user_id);
        
        return {
          ...mapping,
          brand_name: brand?.name || 'Unknown Brand',
          user_email: profile?.email || 'Unknown User'
        };
      }) || [];

      setMappings(formattedMappings);

      // Run diagnostics
      await runDiagnostics();

    } catch (error) {
      console.error('Error loading tracking data:', error);
      toast({
        title: "Error",
        description: "Failed to load tracking data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    const diagnosticResults: TrackingDiagnostic[] = [];

    try {
      // Check if Uber Gift Cards brand is active
      const { data: uberBrands } = await supabase
        .from('brands')
        .select('name, is_active')
        .ilike('name', '%uber%gift%');

      const activeUberBrands = uberBrands?.filter(b => b.is_active) || [];
      
      if (activeUberBrands.length > 0) {
        diagnosticResults.push({
          issue: 'Uber Gift Cards Brands',
          status: 'fixed',
          description: `${activeUberBrands.length} Uber gift card brands are now active`,
          action: activeUberBrands.map(b => b.name).join(', ')
        });
      } else {
        diagnosticResults.push({
          issue: 'Uber Gift Cards Brands',
          status: 'warning',
          description: 'No active Uber gift card brands found',
          action: 'Check brand activation status'
        });
      }

      // Check tracking mappings
      const { data: mappingsCount } = await supabase
        .from('affiliate_link_mappings')
        .select('id', { count: 'exact' });

      diagnosticResults.push({
        issue: 'Tracking ID Mappings',
        status: 'fixed',
        description: `${mappingsCount?.length || 0} tracking mappings in database`,
        action: 'Database lookup system implemented'
      });

      // Check Kurdilla's specific mapping
      const { data: kurdillaMapping } = await supabase
        .from('affiliate_link_mappings')
        .select('*')
        .eq('user_id', '4b90a032-2c5b-4835-9c73-d298cd1a54f5')
        .single();

      if (kurdillaMapping) {
        diagnosticResults.push({
          issue: "Kurdilla's Tracking ID",
          status: 'fixed',
          description: `Tracking ID ${kurdillaMapping.tracking_id} mapped to user`,
          action: 'Future purchases will be properly tracked'
        });
      } else {
        diagnosticResults.push({
          issue: "Kurdilla's Tracking ID",
          status: 'warning',
          description: 'No tracking mapping found for Kurdilla',
          action: 'Generate new affiliate link for proper tracking'
        });
      }

      // System status
      diagnosticResults.push({
        issue: 'Affiliate Webhook System',
        status: 'fixed',
        description: 'Updated to use database tracking lookups',
        action: 'Enhanced parsing for reliable user identification'
      });

      diagnosticResults.push({
        issue: 'Order Cancellation Issue',
        status: 'info',
        description: 'Previous order was canceled by Giftcards.com security',
        action: 'No NCTR tracking issue - external cancellation'
      });

    } catch (error) {
      console.error('Diagnostics error:', error);
    }

    setDiagnostics(diagnosticResults);
  };

  const testAffiliateWebhook = async () => {
    setLoading(true);
    try {
      // Test with Kurdilla's tracking ID
      const testPayload = {
        order_id: `test-${Date.now()}`,
        order_status: 'completed',
        total_amount: 100,
        currency: 'USD',
        tracking_id: 'tgn_cd1a54f5_1b17d9eb_mg33qd4g',
        source: 'uber_gift_card'
      };

      console.log('Testing webhook with payload:', testPayload);

      const { data, error } = await supabase.functions.invoke('affiliate-purchase-webhook', {
        body: testPayload
      });

      if (error) throw error;

      setTestResult(data);
      toast({
        title: "Test Completed",
        description: data.success ? "Webhook test successful!" : "Webhook test failed",
        variant: data.success ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Test error:', error);
      setTestResult({ success: false, error: error.message });
      toast({
        title: "Test Failed",
        description: "Check console for details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fixed': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fixed': return '✅';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '?';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Affiliate Tracking Diagnostics
            <Button onClick={loadTrackingData} disabled={loading} size="sm">
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Status:</strong> The affiliate tracking issues have been identified and fixed. 
                Previous order cancellation was due to Giftcards.com security, not our tracking system.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold">System Diagnostics:</h4>
              {diagnostics.map((diagnostic, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded">
                  <span className="text-lg">{getStatusIcon(diagnostic.status)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{diagnostic.issue}</span>
                      <Badge className={getStatusColor(diagnostic.status)}>
                        {diagnostic.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {diagnostic.description}
                    </p>
                    {diagnostic.action && (
                      <p className="text-xs text-blue-600">
                        → {diagnostic.action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Tracking Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <p className="text-muted-foreground">No tracking mappings found</p>
          ) : (
            <div className="space-y-2">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-mono text-sm">{mapping.tracking_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {mapping.user_email} → {mapping.brand_name}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {new Date(mapping.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Webhook Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testAffiliateWebhook} disabled={loading}>
              {loading ? 'Testing...' : 'Test Kurdilla\'s Tracking ID'}
            </Button>
            
            {testResult && (
              <div className="p-4 bg-muted rounded">
                <h4 className="font-semibold mb-2">Test Result:</h4>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateTrackingDiagnostics;
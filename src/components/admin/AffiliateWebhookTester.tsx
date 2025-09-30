import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TestTube, Webhook, DollarSign, User } from 'lucide-react';

interface TestResult {
  success: boolean;
  response: any;
  timestamp: string;
}

export const AffiliateWebhookTester = () => {
  const [testData, setTestData] = useState({
    user_id: '4b90a032-2c5b-4835-9c73-d298cd1a54f5', // Kurdilla's ID
    order_id: 'UBER_' + Date.now(),
    order_status: 'completed',
    total_amount: 100,
    currency: 'USD',
    tracking_id: 'tgn_cd1a54f5_1b17d9eb_mg33qd4g', // Correct Kurdilla tracking ID
    source: 'Uber Gift Card',
    customer_email: 'jjkurdilla@gmail.com',
    products: [{ name: 'Uber Gift Card', amount: 100, quantity: 1 }]
  });
  
  const [customPayload, setCustomPayload] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testAffiliateWebhook = async (useCustom = false) => {
    setLoading(true);
    try {
      let payload;
      
      if (useCustom) {
        try {
          payload = JSON.parse(customPayload);
        } catch (e) {
          throw new Error('Invalid JSON in custom payload');
        }
      } else {
        payload = testData;
      }

      console.log('🧪 Testing affiliate webhook with payload:', payload);
      
      // Test the affiliate purchase webhook
      const { data, error } = await supabase.functions.invoke('affiliate-purchase-webhook', {
        body: payload
      });

      console.log('🔔 Webhook response:', { data, error });

      const result: TestResult = {
        success: !error,
        response: error || data,
        timestamp: new Date().toISOString()
      };
      
      setTestResult(result);
      
      if (error) {
        toast({
          title: "Webhook Test Failed",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Webhook Test Successful",
          description: `NCTR earned: ${data?.nctr_earned || 'N/A'}`,
        });
      }
      
    } catch (error) {
      console.error('❌ Webhook test error:', error);
      const result: TestResult = {
        success: false,
        response: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      };
      setTestResult(result);
      
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUserTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('nctr_transactions')
        .select('*')
        .eq('user_id', testData.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('📊 Recent transactions for user:', data);
      
      if (error) {
        toast({
          title: "Query Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Transactions Loaded",
          description: `Found ${data?.length || 0} recent transactions`,
        });
      }
    } catch (error) {
      console.error('Error checking transactions:', error);
    }
  };

  const presetPayloads = {
    kurdilla_uber_purchase_1: {
      user_id: '4b90a032-2c5b-4835-9c73-d298cd1a54f5',
      order_id: 'MANUAL_CREDIT_UBER_1_' + Date.now(),
      order_status: 'completed',
      total_amount: 100,
      currency: 'USD',
      tracking_id: 'tgn_cd1a54f5_1b17d9eb_mg33qd4g',
      source: 'Uber Gift Card',
      customer_email: 'jjkurdilla@gmail.com',
      products: [{ name: 'Uber Gift Card $100', amount: 100, quantity: 1, category: 'Gift Cards' }]
    },
    kurdilla_uber_purchase_2: {
      user_id: '4b90a032-2c5b-4835-9c73-d298cd1a54f5',
      order_id: 'MANUAL_CREDIT_UBER_2_' + Date.now(),
      order_status: 'completed',
      total_amount: 100,
      currency: 'USD',
      tracking_id: 'tgn_cd1a54f5_1b17d9eb_mg33qd4g',
      source: 'Uber Gift Card',
      customer_email: 'jjkurdilla@gmail.com',
      products: [{ name: 'Uber Gift Card $100', amount: 100, quantity: 1, category: 'Gift Cards' }]
    },
    generic_giftcard: {
      user_id: '4b90a032-2c5b-4835-9c73-d298cd1a54f5',
      order_id: 'GC_TEST_' + Date.now(),
      order_status: 'paid',
      total_amount: 50,
      currency: 'USD',
      tracking_id: '',
      source: 'gift_cards',
      customer_email: 'test@example.com',
      products: [{ name: 'Amazon Gift Card', amount: 50, quantity: 1 }]
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Affiliate Purchase Webhook Tester
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test affiliate purchase webhooks to verify commission tracking
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Tests */}
          <div className="space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-lg mb-2 flex items-center gap-2 text-yellow-900">
                <User className="w-5 h-5" />
                🚨 Credit Kurdilla's Missing Uber Purchases
              </h4>
              <p className="text-sm text-yellow-800 mb-4">
                Jeffrey Kurdilla bought 2 × $100 Uber gift cards but wasn't credited. 
                <strong> Should earn 10,000 NCTR total (5,000 per $100 at 50 NCTR per $1)</strong>
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setTestData(presetPayloads.kurdilla_uber_purchase_1);
                    setTimeout(() => testAffiliateWebhook(false), 100);
                  }}
                  disabled={loading}
                  className="flex-1"
                  size="sm"
                >
                  Credit Purchase #1 ($100)
                </Button>
                <Button 
                  onClick={() => {
                    setTestData(presetPayloads.kurdilla_uber_purchase_2);
                    setTimeout(() => testAffiliateWebhook(false), 100);
                  }}
                  disabled={loading}
                  className="flex-1"
                  size="sm"
                >
                  Credit Purchase #2 ($100)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Test New Kurdilla Purchase
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Test webhook with a new $100 Uber purchase
                </p>
                <Button 
                  onClick={() => testAffiliateWebhook(false)}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Test New Purchase
                </Button>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Generic Gift Card
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Test with a generic $50 gift card purchase
                </p>
                <Button 
                  onClick={() => {
                    setTestData(presetPayloads.generic_giftcard);
                    setTimeout(() => testAffiliateWebhook(false), 100);
                  }}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Test Generic Purchase
                </Button>
              </Card>
            </div>
          </div>

          {/* Manual Test Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>User ID</Label>
              <Input 
                value={testData.user_id} 
                onChange={(e) => setTestData({...testData, user_id: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <Label>Order ID</Label>
              <Input 
                value={testData.order_id} 
                onChange={(e) => setTestData({...testData, order_id: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <Label>Amount ($)</Label>
              <Input 
                type="number" 
                value={testData.total_amount} 
                onChange={(e) => setTestData({...testData, total_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-3">
              <Label>Tracking ID</Label>
              <Input 
                value={testData.tracking_id} 
                onChange={(e) => setTestData({...testData, tracking_id: e.target.value})}
              />
            </div>
          </div>

          {/* Custom Payload */}
          <div className="space-y-3">
            <Label>Custom Webhook Payload (JSON)</Label>
            <Textarea 
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder="Enter custom JSON payload for testing..."
              rows={6}
            />
            <Button 
              onClick={() => testAffiliateWebhook(true)}
              disabled={loading || !customPayload.trim()}
              variant="outline"
            >
              <Webhook className="w-4 h-4 mr-2" />
              Test Custom Payload
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => testAffiliateWebhook(false)}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test Current Data'}
            </Button>
            <Button 
              onClick={checkUserTransactions}
              variant="outline"
            >
              Check User Transactions
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <Card className={`p-4 ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? 'SUCCESS' : 'FAILED'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {testResult.timestamp}
                </span>
              </div>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">
                {JSON.stringify(testResult.response, null, 2)}
              </pre>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateWebhookTester;
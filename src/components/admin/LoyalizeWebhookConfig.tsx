import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Copy, Check, Webhook, ExternalLink, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const LoyalizeWebhookConfig = () => {
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState('');
  
  // The webhook URL that Loyalize needs to call - this handles ALL brands
  const webhookUrl = 'https://rndivcsonsojgelzewkb.supabase.co/functions/v1/transaction-webhooks';
  
  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({
        title: "Webhook URL Copied",
        description: "The Loyalize webhook URL has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the webhook URL",
        variant: "destructive",
      });
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { action: 'fetch_transactions' }
      });

      if (error) throw error;

      // Loyalize v2 API returns transactions in a 'content' array
      const transactionList = data?.transactions?.content || [];
      
      if (transactionList.length > 0) {
        setTransactions(data.transactions); // Store the full response for pagination
        toast({
          title: "Transactions Fetched",
          description: `Found ${transactionList.length} transactions from your Loyalize account`,
        });
      } else {
        toast({
          title: "No Transactions",
          description: "No transactions found in your Loyalize account",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhookWithTransaction = async (txId: string) => {
    if (!txId) {
      toast({
        title: "Transaction ID Required",
        description: "Please enter a transaction ID to test",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const webhookPayload = {
        body: {
          eventType: "NEW_TRANSACTION",
          data: {
            transactions: [parseInt(txId)]
          }
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Webhook Test Success",
          description: `Transaction ${txId} processed successfully`,
        });
      } else {
        toast({
          title: "Webhook Test Failed",
          description: result.error || "Failed to process webhook",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test webhook",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="bg-section-highlight border border-section-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Webhook className="w-5 h-5" />
          Loyalize Webhook Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure this webhook URL in your Loyalize dashboard to receive transaction notifications
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook URL Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Webhook Endpoint URL
          </label>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-2 font-mono text-sm text-foreground break-all">
              {webhookUrl}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyWebhookUrl}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Configuration Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Get your API key from Loyalize dashboard → Settings → API Keys</li>
              <li>Add the API key as <code className="bg-muted px-1 rounded">LOYALIZE_API_KEY</code> secret in Edge Functions settings</li>
              <li>Navigate to Loyalize Settings → Webhooks</li>
              <li>Add a new webhook with the URL above</li>
              <li>Select event type: <code className="bg-muted px-1 rounded">NEW_TRANSACTION</code></li>
              <li>Ensure webhook is enabled and save</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Traffic Source Reminder */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <p className="font-semibold text-blue-900">Traffic Source Configuration:</p>
            <p className="text-sm text-blue-800 mt-1">
              Make sure <code className="bg-blue-100 px-1 rounded">thegarden.nctr.live</code> is 
              configured as an approved traffic source (PID) in your Loyalize dashboard.
            </p>
          </AlertDescription>
        </Alert>

        {/* Expected Webhook Format */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Expected Webhook Payload Format:
          </label>
          <pre className="bg-muted/50 border border-border rounded-md p-3 text-xs overflow-x-auto">
{`{
  "body": {
    "eventType": "NEW_TRANSACTION",
    "data": {
      "transactions": [12345, 12346]
    }
  }
}`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Loyalize will send transaction IDs, and our webhook will fetch full details via their v2 API
          </p>
        </div>

        {/* Transaction Fetcher & Tester */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Test Webhook with Real Transaction
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Fetch Real Transactions
            </Button>
          </div>

          {transactions?.content?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Select a transaction ID from your account:
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {transactions.content.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between bg-muted/50 border border-border rounded-md p-2"
                  >
                    <div className="flex-1 text-sm">
                      <span className="font-mono font-semibold">ID: {tx.id}</span>
                      {tx.saleAmount && <span className="text-muted-foreground ml-2">(${tx.saleAmount})</span>}
                      {tx.storeName && <span className="text-muted-foreground ml-2">- {tx.storeName}</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWebhookWithTransaction(tx.id.toString())}
                      disabled={testing}
                      className="gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Test
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Or enter a transaction ID manually:
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter transaction ID"
                value={selectedTxId}
                onChange={(e) => setSelectedTxId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => testWebhookWithTransaction(selectedTxId)}
                disabled={testing || !selectedTxId}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Test Webhook
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://docs.loyalize.com', '_blank')}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Loyalize Docs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://dashboard.loyalize.com', '_blank')}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Loyalize Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoyalizeWebhookConfig;

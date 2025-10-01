import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Webhook, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const LoyalizeWebhookConfig = () => {
  const [copied, setCopied] = useState(false);
  
  // The webhook URL that Loyalize needs to call
  const webhookUrl = 'https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-transaction-sync';
  
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

        {/* Quick Links */}
        <div className="flex gap-2 pt-2">
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

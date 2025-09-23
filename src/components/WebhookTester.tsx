import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Webhook, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';

interface WebhookTesterProps {
  className?: string;
}

const WebhookTester = ({ className }: WebhookTesterProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('PURCHASE_COMPLETED');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [customPayload, setCustomPayload] = useState('');
  const [lastResponse, setLastResponse] = useState<any>(null);

  const webhookEvents = {
    'PURCHASE_COMPLETED': {
      name: 'Purchase Completed',
      description: 'NCTR purchase completed from token.nctr.live',
      payload: {
        user_id: "fb8c3f0c-ea80-46f4-8dbd-65d945aaa8ff",
        amount: 1000.0,
        transaction_id: `test_txn_${Date.now()}`,
        status: "completed",
        payment_method: "credit_card",
        timestamp: new Date().toISOString(),
        source: "garden"
      }
    },
    'NEW_TRANSACTION': {
      name: 'New Transaction',
      description: 'Triggered when a new transaction is created',
      payload: {
        eventType: "NEW_TRANSACTION",
        data: {
          transactions: [12345],
          changes: {
            newStatus: "PENDING"
          }
        }
      }
    },
    'TRANSACTION_COMPLETED': {
      name: 'Transaction Completed',
      description: 'Triggered when a transaction is successfully completed',
      payload: {
        eventType: "TRANSACTION_COMPLETED",
        data: {
          transactions: [12345],
          changes: {
            newStatus: "COMPLETED",
            completedAt: new Date().toISOString()
          }
        }
      }
    },
    'TRANSACTION_FAILED': {
      name: 'Transaction Failed',
      description: 'Triggered when a transaction fails',
      payload: {
        eventType: "TRANSACTION_FAILED",
        data: {
          transactions: [12345],
          changes: {
            newStatus: "FAILED",
            failureReason: "Insufficient funds"
          }
        }
      }
    },
    'TRANSACTION_UPDATED': {
      name: 'Transaction Updated',
      description: 'Triggered when transaction details are updated',
      payload: {
        eventType: "TRANSACTION_UPDATED",
        data: {
          transactions: [12345],
          changes: {
            newStatus: "PROCESSING",
            updatedAmount: 75.50
          }
        }
      }
    }
  };

  const getCurrentPayload = () => {
    if (customPayload.trim()) {
      try {
        return JSON.parse(customPayload);
      } catch {
        return null;
      }
    }
    return webhookEvents[selectedEvent as keyof typeof webhookEvents]?.payload;
  };

  const handleSendWebhook = async () => {
    const payload = getCurrentPayload();
    
    if (!payload) {
      toast({
        title: "Invalid Payload",
        description: "Please fix the JSON payload format",
        variant: "destructive",
      });
      return;
    }

    if (!webhookUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a webhook URL to test",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log('🔔 Sending webhook:', payload);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));
      
      setLastResponse({
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        timestamp: new Date().toISOString()
      });

      if (response.ok) {
        toast({
          title: "Webhook Sent Successfully",
          description: `Response: ${response.status} ${response.statusText}`,
        });
      } else {
        toast({
          title: "Webhook Failed",
          description: `Error: ${response.status} ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Webhook error:', error);
      setLastResponse({
        status: 0,
        statusText: 'Network Error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Network Error",
        description: "Failed to send webhook. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    const fullUrl = 'https://rndivcsonsojgelzewkb.supabase.co/functions/v1/purchase-webhook';
    navigator.clipboard.writeText(fullUrl);
    setWebhookUrl(fullUrl);
    toast({
      title: "Copied to Clipboard",
      description: "Purchase webhook URL copied and set for testing",
    });
  };

  const formatPayload = () => {
    const payload = getCurrentPayload();
    if (payload) {
      setCustomPayload(JSON.stringify(payload, null, 2));
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Webhook className="w-5 h-5" />
            Purchase Webhook Tester
          </CardTitle>
          <p className="text-muted-foreground">
            Test the purchase webhook endpoint for NCTR token purchases
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div className="bg-section-highlight p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">Your Webhook Endpoint</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyWebhookUrl}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy URL
              </Button>
            </div>
            <div className="bg-muted p-3 rounded font-mono text-sm break-all">
              https://rndivcsonsojgelzewkb.supabase.co/functions/v1/purchase-webhook
            </div>
            <p className="text-xs text-muted-foreground">
              ☝️ Use this URL in token.nctr.live's webhook settings for purchase notifications
            </p>
          </div>

          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Test Webhook URL</Label>
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-webhook-endpoint.com"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your webhook URL to test against
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(webhookEvents).map(([key, event]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{event.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {event.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={formatPayload}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Load Default Payload
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payload">Custom Payload (JSON)</Label>
              <Textarea
                id="payload"
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                placeholder="Leave empty to use default payload for selected event"
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleSendWebhook}
              disabled={isLoading}
              size="lg"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Test Webhook
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Display */}
      {lastResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              {lastResponse.status >= 200 && lastResponse.status < 300 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              Last Response
              <Badge variant={lastResponse.status >= 200 && lastResponse.status < 300 ? "default" : "destructive"}>
                {lastResponse.status} {lastResponse.statusText}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(lastResponse.timestamp).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(lastResponse.data || lastResponse.error || {}, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ExternalLink className="w-5 h-5" />
            Supported Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(webhookEvents).map(([key, event]) => (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{event.name}</h4>
                  <Badge variant="outline">{key}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {event.description}
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium mb-2">
                    View Payload Structure
                  </summary>
                  <div className="bg-muted p-3 rounded font-mono overflow-auto">
                    <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookTester;
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, DollarSign, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const PurchaseTracking = () => {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [crediting, setCrediting] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  
  // Manual credit form
  const [creditForm, setCreditForm] = useState({
    user_id: '',
    purchase_amount: '',
    partner_name: '',
    order_id: '',
    notes: '',
    nctr_per_dollar: '100'
  });

  const handleLoyalizeSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      console.log('🔄 Starting Loyalize transaction sync...');
      
      const { data, error } = await supabase.functions.invoke('loyalize-sync-transactions', {
        body: {}
      });

      if (error) throw error;

      setSyncResult(data);
      
      toast({
        title: "✅ Sync Complete",
        description: `${data.results.credited} new transactions credited (${data.results.checked} total checked)`,
      });

      console.log('✅ Sync result:', data);

    } catch (error: any) {
      console.error('❌ Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Loyalize transactions",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleManualCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrediting(true);

    try {
      console.log('🛠️ Processing manual credit...');

      const { data, error } = await supabase.functions.invoke('manual-credit-purchase', {
        body: {
          user_id: creditForm.user_id,
          purchase_amount: parseFloat(creditForm.purchase_amount),
          partner_name: creditForm.partner_name,
          order_id: creditForm.order_id || undefined,
          notes: creditForm.notes || undefined,
          nctr_per_dollar: parseFloat(creditForm.nctr_per_dollar),
          admin_id: user?.id
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Credit Applied",
        description: `${data.nctr_credited} NCTR credited successfully`,
      });

      // Reset form
      setCreditForm({
        user_id: '',
        purchase_amount: '',
        partner_name: '',
        order_id: '',
        notes: '',
        nctr_per_dollar: '100'
      });

      console.log('✅ Manual credit result:', data);

    } catch (error: any) {
      console.error('❌ Manual credit error:', error);
      toast({
        title: "Credit Failed",
        description: error.message || "Failed to credit purchase",
        variant: "destructive",
      });
    } finally {
      setCrediting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Loyalize Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Loyalize Transaction Sync
          </CardTitle>
          <CardDescription>
            Manually sync pending/available transactions from Loyalize and credit users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This checks Loyalize API for transactions that may have been missed by webhooks and credits them automatically.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleLoyalizeSync} 
            disabled={syncing}
            className="w-full"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>

          {syncResult && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold">Sync Results:</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Checked</div>
                  <div className="text-2xl font-bold">{syncResult.results.checked}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Matched</div>
                  <div className="text-2xl font-bold text-blue-500">{syncResult.results.matched}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Credited</div>
                  <div className="text-2xl font-bold text-green-500">{syncResult.results.credited}</div>
                </div>
              </div>
              {syncResult.results.errors && syncResult.results.errors.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold text-red-500">Errors:</div>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {syncResult.results.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Credit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Manual Purchase Credit
          </CardTitle>
          <CardDescription>
            Manually credit NCTR for purchases that weren't automatically tracked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualCredit} className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Use this for purchases where tracking failed but you have proof of purchase (e.g., your own test purchases).
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user_id">User ID *</Label>
                <Input
                  id="user_id"
                  placeholder="Enter user UUID"
                  value={creditForm.user_id}
                  onChange={(e) => setCreditForm({...creditForm, user_id: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="partner_name">Partner Name *</Label>
                <Input
                  id="partner_name"
                  placeholder="Partner/Brand name"
                  value={creditForm.partner_name}
                  onChange={(e) => setCreditForm({...creditForm, partner_name: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_amount">Purchase Amount ($) *</Label>
                <Input
                  id="purchase_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={creditForm.purchase_amount}
                  onChange={(e) => setCreditForm({...creditForm, purchase_amount: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="nctr_per_dollar">NCTR per Dollar *</Label>
                <Input
                  id="nctr_per_dollar"
                  type="number"
                  placeholder="100"
                  value={creditForm.nctr_per_dollar}
                  onChange={(e) => setCreditForm({...creditForm, nctr_per_dollar: e.target.value})}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {creditForm.purchase_amount && creditForm.nctr_per_dollar 
                    ? `Total reward: ${(parseFloat(creditForm.purchase_amount) * parseFloat(creditForm.nctr_per_dollar)).toLocaleString()} NCTR`
                    : 'NCTR reward calculation'}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="order_id">Order ID (Optional)</Label>
              <Input
                id="order_id"
                placeholder="Order confirmation number"
                value={creditForm.order_id}
                onChange={(e) => setCreditForm({...creditForm, order_id: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Reason for manual credit, tracking issue details, etc."
                value={creditForm.notes}
                onChange={(e) => setCreditForm({...creditForm, notes: e.target.value})}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              disabled={crediting}
              className="w-full"
            >
              {crediting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Credit Purchase
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

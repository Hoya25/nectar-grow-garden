import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SyncResult {
  success: boolean;
  processed: number;
  credited: number;
  skipped: number;
  errors: number;
  details?: any[];
}

export function LoyalizeTransactionSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      console.log("🔄 Manually triggering Loyalize transaction sync...");
      
      const { data, error } = await supabase.functions.invoke('loyalize-integration', {
        body: { action: 'sync_transactions' }
      });

      if (error) {
        console.error("❌ Sync error:", error);
        toast.error(`Sync failed: ${error.message}`);
        setLastSyncResult({
          success: false,
          processed: 0,
          credited: 0,
          skipped: 0,
          errors: 1
        });
      } else {
        console.log("✅ Sync completed:", data);
        setLastSyncResult(data);
        setLastSyncTime(new Date());
        
        const credited = data?.credited || 0;
        if (credited > 0) {
          toast.success(`✅ Successfully synced ${credited} new transaction(s)!`);
        } else {
          toast.info("No new transactions to sync");
        }
      }
    } catch (err: any) {
      console.error("❌ Exception during sync:", err);
      toast.error(`Sync error: ${err.message}`);
      setLastSyncResult({
        success: false,
        processed: 0,
        credited: 0,
        skipped: 0,
        errors: 1
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Loyalize Transaction Sync</span>
          <Button
            onClick={handleManualSync}
            disabled={syncing}
            size="sm"
          >
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          Manually trigger a sync to check for new Loyalize transactions and credit users with NCTR rewards
        </CardDescription>
      </CardHeader>

      {(lastSyncResult || lastSyncTime) && (
        <CardContent className="space-y-4">
          {lastSyncTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last synced: {lastSyncTime.toLocaleString()}
            </div>
          )}

          {lastSyncResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  {lastSyncResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={lastSyncResult.success ? "default" : "destructive"}>
                    {lastSyncResult.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-2xl font-bold">{lastSyncResult.processed}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Credited</p>
                <p className="text-2xl font-bold text-green-600">{lastSyncResult.credited}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-yellow-600">{lastSyncResult.skipped}</p>
              </div>
            </div>
          )}

          {lastSyncResult?.details && lastSyncResult.details.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Transactions:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lastSyncResult.details.map((detail: any, idx: number) => (
                  <div key={idx} className="text-xs bg-muted p-2 rounded space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono">{detail.orderNumber || 'N/A'}</span>
                      <Badge variant={detail.status === 'credited' ? 'default' : 'secondary'}>
                        {detail.status}
                      </Badge>
                    </div>
                    {detail.amount && (
                      <p className="text-muted-foreground">
                        ${detail.amount} → {detail.nctr_amount || 0} NCTR
                      </p>
                    )}
                    {detail.message && (
                      <p className="text-muted-foreground">{detail.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

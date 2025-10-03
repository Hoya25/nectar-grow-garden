import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface LoyalizeTransaction {
  id: number;
  shopperId: string;
  sid: string;
  storeName: string;
  orderNumber: string;
  status: string;
  saleAmount: string;
  shopperCommission: string;
  purchaseDate: string;
}

interface TrackingMapping {
  tracking_id: string;
  user_id: string;
  brand_id: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string;
  email: string;
}

export function PendingTransactionsMonitor() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<LoyalizeTransaction[]>([]);
  const [mappings, setMappings] = useState<TrackingMapping[]>([]);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchPendingTransactions = async () => {
    setLoading(true);
    console.log("🔍 Starting fetch of pending transactions...");
    
    try {
      // Fetch from Loyalize
      console.log("📡 Calling loyalize-integration function...");
      const { data: loyalizeData, error: loyalizeError } = await supabase.functions.invoke(
        'loyalize-integration',
        { body: { action: 'fetch_transactions' } }
      );

      console.log("📦 Raw Loyalize response:", loyalizeData);
      console.log("❌ Loyalize error:", loyalizeError);

      if (loyalizeError) {
        console.error("💥 Loyalize error occurred:", loyalizeError);
        throw loyalizeError;
      }

      // Fetch all tracking mappings
      console.log("🔗 Fetching tracking mappings...");
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('affiliate_link_mappings')
        .select('tracking_id, user_id, brand_id');

      console.log("📦 Mappings data:", mappingsData);
      console.log("❌ Mappings error:", mappingsError);

      if (mappingsError) {
        console.error("💥 Mappings error occurred:", mappingsError);
        throw mappingsError;
      }

      // Fetch user profiles for matched transactions
      const userIds = Array.from(new Set((mappingsData || []).map(m => m.user_id)));
      if (userIds.length > 0) {
        console.log("👤 Fetching user profiles...");
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, email')
          .in('user_id', userIds);

        if (profilesError) {
          console.error("💥 Profiles error occurred:", profilesError);
        } else {
          const profilesMap = new Map<string, UserProfile>();
          (profilesData || []).forEach(profile => {
            profilesMap.set(profile.user_id, profile);
          });
          setUserProfiles(profilesMap);
          console.log("✅ Loaded profiles for", profilesMap.size, "users");
        }
      }

      // Parse the nested response structure from Loyalize API
      // Response format: { success: true, transactions: { content: [...] } }
      console.log("🔍 Parsing transaction structure...");
      console.log("  - loyalizeData type:", typeof loyalizeData);
      console.log("  - loyalizeData?.transactions type:", typeof loyalizeData?.transactions);
      console.log("  - loyalizeData?.transactions?.content type:", typeof loyalizeData?.transactions?.content);
      console.log("  - Array.isArray(loyalizeData?.transactions?.content):", Array.isArray(loyalizeData?.transactions?.content));
      
      const transactionsArray = Array.isArray(loyalizeData?.transactions?.content) 
        ? loyalizeData.transactions.content
        : Array.isArray(loyalizeData?.transactions) 
        ? loyalizeData.transactions 
        : Array.isArray(loyalizeData) 
        ? loyalizeData 
        : [];
      
      console.log("✅ Parsed transactions array:", transactionsArray);
      console.log("📊 Total transactions found:", transactionsArray.length);

      setTransactions(transactionsArray);
      setMappings(Array.isArray(mappingsData) ? mappingsData : []);
      setLastSync(new Date());

      console.log("✅ State updated successfully");

      toast({
        title: "✅ Transactions fetched",
        description: `Found ${transactionsArray.length} pending transactions`,
      });
    } catch (error: any) {
      console.error('💥 Error fetching transactions:', error);
      console.error('💥 Error details:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      
      toast({
        title: "❌ Error fetching transactions",
        description: error.message,
        variant: "destructive",
      });
      
      // Ensure state is reset to empty arrays on error
      setTransactions([]);
      setMappings([]);
    } finally {
      setLoading(false);
      console.log("🏁 Fetch completed");
    }
  };

  const getMatchStatus = (transaction: LoyalizeTransaction) => {
    const trackingId = transaction.sid || transaction.shopperId;
    const mapping = mappings.find(m => m.tracking_id === trackingId);
    const hasMatch = !!mapping;
    const userProfile = mapping ? userProfiles.get(mapping.user_id) : undefined;
    const userName = userProfile 
      ? (userProfile.full_name || userProfile.username || userProfile.email)
      : undefined;
    return { hasMatch, trackingId, userName, userId: mapping?.user_id };
  };

  const matchedCount = transactions.filter(t => getMatchStatus(t).hasMatch).length;
  const unmatchedCount = transactions.length - matchedCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Pending Transactions Monitor
        </CardTitle>
        <CardDescription>
          View pending Loyalize transactions and verify tracking IDs are matched in database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {lastSync && (
              <p className="text-sm text-muted-foreground">
                Last checked: {lastSync.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            onClick={fetchPendingTransactions}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Pending Transactions
              </>
            )}
          </Button>
        </div>

        {transactions.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{transactions.length}</div>
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
                  <p className="text-sm text-muted-foreground">Matched (Will Credit)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{unmatchedCount}</div>
                  <p className="text-sm text-muted-foreground">Unmatched (No User)</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">Transaction Details</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {transactions.map((transaction) => {
                  const { hasMatch, trackingId, userName } = getMatchStatus(transaction);
                  return (
                    <Card key={transaction.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{transaction.storeName}</p>
                              <Badge variant={transaction.status === 'PENDING' ? 'secondary' : 'default'}>
                                {transaction.status}
                              </Badge>
                              {hasMatch ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Tracked
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No Match
                                </Badge>
                              )}
                            </div>
                            {hasMatch && userName && (
                              <p className="text-sm font-medium text-primary">
                                User: {userName}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Order: {transaction.orderNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Tracking ID: <code className="bg-muted px-1 py-0.5 rounded">{trackingId}</code>
                            </p>
                            <p className="text-sm">
                              Purchase: ${transaction.saleAmount} • Commission: ${transaction.shopperCommission}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.purchaseDate).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {unmatchedCount > 0 && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-red-900 dark:text-red-100">
                        {unmatchedCount} Unmatched Transaction{unmatchedCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        These purchases won't earn NCTR because the tracking ID wasn't found in the database. 
                        This happens when users shop directly without generating an affiliate link first.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!loading && transactions.length === 0 && lastSync && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No pending transactions found
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

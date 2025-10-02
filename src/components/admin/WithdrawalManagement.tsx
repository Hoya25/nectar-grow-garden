import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Wallet, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  wallet_address_masked: string;
  nctr_amount: string;  // Now returned as string from secure function
  net_amount_nctr: string;  // Now returned as string from secure function
  gas_fee_nctr: string;  // Now returned as string from secure function
  status: string;
  transaction_hash?: string | null;
  created_at: string;
  processed_at: string | null;
  username_masked: string | null;  // Now masked for security
  full_name: string | null;
  email_masked: string | null;  // Now masked for security
}

const WithdrawalManagement = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchWithdrawals();
    
    // Set up real-time subscription for withdrawal updates
    const subscription = supabase
      .channel('withdrawal_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        () => {
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchWithdrawals = async () => {
    try {
      // Use secure RPC function to avoid triggering audit logs during SELECT
      const { data, error } = await supabase
        .rpc('get_admin_withdrawal_requests');

      if (error) {
        // Handle session expiry specifically
        if (error.message?.includes('Session expired')) {
          toast({
            title: "Session Expired",
            description: "Please re-authenticate to access financial data",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      
      // Transform data to match interface with security masking
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        wallet_address_masked: item.wallet_address ? 
          `${item.wallet_address.substring(0, 6)}...${item.wallet_address.substring(item.wallet_address.length - 4)}` : 
          'N/A',
        nctr_amount: item.nctr_amount?.toString() || '0',
        net_amount_nctr: item.net_amount_nctr?.toString() || '0', 
        gas_fee_nctr: item.gas_fee_nctr?.toString() || '0',
        status: item.status,
        transaction_hash: item.transaction_hash,
        created_at: item.created_at,
        processed_at: item.processed_at,
        username_masked: item.username ? 
          `${item.username.substring(0, 2)}***` : null,
        full_name: item.full_name || null,
        email_masked: item.email ? 
          `${item.email.split('@')[0].substring(0, 2)}***@${item.email.split('@')[1]}` : null,
      }));
      
      setWithdrawals(transformedData);
    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      
      // Provide specific error messages for security issues
      let errorMessage = "Failed to fetch withdrawal requests";
      if (error.message?.includes('Access denied')) {
        errorMessage = "Access denied: Admin privileges required";
      } else if (error.message?.includes('Session expired')) {
        errorMessage = "Session expired: Please re-authenticate";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Loading Withdrawals",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (requestId: string) => {
    if (processing) return;
    
    setProcessing(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('treasury-withdrawal', {
        body: { 
          action: 'process_withdrawal',
          request_id: requestId 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Withdrawal Processed",
          description: `Successfully sent NCTR. Transaction: ${data.transaction_hash?.substring(0, 10)}...`,
        });
        await fetchWithdrawals(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to process withdrawal');
      }
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const getPendingWithdrawals = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('treasury-withdrawal', {
        body: { action: 'get_pending_withdrawals' }
      });

      if (error) throw error;
      return data.withdrawals || [];
    } catch (error: any) {
      console.error('Error fetching pending withdrawals:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch pending withdrawals",
        variant: "destructive"
      });
      return [];
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Address is already masked by the secure function, so just return it
  const formatAddress = (maskedAddress: string) => {
    return maskedAddress; // Already formatted as "0x1234...abcd"
  };

  const openTransactionInExplorer = (txHash: string) => {
    window.open(`https://basescan.org/tx/${txHash}`, '_blank');
  };

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalPendingAmount = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + parseFloat(w.net_amount_nctr || '0'), 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Withdrawal Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{totalPendingAmount.toFixed(2)} NCTR</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-purple-500">{withdrawals.length}</div>
              <div className="text-xs text-muted-foreground bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded">
                🔒 Secured Access
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Withdrawals Alert */}
      {pendingCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            There are {pendingCount} pending withdrawal requests waiting for processing.
          </AlertDescription>
        </Alert>
      )}

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Withdrawal Requests
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchWithdrawals}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No withdrawal requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {withdrawal.full_name || withdrawal.username_masked || 'Unknown User'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {withdrawal.email_masked}
                          </div>
                        </div>
                      </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <div className="font-medium">{parseFloat(withdrawal.nctr_amount).toFixed(2)} NCTR</div>
                         <div className="text-xs text-green-600">
                           ✅ Fee-free withdrawal
                           <br />User receives: {parseFloat(withdrawal.nctr_amount).toFixed(2)} NCTR
                         </div>
                       </div>
                     </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {withdrawal.wallet_address_masked}
                        </div>
                      </TableCell>
                     <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(withdrawal.status)}
                        </div>
                     </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{formatDate(withdrawal.created_at)}</div>
                        {withdrawal.processed_at && (
                          <div className="text-xs text-muted-foreground">
                            Processed: {formatDate(withdrawal.processed_at)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {withdrawal.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => processWithdrawal(withdrawal.id)}
                            disabled={processing === withdrawal.id}
                          >
                            {processing === withdrawal.id ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Process
                              </>
                            )}
                          </Button>
                        )}
                        
                        {withdrawal.transaction_hash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTransactionInExplorer(withdrawal.transaction_hash!)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Tx
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalManagement;
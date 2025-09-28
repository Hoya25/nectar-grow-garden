import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Activity,
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

interface SuperAdminTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  nctr_amount: number;
  description: string;
  earning_source: string;
  status: string;
  created_at: string;
  partner_name?: string;
  purchase_amount?: number;
  external_transaction_id?: string;
  opportunity_id?: string;
  user_email: string;
  user_name: string;
}

const SuperAdminTransactionHistory = () => {
  const [transactions, setTransactions] = useState<SuperAdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  const fetchTransactionHistory = async (targetUserId?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_super_admin_transaction_history', {
        target_user_id: targetUserId || null
      });

      if (error) {
        throw error;
      }

      setTransactions(data || []);
      toast({
        title: "Transaction History Loaded",
        description: `Loaded ${data?.length || 0} transactions with super admin access`,
      });

    } catch (error: any) {
      console.error('Error fetching transaction history:', error);
      toast({
        title: "Access Denied",
        description: error.message || "Super admin privileges required for transaction history access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx =>
    tx.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.transaction_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.earning_source?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    } else {
      return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'earned': return 'bg-green-100 text-green-700 border-green-200';
      case 'withdrawal': return 'bg-red-100 text-red-700 border-red-200';
      case 'lock_upgrade': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const exportTransactions = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,User Email,User Name,Type,Amount,Description,Source,Status,Date,Partner\n"
      + filteredTransactions.map(tx => 
          `${tx.id},${tx.user_email},${tx.user_name},${tx.transaction_type},${tx.nctr_amount},${tx.description || ''},${tx.earning_source || ''},${tx.status},${tx.created_at},${tx.partner_name || ''}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transaction_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Security Warning */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <Shield className="w-5 h-5" />
            <strong>SUPER ADMIN ACCESS ONLY</strong>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-sm text-red-600 mt-1">
            This sensitive financial data is restricted to anderson@projectbutterfly.io only. 
            All access is logged for security audit.
          </p>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Transaction History ({filteredTransactions.length})
            </CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={exportTransactions} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
              <Button onClick={() => fetchTransactionHistory()} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No transactions match your search.' : 'No transactions found.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3 flex-1">
                    {getTransactionIcon(transaction.transaction_type, transaction.nctr_amount)}
                    <div className="flex-1">
                      {/* User Info */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{transaction.user_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {transaction.user_email}
                        </Badge>
                      </div>
                      
                      {/* Transaction Details */}
                      <div className="font-medium text-sm mb-1">
                        {transaction.description || transaction.transaction_type}
                      </div>
                      
                      {/* Metadata */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')} • 
                          Source: {transaction.earning_source || 'N/A'}
                        </div>
                        {transaction.partner_name && (
                          <div>Partner: {transaction.partner_name}</div>
                        )}
                        {transaction.purchase_amount && (
                          <div>Purchase: ${transaction.purchase_amount.toFixed(2)}</div>
                        )}
                        {transaction.external_transaction_id && (
                          <div className="font-mono">ID: {transaction.external_transaction_id}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Amount and Status */}
                  <div className="text-right ml-4">
                    <div className={`font-bold text-lg ${transaction.nctr_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.nctr_amount >= 0 ? '+' : ''}{transaction.nctr_amount.toFixed(2)} NCTR
                    </div>
                    <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                      {transaction.transaction_type}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminTransactionHistory;
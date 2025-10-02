import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Clock, TrendingUp, Lock, Gift, ShoppingCart, Users, Zap, CheckCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  transaction_type: string;
  nctr_amount: number;
  description: string;
  earning_source: string;
  status: string;
  created_at: string;
  partner_name?: string;
}

interface PortfolioStoryProps {
  userId: string;
  refreshKey?: number;
}

export const PortfolioStory: React.FC<PortfolioStoryProps> = ({ userId, refreshKey }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'purchases'>('all');

  useEffect(() => {
    fetchTransactions();
  }, [userId, refreshKey, filter]);

  // Real-time subscription for new transactions
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('portfolio-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nctr_transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New transaction received:', payload);
          const newTransaction = payload.new as Transaction;
          // Add the new transaction only if it doesn't already exist (deduplicate)
          setTransactions(prev => {
            const exists = prev.some(t => t.id === newTransaction.id);
            if (exists) return prev;
            return [newTransaction, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      setIsRefreshing(true);
      
      let query = supabase
        .from('nctr_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Apply filter
      if (filter === 'purchases') {
        query = query.eq('earning_source', 'token_purchase');
      }
      
      const { data, error } = await query.limit(50);

      if (!error && data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchTransactions();
  };

  const getTransactionIcon = (source: string) => {
    switch (source) {
      case 'daily_checkin':
        return <CheckCircle className="w-5 h-5 text-primary" />;
      case 'token_purchase':
        return <ShoppingCart className="w-5 h-5 text-green-500" />;
      case 'affiliate_purchase':
      case 'shopping':
        return <ShoppingCart className="w-5 h-5 text-primary" />;
      case 'referral':
      case 'referral_signup':
        return <Users className="w-5 h-5 text-primary" />;
      case 'profile_completion':
        return <Gift className="w-5 h-5 text-primary" />;
      case 'lock_upgrade':
      case 'batch_lock_upgrade':
        return <Lock className="w-5 h-5 text-primary" />;
      default:
        return <Zap className="w-5 h-5 text-primary" />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `${amount > 0 ? '+' : '-'}${absAmount.toLocaleString()} NCTR`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Portfolio Story
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Portfolio Story
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={filter === 'purchases' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('purchases')}
              className="text-xs"
            >
              Purchases
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Your journey begins here!</p>
            <p className="text-sm mt-2">Start earning NCTR and build your story</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="relative pl-8 pb-3 border-l-2 border-border last:border-l-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                  
                      <div className={`bg-card border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        transaction.earning_source === 'token_purchase' 
                          ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' 
                          : ''
                      }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getTransactionIcon(transaction.earning_source)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">
                              {transaction.description || 'Transaction'}
                            </span>
                            {transaction.earning_source === 'token_purchase' && (
                              <Badge className="bg-green-600 text-white text-xs">
                                NCTR Purchase
                              </Badge>
                            )}
                            {transaction.partner_name && transaction.earning_source !== 'token_purchase' && (
                              <Badge variant="secondary" className="text-xs">
                                {transaction.partner_name}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-bold text-lg ${getTransactionColor(transaction.transaction_type, transaction.nctr_amount)}`}>
                          {formatAmount(transaction.nctr_amount)}
                        </div>
                        <Badge 
                          variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs mt-1"
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

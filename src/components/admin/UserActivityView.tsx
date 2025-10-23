import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Lock, 
  Unlock,
  Gift,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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

interface NCTRLock {
  id: string;
  lock_type: string;
  lock_category: string;
  nctr_amount: number;
  lock_date: string;
  unlock_date: string;
  status: string;
  commitment_days: number;
}

interface Referral {
  id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  reward_credited: boolean;
  created_at: string;
  rewarded_at?: string;
}

interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  lock_90_nctr: number;
  lock_360_nctr: number;
}

interface UserActivityViewProps {
  userId: string;
}

const UserActivityView = ({ userId }: UserActivityViewProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [locks, setLocks] = useState<NCTRLock[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'locks' | 'referrals'>('transactions');

  useEffect(() => {
    if (userId) {
      fetchUserActivity();
      
      // Set up real-time subscription for portfolio and transaction updates
      const channel = supabase
        .channel(`user-activity-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nctr_transactions',
            filter: `user_id=eq.${userId}`
          },
          () => {
            console.log('🔄 Transaction update detected, refreshing...');
            fetchUserActivity();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nctr_locks',
            filter: `user_id=eq.${userId}`
          },
          () => {
            console.log('🔄 Lock update detected, refreshing...');
            fetchUserActivity();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nctr_portfolio',
            filter: `user_id=eq.${userId}`
          },
          () => {
            console.log('🔄 Portfolio update detected, refreshing...');
            fetchUserActivity();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const fetchUserActivity = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching activity for user:', userId);
      
      // Use secure admin function to fetch all activity data
      const { data: activityData, error: activityError } = await supabase
        .rpc('get_admin_user_activity', { target_user_id: userId });

      console.log('📊 Activity data response:', { activityData, activityError });

      if (activityError) {
        console.error('❌ RPC Error:', activityError);
        // If admin function fails, try direct queries as fallback
        console.log('🔄 Attempting fallback queries...');
        await fetchActivityFallback();
        return;
      }

      if (activityData) {
        // Parse the returned JSON data with proper typing
        const parsedData = activityData as unknown as {
          transactions: Transaction[];
          locks: NCTRLock[];
          referrals: Referral[];
        };
        
        console.log('✅ Parsed activity data:', parsedData);
        setTransactions(parsedData.transactions || []);
        setLocks(parsedData.locks || []);
        setReferrals(parsedData.referrals || []);
      }

      // Always fetch portfolio data separately (maybeSingle to handle missing data)
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('available_nctr, pending_nctr, total_earned, lock_90_nctr, lock_360_nctr')
        .eq('user_id', userId)
        .maybeSingle();

      if (portfolioError) {
        console.error('Portfolio error:', portfolioError);
      } else if (portfolioData) {
        setPortfolio(portfolioData);
        console.log('✅ Portfolio data loaded:', portfolioData);
      } else {
        console.log('⚠️ No portfolio data found for user');
      }

    } catch (error) {
      console.error('❌ Error fetching user activity:', error);
      console.log('🔄 Attempting fallback queries...');
      await fetchActivityFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityFallback = async () => {
    try {
      console.log('🔄 Using fallback method to fetch activity data...');
      
      // Fallback: fetch data directly using regular queries
      const [transactionsQuery, locksQuery, referralsQuery, portfolioQuery] = await Promise.all([
        supabase
          .from('nctr_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('nctr_locks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('nctr_portfolio')
          .select('available_nctr, pending_nctr, total_earned, lock_90_nctr, lock_360_nctr')
          .eq('user_id', userId)
          .single()
      ]);

      console.log('📊 Fallback queries results:', {
        transactions: transactionsQuery,
        locks: locksQuery,
        referrals: referralsQuery,
        portfolio: portfolioQuery
      });

      if (transactionsQuery.error) console.error('Transactions error:', transactionsQuery.error);
      if (locksQuery.error) console.error('Locks error:', locksQuery.error);
      if (referralsQuery.error) console.error('Referrals error:', referralsQuery.error);
      if (portfolioQuery.error) console.error('Portfolio error:', portfolioQuery.error);

      setTransactions(transactionsQuery.data || []);
      setLocks(locksQuery.data || []);
      setReferrals(referralsQuery.data || []);
      setPortfolio(portfolioQuery.data || null);
      
      console.log('✅ Fallback data loaded successfully');
      
    } catch (fallbackError) {
      console.error('❌ Fallback queries also failed:', fallbackError);
      toast({
        title: "Error Loading Data",
        description: "Unable to load user activity data. Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    } else {
      return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'earned': return 'bg-green-100 text-green-700';
      case 'withdrawal': return 'bg-red-100 text-red-700';
      case 'lock_upgrade': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getLockStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'upgraded': return 'bg-blue-100 text-blue-700';
      case 'unlocked': return 'bg-gray-100 text-gray-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getReferralStatusColor = (status: string, rewarded: boolean) => {
    if (status === 'completed' && rewarded) {
      return 'bg-green-100 text-green-700';
    } else if (status === 'completed') {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-yellow-100 text-yellow-700';
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
      {/* Portfolio Summary Banner */}
      {portfolio && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Available</div>
                <div className="text-xl font-bold text-green-600">
                  {portfolio.available_nctr.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Pending</div>
                <div className="text-xl font-bold text-yellow-600">
                  {portfolio.pending_nctr.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">90 Lock</div>
                <div className="text-xl font-bold text-orange-600">
                  {portfolio.lock_90_nctr.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">360 Lock</div>
                <div className="text-xl font-bold text-purple-600">
                  {portfolio.lock_360_nctr.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Total Earned</div>
                <div className="text-xl font-bold text-primary">
                  {portfolio.total_earned.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === 'transactions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('transactions')}
          className="flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Transactions ({transactions.length})
        </Button>
        <Button
          variant={activeTab === 'locks' ? 'default' : 'outline'}
          onClick={() => setActiveTab('locks')}
          className="flex items-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Locks ({locks.length})
        </Button>
        <Button
          variant={activeTab === 'referrals' ? 'default' : 'outline'}
          onClick={() => setActiveTab('referrals')}
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Referrals ({referrals.length})
        </Button>
      </div>

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.transaction_type, transaction.nctr_amount)}
                      <div>
                        <div className="font-medium">{transaction.description || transaction.transaction_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                        {transaction.partner_name && (
                          <div className="text-xs text-muted-foreground">
                            Partner: {transaction.partner_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${transaction.nctr_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.nctr_amount >= 0 ? '+' : ''}{transaction.nctr_amount.toFixed(2)} NCTR
                      </div>
                      <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                        {transaction.transaction_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Locks Tab */}
      {activeTab === 'locks' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              NCTR Locks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locks.length === 0 ? (
              <div className="text-center py-8">
                <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No locks found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {locks.map((lock) => (
                  <div key={lock.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="font-medium">{lock.lock_type}</div>
                        <div className="text-sm text-muted-foreground">
                          Locked: {format(new Date(lock.lock_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Unlocks: {format(new Date(lock.unlock_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lock.commitment_days} days commitment
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-600">
                        {lock.nctr_amount.toFixed(2)} NCTR
                      </div>
                      <Badge className={getLockStatusColor(lock.status)}>
                        {lock.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Referral History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No referrals found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="font-medium">Referral Code: {referral.referral_code}</div>
                        <div className="text-sm text-muted-foreground">
                          Created: {format(new Date(referral.created_at), 'MMM dd, yyyy')}
                        </div>
                        {referral.rewarded_at && (
                          <div className="text-sm text-muted-foreground">
                            Rewarded: {format(new Date(referral.rewarded_at), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getReferralStatusColor(referral.status, referral.reward_credited)}>
                        {referral.status} {referral.reward_credited ? '(Rewarded)' : ''}
                      </Badge>
                      {referral.reward_credited && (
                        <div className="text-sm text-green-600 mt-1">
                          +1000 NCTR
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserActivityView;
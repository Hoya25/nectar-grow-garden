import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  History, 
  Lock, 
  Users, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Filter,
  Search,
  Download,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  nctr_amount: number;
  transaction_type: string;
  description: string;
  partner_name: string | null;
  status: string;
  earning_source: string | null;
  created_at: string;
  opportunity_id: string | null;
}

interface Lock {
  id: string;
  nctr_amount: number;
  lock_type: string;
  lock_date: string;
  unlock_date: string;
  status: string;
  commitment_days: number;
  can_upgrade: boolean;
  original_lock_type: string;
  upgraded_from_lock_id: string | null;
  created_at: string;
}

interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  reward_credited: boolean;
  created_at: string;
  rewarded_at: string | null;
}

interface StatusChange {
  old_status: string;
  new_status: string;
  date: string;
  nctr_amount: number;
}

export const TransactionHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{from?: Date; to?: Date}>({});
  const [activeTab, setActiveTab] = useState('earnings');

  useEffect(() => {
    if (user) {
      fetchTransactionHistory();
    }
  }, [user]);

  const fetchTransactionHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('nctr_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch locks
      const { data: locksData, error: locksError } = await supabase
        .from('nctr_locks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (locksError) throw locksError;

      // Fetch referrals (both as referrer and referred)
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .or(`referrer_user_id.eq.${user.id},referred_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      setTransactions(transactionsData || []);
      setLocks(locksData || []);
      setReferrals(referralsData || []);

    } catch (error: any) {
      console.error('Error fetching transaction history:', error);
      toast({
        title: "Error Loading History",
        description: error.message || "Failed to load transaction history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getEarningSourceBadge = (source: string | null) => {
    switch (source) {
      case 'referral':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Referral</Badge>;
      case 'affiliate_purchase':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Shopping</Badge>;
      case 'daily_checkin':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Daily Bonus</Badge>;
      case 'profile_completion':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Profile</Badge>;
      case 'social_follow':
        return <Badge variant="secondary" className="bg-pink-100 text-pink-800">Social</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const getLockTypeBadge = (lockType: string) => {
    switch (lockType) {
      case '90LOCK':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">90 Day Lock</Badge>;
      case '360LOCK':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">360 Day Lock</Badge>;
      default:
        return <Badge variant="outline">{lockType}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>;
      case 'upgraded':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Upgraded</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !searchTerm || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.partner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || transaction.earning_source === filterType;
    
    const transactionDate = new Date(transaction.created_at);
    const matchesDate = (!dateRange.from || transactionDate >= dateRange.from) &&
                       (!dateRange.to || transactionDate <= dateRange.to);
    
    return matchesSearch && matchesType && matchesDate;
  });

  const filteredLocks = locks.filter(lock => {
    const matchesSearch = !searchTerm || 
      lock.lock_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const lockDate = new Date(lock.created_at);
    const matchesDate = (!dateRange.from || lockDate >= dateRange.from) &&
                       (!dateRange.to || lockDate <= dateRange.to);
    
    return matchesSearch && matchesDate;
  });

  const filteredReferrals = referrals.filter(referral => {
    const referralDate = new Date(referral.created_at);
    const matchesDate = (!dateRange.from || referralDate >= dateRange.from) &&
                       (!dateRange.to || referralDate <= dateRange.to);
    
    return matchesDate;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading transaction history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="referral">Referrals</SelectItem>
                  <SelectItem value="affiliate_purchase">Shopping</SelectItem>
                  <SelectItem value="daily_checkin">Daily Bonus</SelectItem>
                  <SelectItem value="profile_completion">Profile</SelectItem>
                  <SelectItem value="social_follow">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setDateRange({});
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Earnings ({filteredTransactions.length})
            </TabsTrigger>
            <TabsTrigger value="locks" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Locks ({filteredLocks.length})
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Referrals ({filteredReferrals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No earning transactions found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <Card key={transaction.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">+{transaction.nctr_amount} NCTR</span>
                          {getEarningSourceBadge(transaction.earning_source)}
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        {transaction.partner_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Partner: {transaction.partner_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), "MMM dd, yyyy 'at' HH:mm")}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locks" className="space-y-4">
            {filteredLocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No lock commitments found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLocks.map((lock) => (
                  <Card key={lock.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{lock.nctr_amount} NCTR</span>
                          {getLockTypeBadge(lock.lock_type)}
                          {getStatusBadge(lock.status)}
                          {lock.can_upgrade && (
                            <Badge variant="outline" className="text-xs">Upgradeable</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Locked: {format(new Date(lock.lock_date), "MMM dd, yyyy")}</p>
                          <p>Unlocks: {format(new Date(lock.unlock_date), "MMM dd, yyyy")}</p>
                          <p>Duration: {lock.commitment_days} days</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {lock.upgraded_from_lock_id && (
                          <Badge variant="secondary" className="text-xs mb-2">Upgraded</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            {filteredReferrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No referral activity found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReferrals.map((referral) => (
                  <Card key={referral.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {referral.referrer_user_id === user?.id ? 'You referred someone' : 'You were referred'}
                          </span>
                          {getStatusBadge(referral.status)}
                          {referral.reward_credited && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">Rewarded</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Code: {referral.referral_code}</p>
                          <p>Joined: {format(new Date(referral.created_at), "MMM dd, yyyy")}</p>
                          {referral.rewarded_at && (
                            <p>Rewarded: {format(new Date(referral.rewarded_at), "MMM dd, yyyy")}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
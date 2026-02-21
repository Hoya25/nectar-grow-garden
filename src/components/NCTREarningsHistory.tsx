import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 10;

const SOURCE_MAP: Record<string, { icon: string; label: string }> = {
  signup_bonus: { icon: '🎁', label: 'Welcome Bonus' },
  shopping: { icon: '🛒', label: 'Shopping Earn' },
  referral: { icon: '👥', label: 'Referral Reward' },
  profile_completion: { icon: '✅', label: 'Profile Bonus' },
  bounty: { icon: '⚡', label: 'Bounty Reward' },
};

const getSourceInfo = (source: string | null) => {
  if (source && SOURCE_MAP[source]) return SOURCE_MAP[source];
  return { icon: '✨', label: 'NCTR Earned' };
};

const formatNCTR = (amount: number): string => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
  if (amount >= 10000) return (amount / 1000).toFixed(2) + 'K';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface Transaction {
  id: string;
  created_at: string;
  earning_source: string | null;
  nctr_amount: number;
  description: string | null;
}

export const NCTREarningsHistory: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchTransactions = async (pageNum: number, append = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('nctr_transactions')
        .select('id, created_at, earning_source, nctr_amount, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to + 1); // fetch one extra to check hasMore

      if (error) throw error;

      const rows = data || [];
      const hasNext = rows.length > PAGE_SIZE;
      const pageRows = hasNext ? rows.slice(0, PAGE_SIZE) : rows;

      setTransactions(prev => append ? [...prev, ...pageRows] : pageRows);
      setHasMore(hasNext);
    } catch (err) {
      console.error('Error fetching earnings history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchTransactions(0);

    // Fetch total earned
    supabase
      .from('nctr_transactions')
      .select('nctr_amount')
      .eq('user_id', user.id)
      .eq('transaction_type', 'earned')
      .then(({ data }) => {
        const sum = (data || []).reduce((acc, t) => acc + Number(t.nctr_amount || 0), 0);
        setTotalEarned(sum);
      });
  }, [user]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  };

  if (!user) return null;

  return (
    <Card className="bg-[#5A5A58] border-[#5A5A58] shadow-soft">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-white">NCTR Earnings</CardTitle>
            <p className="text-xs text-white/60 mt-0.5">Your earning history</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-accent-lime">+{formatNCTR(totalEarned)} NCTR</p>
            <p className="text-xs text-white/50">Total earned</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {transactions.length === 0 && !loading ? (
          <div className="text-center py-8">
            <span className="text-3xl mb-3 block">✨</span>
            <p className="text-sm text-white/70 mb-3">
              No earnings yet — start shopping in The Garden to earn your first NCTR
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/garden?tab=shop')}
              className="border-accent-lime/50 text-accent-lime hover:bg-accent-lime/10"
            >
              Browse Brands
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {transactions.map((tx, i) => {
              const { icon, label } = getSourceInfo(tx.earning_source);
              return (
                <div key={tx.id}>
                  {i > 0 && <div className="border-t border-white/10" />}
                  <div className="flex items-center gap-3 py-2.5 px-1 rounded-md hover:bg-white/5 transition-colors">
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-full bg-[#323232] flex items-center justify-center text-sm flex-shrink-0">
                      {icon}
                    </div>

                    {/* Label + notes */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{label}</p>
                      {tx.description && (
                        <p className="text-xs text-white/50 truncate">{tx.description}</p>
                      )}
                    </div>

                    {/* Amount + time */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-accent-lime">
                        +{formatNCTR(tx.nctr_amount)}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="pt-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={loading}
                  className="text-white/60 hover:text-white hover:bg-white/10 text-xs"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

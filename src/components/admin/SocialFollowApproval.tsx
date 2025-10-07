import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ExternalLink, Check, X, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface PendingClaim {
  id: string;
  user_id: string;
  opportunity_id: string;
  nctr_amount: number;
  description: string;
  created_at: string;
  metadata: any; // Using any since metadata is stored as jsonb
  profiles?: {
    full_name: string;
    username: string;
    email: string;
  };
}

const SocialFollowApproval = () => {
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingClaims();
  }, []);

  const fetchPendingClaims = async () => {
    try {
      // First get transactions
      const { data: transactions, error: transError } = await supabase
        .from('nctr_transactions')
        .select('*')
        .eq('earning_source', 'social_follow')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (transError) throw transError;

      // Then get profiles for each user
      const claims = await Promise.all(
        (transactions || []).map(async (trans) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, email')
            .eq('user_id', trans.user_id)
            .single();

          return {
            ...trans,
            profiles: profile
          };
        })
      );

      setPendingClaims(claims as any);
    } catch (error) {
      console.error('Error fetching pending claims:', error);
      toast({
        title: "Error",
        description: "Failed to load pending claims.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveClaim = async (claim: PendingClaim) => {
    setProcessing(claim.id);
    try {
      const { available, lock_90, lock_360 } = claim.metadata.reward_breakdown;

      // Get current portfolio
      const { data: portfolio } = await supabase
        .from('nctr_portfolio')
        .select('available_nctr, total_earned')
        .eq('user_id', claim.user_id)
        .single();

      // Update portfolio
      await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: (portfolio?.available_nctr || 0) + available,
          total_earned: (portfolio?.total_earned || 0) + claim.nctr_amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', claim.user_id);

      // Create locks
      if (lock_90 > 0) {
        await supabase.from('nctr_locks').insert({
          user_id: claim.user_id,
          nctr_amount: lock_90,
          lock_type: '90LOCK',
          lock_category: '90LOCK',
          commitment_days: 90,
          unlock_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: true,
          original_lock_type: '90LOCK'
        });
      }

      if (lock_360 > 0) {
        await supabase.from('nctr_locks').insert({
          user_id: claim.user_id,
          nctr_amount: lock_360,
          lock_type: '360LOCK',
          lock_category: '360LOCK',
          commitment_days: 360,
          unlock_date: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: false,
          original_lock_type: '360LOCK'
        });
      }

      // Update transaction status
      await supabase
        .from('nctr_transactions')
        .update({ 
          status: 'completed',
          metadata: {
            ...claim.metadata,
            approved_at: new Date().toISOString(),
            approved_by_admin: true
          }
        })
        .eq('id', claim.id);

      toast({
        title: "✅ Claim Approved",
        description: `Rewards credited to ${claim.profiles?.username || 'user'}`,
      });

      fetchPendingClaims();
    } catch (error) {
      console.error('Error approving claim:', error);
      toast({
        title: "Error",
        description: "Failed to approve claim. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const rejectClaim = async (claim: PendingClaim, reason?: string) => {
    setProcessing(claim.id);
    try {
      await supabase
        .from('nctr_transactions')
        .update({ 
          status: 'rejected',
          metadata: {
            ...claim.metadata,
            rejected_at: new Date().toISOString(),
            rejected_by_admin: true,
            rejection_reason: reason || 'Username not found in followers'
          }
        })
        .eq('id', claim.id);

      toast({
        title: "❌ Claim Rejected",
        description: `Claim from ${claim.profiles?.username || 'user'} has been rejected.`,
      });

      fetchPendingClaims();
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast({
        title: "Error",
        description: "Failed to reject claim. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading pending claims...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Social Follow Approvals
          {pendingClaims.length > 0 && (
            <Badge variant="secondary">{pendingClaims.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingClaims.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No pending social follow claims</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingClaims.map((claim) => (
              <Card key={claim.id} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{claim.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {claim.profiles?.full_name || claim.profiles?.username || 'Unknown User'}
                          {claim.profiles?.email && ` (${claim.profiles.email})`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-yellow-700">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    {/* Platform & Username */}
                    <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Platform:</span>
                        <span className="text-sm">{claim.metadata.platform}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">User's Handle:</span>
                        <span className="text-sm font-mono bg-background px-2 py-1 rounded">
                          @{claim.metadata.username}
                        </span>
                      </div>
                      {claim.metadata.platform_handle && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Our Account:</span>
                          <a 
                            href={`https://instagram.com/${claim.metadata.platform_handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {claim.metadata.platform_handle}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Reward Breakdown */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Reward:</span>
                      {claim.metadata.reward_breakdown.available > 0 && (
                        <Badge variant="outline">{claim.metadata.reward_breakdown.available} Available</Badge>
                      )}
                      {claim.metadata.reward_breakdown.lock_90 > 0 && (
                        <Badge variant="outline">{claim.metadata.reward_breakdown.lock_90} 90LOCK</Badge>
                      )}
                      {claim.metadata.reward_breakdown.lock_360 > 0 && (
                        <Badge variant="outline">{claim.metadata.reward_breakdown.lock_360} 360LOCK</Badge>
                      )}
                      <span className="font-semibold">{claim.nctr_amount} NCTR total</span>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground">
                      Claimed: {format(new Date(claim.metadata.claimed_at), 'MMM dd, yyyy h:mm a')}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => approveClaim(claim)}
                        disabled={processing === claim.id}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve & Credit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          const reason = prompt("Rejection reason (optional):");
                          rejectClaim(claim, reason || undefined);
                        }}
                        disabled={processing === claim.id}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialFollowApproval;

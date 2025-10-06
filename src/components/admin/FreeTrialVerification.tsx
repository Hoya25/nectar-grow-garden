import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

interface PendingClaim {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  metadata?: any;
  profiles: {
    full_name: string;
    email: string;
    username: string;
  };
}

export const FreeTrialVerification = () => {
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingClaims();
  }, []);

  const fetchPendingClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('nctr_transactions')
        .select(`
          *,
          profiles (
            full_name,
            email,
            username
          )
        `)
        .eq('earning_source', 'free_trial')
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingClaims(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error Loading Claims",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claim: PendingClaim) => {
    setProcessing(claim.id);
    try {
      // Get opportunity details
      const { data: opportunity, error: oppError } = await supabase
        .from('earning_opportunities')
        .select('nctr_reward')
        .eq('id', claim.metadata?.opportunity_id)
        .single();

      if (oppError) throw oppError;

      // Award NCTR using the award function
      const { error: awardError } = await supabase.rpc('award_affiliate_nctr', {
        p_user_id: claim.user_id,
        p_base_nctr_amount: opportunity.nctr_reward || 0,
        p_earning_source: 'free_trial'
      });

      if (awardError) throw awardError;

      // Update the claim status
      const { error: updateError } = await supabase
        .from('nctr_transactions')
        .update({ status: 'completed' })
        .eq('id', claim.id);

      if (updateError) throw updateError;

      toast({
        title: "✅ Approved",
        description: `${opportunity.nctr_reward} NCTR credited to user`,
      });

      fetchPendingClaims();
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (claimId: string) => {
    setProcessing(claimId);
    try {
      const { error } = await supabase
        .from('nctr_transactions')
        .update({ status: 'rejected' })
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: "Claim Rejected",
        description: "User will not receive credit for this claim",
      });

      fetchPendingClaims();
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Free Trial Completion Claims
        </CardTitle>
        <CardDescription>
          Review and approve user-reported free trial completions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingClaims.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending claims
          </div>
        ) : (
          <div className="space-y-4">
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {claim.profiles?.full_name || claim.profiles?.username || claim.profiles?.email}
                      </span>
                      <Badge variant="outline">
                        {new Date(claim.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {claim.description}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(claim)}
                    disabled={processing === claim.id}
                    size="sm"
                    className="flex-1"
                  >
                    {processing === claim.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(claim.id)}
                    disabled={processing === claim.id}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

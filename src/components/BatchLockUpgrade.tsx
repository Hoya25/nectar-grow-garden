import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowUp, Zap, TrendingUp, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface BatchLockUpgradeProps {
  locks: Array<{
    id: string;
    nctr_amount: number;
    lock_category: string;
    can_upgrade?: boolean;
    status: string;
  }>;
  onUpgradeComplete: () => void;
  availableNCTR?: number;
}

const BatchLockUpgrade = ({ locks, onUpgradeComplete, availableNCTR = 0 }: BatchLockUpgradeProps) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeableAmount, setUpgradeableAmount] = useState(0);
  const [upgradeableCount, setUpgradeableCount] = useState(0);
  const [totalCommittable, setTotalCommittable] = useState(0);
  const { user } = useAuth();

  const formatNCTR = (amount: number): string => {
    return Math.floor(amount).toLocaleString();
  };

  // Calculate upgradeable locks and total amount + available NCTR
  useEffect(() => {
    const upgradeableLocks = locks.filter(lock => 
      lock.lock_category === '90LOCK' && 
      lock.can_upgrade === true && 
      lock.status === 'active'
    );
    
    const totalAmountFromLocks = upgradeableLocks.reduce((sum, lock) => sum + lock.nctr_amount, 0);
    const totalCommittableAmount = totalAmountFromLocks + (availableNCTR || 0);
    
    setUpgradeableCount(upgradeableLocks.length);
    setUpgradeableAmount(totalAmountFromLocks);
    setTotalCommittable(totalCommittableAmount);
  }, [locks, availableNCTR]);

  const handleBatchCommitment = async () => {
    if (!user || totalCommittable === 0) return;
    
    setIsUpgrading(true);
    
    try {
      const { data, error } = await supabase.rpc('commit_all_nctr_to_360lock', {
        p_user_id: user.id
      }) as { data: any, error: any };

      if (error) throw error;

      if (data?.success) {
        const availableCommitted = data.available_nctr_committed || 0;
        const locksUpgraded = data.upgraded_locks_count || 0;
        const totalCommitted = data.total_nctr_committed || 0;

        toast({
          title: "🚀 All NCTR Committed to 360LOCK!",
          description: data.message || `Successfully committed ${formatNCTR(totalCommitted)} NCTR to 360LOCK for maximum alliance benefits!`,
        });
        
        onUpgradeComplete();
      } else {
        throw new Error(data?.message || 'Commitment failed');
      }
    } catch (error: any) {
      console.error('Batch commitment error:', error);
      toast({
        title: "Commitment Failed",
        description: error.message || "Unable to commit your NCTR. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  // Don't show if no committable NCTR
  if (totalCommittable === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Commit All to 360LOCK
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {availableNCTR > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                {formatNCTR(availableNCTR)} NCTR
              </Badge>
            </div>
          )}
          
          {upgradeableCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">90LOCK Upgradeable</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                {formatNCTR(upgradeableAmount)} NCTR ({upgradeableCount} locks)
              </Badge>
            </div>
          )}
          
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-sm font-medium text-foreground">Total to Commit</span>
            <Badge className="bg-primary text-primary-foreground">
              {formatNCTR(totalCommittable)} NCTR
            </Badge>
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <TrendingUp className="h-4 w-4" />
            360LOCK Benefits
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 ml-2">
            <li>• Maximum 360-day commitment period</li>
            <li>• Highest alliance status benefits</li>
            <li>• Enhanced earning multipliers</li>
            <li>• Premium platform privileges</li>
          </ul>
        </div>

        <Button 
          onClick={handleBatchCommitment}
          disabled={isUpgrading || totalCommittable === 0}
          variant="360lock"
          className="w-full"
          size="sm"
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          {isUpgrading ? (
            "Committing All to 360LOCK..."
          ) : (
            `Commit All to 360LOCK (${formatNCTR(totalCommittable)} NCTR)`
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Commit all available NCTR and upgrade all 90LOCK balances to 360LOCK
        </p>
      </CardContent>
    </Card>
  );
};

export default BatchLockUpgrade;
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
  show90LockTotal?: number;
}

const BatchLockUpgrade = ({ locks, onUpgradeComplete, show90LockTotal }: BatchLockUpgradeProps) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeableAmount, setUpgradeableAmount] = useState(0);
  const [upgradeableCount, setUpgradeableCount] = useState(0);
  const { user } = useAuth();

  const formatNCTR = (amount: number): string => {
    return Math.floor(amount).toLocaleString();
  };

  // Calculate upgradeable locks and total amount
  useEffect(() => {
    const upgradeableLocks = locks.filter(lock => 
      lock.lock_category === '90LOCK' && 
      lock.can_upgrade === true && 
      lock.status === 'active'
    );
    
    const totalAmount = upgradeableLocks.reduce((sum, lock) => sum + lock.nctr_amount, 0);
    
    setUpgradeableCount(upgradeableLocks.length);
    setUpgradeableAmount(totalAmount);
  }, [locks]);

  const handleBatchUpgrade = async () => {
    if (!user || upgradeableCount === 0) return;
    
    setIsUpgrading(true);
    
    try {
      const { data, error } = await supabase.rpc('upgrade_all_90locks_to_360', {
        p_user_id: user.id
      }) as { data: any, error: any };

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "🚀 All Locks Upgraded!",
          description: `Successfully upgraded ${data.upgraded_count} locks (${formatNCTR(data.total_nctr_upgraded)} NCTR) to 360LOCK for maximum alliance benefits!`,
        });
        
        onUpgradeComplete();
      } else {
        throw new Error(data?.message || 'Upgrade failed');
      }
    } catch (error: any) {
      console.error('Batch upgrade error:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "Unable to upgrade your locks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  // Don't show if no upgradeable locks
  if (upgradeableCount === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Easy Upgrade Available
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Upgradeable Balance</span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {formatNCTR(upgradeableAmount)} NCTR
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Number of Locks</span>
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
              {upgradeableCount} × 90LOCK
            </Badge>
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <TrendingUp className="h-4 w-4" />
            Upgrade Benefits
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 ml-2">
            <li>• Extended commitment to 360 days</li>
            <li>• Maximum alliance status benefits</li>
            <li>• Higher earning multipliers</li>
            <li>• Enhanced platform privileges</li>
          </ul>
        </div>

        <Button 
          onClick={handleBatchUpgrade}
          disabled={isUpgrading || upgradeableCount === 0}
          className="w-full bg-primary hover:bg-primary/90"
          size="sm"
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          {isUpgrading ? (
            "Upgrading All to 360LOCK..."
          ) : (
            `Upgrade All to 360LOCK (${upgradeableCount} locks)`
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Convert all your 90LOCK balances to 360LOCK instantly
        </p>
      </CardContent>
    </Card>
  );
};

export default BatchLockUpgrade;
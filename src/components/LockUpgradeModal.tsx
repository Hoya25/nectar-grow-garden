import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowUp, Lock, TrendingUp, Gift, Calendar } from 'lucide-react';

interface LockUpgradeModalProps {
  lock: {
    id: string;
    nctr_amount: number;
    lock_date: string;
    unlock_date: string;
    can_upgrade?: boolean;
    lock_category: string;
  };
  onUpgradeComplete: () => void;
  children: React.ReactNode;
}

const LockUpgradeModal = ({ lock, onUpgradeComplete, children }: LockUpgradeModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const formatNCTR = (amount: number): string => {
    return Math.floor(amount).toLocaleString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    
    try {
      const { data, error } = await supabase.rpc('upgrade_lock_to_360', {
        p_lock_id: lock.id
      }) as { data: any, error: any };

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "🚀 Lock Upgraded Successfully!",
          description: `Your ${formatNCTR(lock.nctr_amount)} NCTR is now locked in 360LOCK for maximum alliance status benefits!`,
        });
        
        setIsOpen(false);
        onUpgradeComplete();
      } else {
        throw new Error(data?.error || 'Upgrade failed');
      }
    } catch (error) {
      console.error('Error upgrading lock:', error);
      toast({
        title: "Upgrade Failed",
        description: "Unable to upgrade your lock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const daysRemaining = Math.ceil((new Date(lock.unlock_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const newUnlockDate = new Date();
  newUnlockDate.setDate(newUnlockDate.getDate() + 360);

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg">
              <ArrowUp className="w-5 h-5 mr-2 text-primary" />
              Upgrade to 360LOCK
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Lock Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <Badge className="bg-blue-100 text-blue-800 mb-2">
                    Current: 90LOCK
                  </Badge>
                  <div className="text-2xl font-bold text-blue-800 mb-1">
                    {formatNCTR(lock.nctr_amount)} NCTR
                  </div>
                  <div className="text-sm text-blue-600 flex items-center justify-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {daysRemaining} days remaining
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Arrow */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20">
                <ArrowUp className="w-6 h-6 text-primary" />
              </div>
            </div>

            {/* Upgraded Lock Info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <Badge className="bg-primary text-primary-foreground mb-2">
                    Upgraded: 360LOCK
                  </Badge>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatNCTR(lock.nctr_amount)} NCTR
                  </div>
                  <div className="text-sm text-primary/80 flex items-center justify-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Until {formatDate(newUnlockDate.toISOString())}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4 border border-primary/20">
              <h4 className="font-semibold text-primary mb-3 flex items-center">
                <Gift className="w-4 h-4 mr-2" />
                360LOCK Benefits
              </h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <TrendingUp className="w-3 h-3 mr-2 text-green-500" />
                  Maximum alliance status boost
                </li>
                <li className="flex items-center">
                  <Lock className="w-3 h-3 mr-2 text-primary" />
                  Higher reward multipliers
                </li>
                <li className="flex items-center">
                  <Gift className="w-3 h-3 mr-2 text-orange-500" />
                  Access to premium opportunities
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px]"
              >
                {isUpgrading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <ArrowUp className="w-4 h-4 mr-2" />
                )}
                {isUpgrading ? 'Upgrading...' : 'Upgrade to 360LOCK'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                Keep as 90LOCK
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              <p>⚠️ This action cannot be undone. Your lock period will be extended to 360 days from today.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LockUpgradeModal;
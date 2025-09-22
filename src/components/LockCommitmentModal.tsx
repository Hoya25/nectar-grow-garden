import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Lock, TrendingUp, Calendar, Award, Loader2 } from 'lucide-react';

interface LockCommitmentModalProps {
  availableNCTR: number;
  onLockCreated: () => void;
}

const LockCommitmentModal = ({ availableNCTR, onLockCreated }: LockCommitmentModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'90LOCK' | '360LOCK' | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const lockOptions = [
    {
      type: '90LOCK' as const,
      duration: 90,
      title: '90-Day Lock',
      description: 'Lock your NCTR for 90 days to start building your status',
      multiplier: '1.2x',
      benefits: ['Increased earning potential', 'Access to basic opportunities', 'Status progression'],
      color: 'bg-blue-500',
      minAmount: 100
    },
    {
      type: '360LOCK' as const,
      duration: 360,
      title: '360-Day Lock',
      description: 'Maximum commitment for maximum rewards and highest status',
      multiplier: '2.5x',
      benefits: ['Maximum earning potential', 'Premium opportunities', 'VIP status progression', 'Exclusive partner benefits'],
      color: 'bg-purple-500',
      minAmount: 500
    }
  ];

  const selectedOption = lockOptions.find(opt => opt.type === selectedType);
  const numericAmount = parseFloat(amount) || 0;
  const isValidAmount = numericAmount >= (selectedOption?.minAmount || 0) && numericAmount <= availableNCTR;

  const handleCreateLock = async () => {
    if (!selectedOption || !user || !isValidAmount) return;

    setLoading(true);
    
    try {
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + selectedOption.duration);

      // Create lock commitment
      const { error: lockError } = await supabase
        .from('nctr_locks')
        .insert({
          user_id: user.id,
          lock_type: selectedOption.type,
          nctr_amount: numericAmount,
          unlock_date: unlockDate.toISOString(),
        });

      if (lockError) throw lockError;

      // Update portfolio (move from available to pending)
      const { data: currentPortfolio, error: fetchError } = await supabase
        .from('nctr_portfolio')
        .select('available_nctr, pending_nctr')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: currentPortfolio.available_nctr - numericAmount,
          pending_nctr: currentPortfolio.pending_nctr + numericAmount,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('nctr_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'locked',
          nctr_amount: numericAmount,
          description: `Locked ${numericAmount} NCTR for ${selectedOption.duration} days`,
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Lock Created!",
        description: `Successfully locked ${numericAmount} NCTR for ${selectedOption.duration} days.`,
      });

      setOpen(false);
      setSelectedType(null);
      setAmount('');
      onLockCreated();
    } catch (error) {
      console.error('Error creating lock:', error);
      toast({
        title: "Error",
        description: "Failed to create lock commitment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-hero hover:opacity-90">
          <Lock className="w-4 h-4 mr-2" />
          Create Lock Commitment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
            Lock Your NCTR
          </DialogTitle>
          <p className="text-muted-foreground">
            Lock your NCTR tokens to increase your opportunity status and earning potential
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Balance */}
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              Available NCTR: <strong>{availableNCTR.toLocaleString()}</strong>
            </AlertDescription>
          </Alert>

          {/* Lock Type Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            {lockOptions.map((option) => (
              <Card 
                key={option.type}
                className={`cursor-pointer transition-all hover:shadow-glow ${
                  selectedType === option.type 
                    ? 'ring-2 ring-primary shadow-glow' 
                    : 'hover:shadow-medium'
                }`}
                onClick={() => setSelectedType(option.type)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${option.color} mr-2`} />
                      {option.title}
                    </CardTitle>
                    <Badge variant="secondary">{option.multiplier} rewards</Badge>
                  </div>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      {option.duration} days commitment
                    </div>
                    <div className="flex items-center text-sm">
                      <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                      Min. {option.minAmount.toLocaleString()} NCTR
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Benefits:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {option.benefits.map((benefit, idx) => (
                          <li key={idx}>• {benefit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Amount Input */}
          {selectedType && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lock-amount">Amount to Lock</Label>
                <div className="relative">
                  <Input
                    id="lock-amount"
                    type="number"
                    placeholder={`Min. ${selectedOption?.minAmount.toLocaleString()} NCTR`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={selectedOption?.minAmount}
                    max={availableNCTR}
                    step="0.01"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    NCTR
                  </span>
                </div>
                {!isValidAmount && amount && (
                  <p className="text-sm text-destructive">
                    {numericAmount < (selectedOption?.minAmount || 0) 
                      ? `Minimum amount is ${selectedOption?.minAmount.toLocaleString()} NCTR`
                      : `Insufficient balance. Available: ${availableNCTR.toLocaleString()} NCTR`
                    }
                  </p>
                )}
              </div>

              {/* Lock Summary */}
              {isValidAmount && (
                <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Lock Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount:</span>
                        <p className="font-medium">{numericAmount.toLocaleString()} NCTR</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <p className="font-medium">{selectedOption.duration} days</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unlock Date:</span>
                        <p className="font-medium">
                          {new Date(Date.now() + selectedOption.duration * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reward Multiplier:</span>
                        <p className="font-medium text-foreground">{selectedOption.multiplier}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateLock}
                  disabled={!isValidAmount || loading}
                  className="flex-1 bg-gradient-hero hover:opacity-90"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Lock Commitment
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LockCommitmentModal;
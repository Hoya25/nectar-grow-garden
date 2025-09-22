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
import { BuyNCTRButton } from '@/components/BuyNCTRButton';

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
      title: '90LOCK - Standard Commitment',
      description: 'Build your Alliance foundation with a 90-day commitment to steady growth',
      benefits: ['Enhanced earning opportunities', 'Access to partner brands', 'Alliance member benefits', 'Foundation for status building'],
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      minAmount: 100
    },
    {
      type: '360LOCK' as const,
      duration: 360,
      title: '360LOCK - Elite Commitment',
      description: 'Maximum Alliance commitment for elite status qualification and exclusive experiences',
      benefits: ['Qualifies for Member Status tiers', 'Elite partner access', 'VIP experiences & events', 'Exclusive rewards program', 'Priority Alliance status'],
      color: 'bg-gradient-to-r from-primary to-primary/80',
      textColor: 'text-primary',
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/30',
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
          lock_category: selectedOption.type,
          commitment_days: selectedOption.duration,
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
          description: `Committed ${numericAmount} NCTR to ${selectedOption.type} - ${selectedOption.duration} day Alliance membership`,
        });

      if (transactionError) throw transactionError;

      toast({
        title: selectedType === '360LOCK' ? "Elite Alliance Joined!" : "Alliance Joined!",
        description: `Successfully committed ${numericAmount} NCTR to ${selectedOption.type}. Welcome to the Alliance!`,
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
        <Button 
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-soft"
        >
          <Lock className="w-4 h-4 mr-2" />
          Join Alliance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">
            Join The NCTR Alliance
          </DialogTitle>
          <p className="text-muted-foreground">
            Choose your commitment level to unlock exclusive earning opportunities and Alliance benefits
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Balance */}
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Available NCTR: <strong>{availableNCTR.toLocaleString()}</strong></span>
              {availableNCTR < 100 && (
                <BuyNCTRButton 
                  variant="outline" 
                  size="sm"
                  className="ml-4"
                  suggestedAmount={1000}
                >
                  Buy More NCTR
                </BuyNCTRButton>
              )}
            </AlertDescription>
          </Alert>

          {/* Lock Type Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            {lockOptions.map((option) => (
              <Card 
                key={option.type}
                className={`cursor-pointer transition-all hover:shadow-glow ${option.bgColor} ${option.borderColor} border-2 ${
                  selectedType === option.type 
                    ? 'ring-2 ring-primary shadow-glow-intense scale-[1.02]' 
                    : 'hover:shadow-medium hover:scale-[1.01]'
                }`}
                onClick={() => setSelectedType(option.type)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className={`flex items-center ${option.textColor}`}>
                      <div className={`w-4 h-4 rounded-full ${option.color} mr-3 shadow-sm`} />
                      {option.title}
                    </CardTitle>
                    <Badge className={`${option.color} text-white border-0 shadow-sm`}>
                      {option.duration}D
                    </Badge>
                  </div>
                  <CardDescription className={option.textColor}>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className={`flex items-center ${option.textColor}`}>
                        <Calendar className="w-4 h-4 mr-2" />
                        {option.duration} days
                      </div>
                      <div className={`flex items-center ${option.textColor}`}>
                        <Award className="w-4 h-4 mr-2" />
                        Min. {option.minAmount.toLocaleString()} NCTR
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className={`text-sm font-semibold ${option.textColor}`}>Alliance Benefits:</p>
                      <ul className={`text-xs space-y-1 ${option.textColor}/80`}>
                        {option.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{benefit}</span>
                          </li>
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
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">
                      {numericAmount < (selectedOption?.minAmount || 0) 
                        ? `Minimum amount is ${selectedOption?.minAmount.toLocaleString()} NCTR`
                        : `Insufficient balance. Available: ${availableNCTR.toLocaleString()} NCTR`
                      }
                    </p>
                    {numericAmount > availableNCTR && (
                      <BuyNCTRButton 
                        variant="outline"
                        size="sm"
                        suggestedAmount={Math.ceil((numericAmount - availableNCTR) / 100) * 100}
                        className="text-primary border-primary"
                      >
                        Buy {(numericAmount - availableNCTR).toLocaleString()} More NCTR
                      </BuyNCTRButton>
                    )}
                  </div>
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
                        <span className="text-muted-foreground">Commitment:</span>
                        <p className="font-medium text-foreground">{selectedOption.type} Alliance</p>
                      </div>
                    </div>
                    {selectedType === '360LOCK' && (
                      <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-sm text-primary font-medium">
                          💎 360LOCK qualifies for Member Status tiers with earning multipliers up to 2.0x!
                        </p>
                      </div>
                    )}
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
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-medium hover:shadow-large transition-all duration-300"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {selectedType === '360LOCK' ? 'Join Elite Alliance' : 'Join Standard Alliance'}
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
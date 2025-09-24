import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, AlertTriangle, Info, Network } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableNCTR: number;
  walletAddress?: string;
}

export const WithdrawalModal = ({ isOpen, onClose, availableNCTR, walletAddress }: WithdrawalModalProps) => {
  const [amount, setAmount] = useState('');
  const [customWallet, setCustomWallet] = useState('');
  const [useCustomWallet, setUseCustomWallet] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fees, setFees] = useState({ withdrawalFee: 0, gasFee: 0.5, netAmount: 0 });
  const { toast } = useToast();
  const { provider } = useWallet();

  const calculateFees = (withdrawalAmount: number) => {
    // No fees - user gets full amount
    setFees({
      withdrawalFee: 0,
      gasFee: 0,
      netAmount: withdrawalAmount
    });
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const numAmount = parseFloat(value) || 0;
    calculateFees(numAmount);
  };

  const handleWithdrawal = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive"
      });
      return;
    }

    const targetWallet = useCustomWallet ? customWallet : walletAddress;
    if (!targetWallet) {
      toast({
        title: "Wallet Required",
        description: "Please connect a wallet or provide a custom wallet address",
        variant: "destructive"
      });
      return;
    }

    // Check if user is on Base network
    if (provider && !useCustomWallet) {
      try {
        const network = await provider.getNetwork();
        if (network.chainId !== 8453n) { // Base mainnet chain ID
          toast({
            title: "Wrong Network",
            description: "Please switch to Base network in your wallet to proceed with withdrawal",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        console.error('Network check error:', error);
      }
    }

    const withdrawalAmount = parseFloat(amount);
    
    if (withdrawalAmount > availableNCTR) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${availableNCTR} NCTR available`,
        variant: "destructive"
      });
      return;
    }

    if (fees.netAmount <= 0) {
      toast({
        title: "Amount Too Small", 
        description: "Please enter a valid withdrawal amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.rpc('create_withdrawal_request', {
        p_nctr_amount: withdrawalAmount,
        p_wallet_address: targetWallet
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; request_id?: string };
      
      if (result.success) {
        toast({
          title: "Withdrawal Requested",
          description: `Your withdrawal of ${withdrawalAmount} NCTR has been submitted for processing`,
        });
        onClose();
        setAmount('');
        setCustomWallet('');
        setUseCustomWallet(false);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to create withdrawal request",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Withdraw NCTR
          </DialogTitle>
          <DialogDescription>
            Withdraw your available NCTR to your wallet address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Available Balance: <strong>{availableNCTR.toFixed(2)} NCTR</strong>
            </AlertDescription>
          </Alert>

          <Alert>
            <Network className="h-4 w-4" />
            <AlertDescription>
              <strong>Base Network Required:</strong> Withdrawals are processed on Base network. Ensure your wallet is connected to Base.
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Fee-Free Withdrawals:</strong> No fees charged! You receive the full amount you withdraw.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount (NCTR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount to withdraw"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              max={availableNCTR}
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Destination Wallet</Label>
            <div className="space-y-3">
              {walletAddress && (
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="connected-wallet"
                    checked={!useCustomWallet}
                    onChange={() => setUseCustomWallet(false)}
                  />
                  <label htmlFor="connected-wallet" className="text-sm">
                    Connected Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </label>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom-wallet"
                  checked={useCustomWallet}
                  onChange={() => setUseCustomWallet(true)}
                />
                <label htmlFor="custom-wallet" className="text-sm">
                  Custom Wallet Address
                </label>
              </div>
              
              {useCustomWallet && (
                <Input
                  placeholder="Enter Ethereum wallet address"
                  value={customWallet}
                  onChange={(e) => setCustomWallet(e.target.value)}
                />
              )}
            </div>
          </div>

          {parseFloat(amount) > 0 && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-medium">You'll Receive:</span>
                <span className="text-green-800 font-bold text-lg">{parseFloat(amount).toFixed(2)} NCTR</span>
              </div>
              <p className="text-green-600 text-sm mt-1">✅ Fee-free withdrawal</p>
            </div>
          )}

          {fees.netAmount <= 0 && parseFloat(amount) > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please enter a valid withdrawal amount.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleWithdrawal} 
              disabled={isProcessing || parseFloat(amount) <= 0 || !amount}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Withdraw NCTR'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
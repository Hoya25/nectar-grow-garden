import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AllianceTokenWalletPromptProps {
  userId: string;
  hasWallet: boolean;
  onWalletAdded?: () => void;
}

export const AllianceTokenWalletPrompt = ({ 
  userId, 
  hasWallet,
  onWalletAdded 
}: AllianceTokenWalletPromptProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || hasWallet) return;

    // Subscribe to new transactions with alliance tokens
    const channel = supabase
      .channel('alliance-token-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nctr_transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const transaction = payload.new as any;
          
          // Check if this transaction includes alliance tokens
          if (transaction.alliance_token_amount && 
              transaction.alliance_token_amount > 0 && 
              transaction.alliance_token_symbol) {
            setTokenSymbol(transaction.alliance_token_symbol);
            setShowPrompt(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, hasWallet]);

  const handleSaveWallet = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "Wallet Required",
        description: "Please enter a valid wallet address",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: walletAddress.trim(),
          wallet_connected_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Wallet Address Saved",
        description: `Your ${tokenSymbol} will be sent to this address when you request withdrawal.`
      });

      setShowPrompt(false);
      onWalletAdded?.();
    } catch (error) {
      console.error('Error saving wallet:', error);
      toast({
        title: "Error",
        description: "Failed to save wallet address. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setShowPrompt(false);
    toast({
      title: "Reminder",
      description: "You can add your wallet address anytime from your Profile settings.",
    });
  };

  if (!showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Add Wallet Address for {tokenSymbol}
          </DialogTitle>
          <DialogDescription>
            You've earned {tokenSymbol} tokens! Add your wallet address to receive these tokens when you request a withdrawal.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your {tokenSymbol} tokens are safely locked until you provide a withdrawal address. You can add this anytime from your Profile.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet-address">Wallet Address</Label>
            <Input
              id="wallet-address"
              placeholder={`Enter your ${tokenSymbol} wallet address`}
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter a valid wallet address compatible with {tokenSymbol}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveWallet}
              disabled={saving || !walletAddress.trim()}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Wallet"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={saving}
              className="flex-1"
            >
              Skip for Now
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your wallet address is securely stored and only used for token withdrawals
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

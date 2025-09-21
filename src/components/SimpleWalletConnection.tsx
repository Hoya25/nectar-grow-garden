import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SimpleWalletConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const viewOnBaseScan = () => {
    if (address) {
      window.open(`https://basescan.org/address/${address}`, '_blank');
    }
  };

  const connectWallet = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to connect your wallet",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // For now, simulate wallet connection with a test address
      // This removes the Coinbase SDK dependency that was causing React conflicts
      const testAddress = "0x" + Math.random().toString(16).substring(2, 42);
      
      // Update user profile with wallet address
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          wallet_address: testAddress,
          wallet_connected_at: new Date().toISOString(),
          email: user.email,
          full_name: user.user_metadata?.full_name
        });

      if (updateError) {
        throw updateError;
      }

      setAddress(testAddress);
      setIsConnected(true);

      toast({
        title: "Wallet Connected (Demo)",
        description: `Connected to ${formatAddress(testAddress)}`,
      });

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    if (!user) return;

    try {
      // Remove wallet address from user profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: null, 
          wallet_connected_at: null 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setAddress(null);
      setIsConnected(false);

      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });

    } catch (error: any) {
      console.error('Wallet disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect wallet",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-primary" />
          Base Wallet (Demo)
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to interact with NCTR tokens on the Base network.
              <br />
              <span className="text-xs text-yellow-600">Note: Demo mode - real Coinbase integration coming soon</span>
            </p>
            <Button 
              onClick={connectWallet} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Connecting..." : "Connect Wallet (Demo)"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Connected (Demo)
              </Badge>
              <Badge variant="secondary">Base Network</Badge>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Wallet Address
              </label>
              <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border">
                <span className="font-mono text-sm flex-1">
                  {formatAddress(address!)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyAddress}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={viewOnBaseScan}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button 
                variant="outline" 
                onClick={disconnectWallet}
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleWalletConnection;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink, Copy, LogIn } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const WalletConnection = () => {
  const { isConnected, address, connectWallet, disconnectWallet, loading } = useWallet();
  const { signInWithWallet, user } = useAuth();
  const { toast } = useToast();
  const [signingIn, setSigningIn] = useState(false);

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

  const handleSignInWithWallet = async () => {
    if (!address) return;

    setSigningIn(true);
    try {
      const { error } = await signInWithWallet(address);
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message || "Failed to sign in with wallet",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: "Signed in with your Base wallet",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSigningIn(false);
    }
  };

  const isWalletAuthenticated = user?.user_metadata?.wallet_address?.toLowerCase() === address?.toLowerCase();

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-foreground" />
          Base Wallet
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Coinbase Base Wallet to interact with NCTR tokens on the Base network.
            </p>
            <Button 
              onClick={connectWallet} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Connected
              </Badge>
              <Badge variant="secondary">Base Network</Badge>
              {isWalletAuthenticated && (
                <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                  Authenticated
                </Badge>
              )}
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
              {!user && (
                <Button 
                  onClick={handleSignInWithWallet}
                  disabled={signingIn}
                  className="w-full"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {signingIn ? "Signing In..." : "Sign In with Wallet"}
                </Button>
              )}
              
              {user && !isWalletAuthenticated && (
                <Button 
                  onClick={handleSignInWithWallet}
                  disabled={signingIn}
                  variant="outline"
                  className="w-full"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {signingIn ? "Linking..." : "Link Wallet to Account"}
                </Button>
              )}
              
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

export default WalletConnection;
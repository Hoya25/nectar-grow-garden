import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { BrowserProvider } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  provider: BrowserProvider | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  loading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize Coinbase Wallet SDK
  const coinbaseWallet = new CoinbaseWalletSDK({
    appName: 'NCTR Garden',
    appLogoUrl: '/favicon.ico'
  });

  // Check for existing wallet connection on mount
  useEffect(() => {
    checkExistingConnection();
  }, [user]);

  const checkExistingConnection = async () => {
    if (!user) return;

    try {
      // Check if user has a wallet address in their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.wallet_address) {
        // Try to reconnect to the wallet
        const ethereum = coinbaseWallet.makeWeb3Provider();
        const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
        
        if (accounts.length > 0 && accounts[0].toLowerCase() === profile.wallet_address.toLowerCase()) {
          setAddress(accounts[0]);
          setIsConnected(true);
          setProvider(new BrowserProvider(ethereum));
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
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
      const ethereum = coinbaseWallet.makeWeb3Provider();
      
      // Request account access
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0];
      
      // Switch to Base network (Chain ID: 8453)
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // Base mainnet
        });
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        }
      }

      // Update user profile with wallet address
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          wallet_address: walletAddress,
          wallet_connected_at: new Date().toISOString(),
          email: user.email,
          full_name: user.user_metadata?.full_name
        });

      if (updateError) {
        throw updateError;
      }

      setAddress(walletAddress);
      setIsConnected(true);
      setProvider(new BrowserProvider(ethereum));

      toast({
        title: "Wallet Connected",
        description: `Connected to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
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
      setProvider(null);

      // Disconnect from Coinbase Wallet
      const ethereum = coinbaseWallet.makeWeb3Provider();
      if (ethereum.disconnect) {
        await ethereum.disconnect();
      }

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
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        provider,
        connectWallet,
        disconnectWallet,
        loading
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { BrowserProvider } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
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
    return {
      isConnected: false,
      address: null,
      provider: null,
      connectWallet: async () => {
        throw new Error('useWallet must be used within a WalletProvider');
      },
      disconnectWallet: async () => {
        throw new Error('useWallet must be used within a WalletProvider');
      },
      loading: false
    };
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  const coinbaseWallet = new CoinbaseWalletSDK({
    appName: 'NCTR Garden',
    appLogoUrl: '/favicon.ico'
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      checkExistingConnection();
    } else {
      setAddress(null);
      setIsConnected(false);
      setProvider(null);
    }
  }, [currentUser]);

  const checkExistingConnection = async () => {
    if (!currentUser) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profile?.wallet_address) {
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
    setLoading(true);
    try {
      const ethereum = coinbaseWallet.makeWeb3Provider();
      
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0];
      
      // Switch to Base network
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        }
      }

      setAddress(walletAddress);
      setIsConnected(true);
      setProvider(new BrowserProvider(ethereum));

      // Only update profile if user is authenticated — NO password changes
      if (currentUser) {
        // Update user profile with wallet address
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            wallet_address: walletAddress,
            wallet_connected_at: new Date().toISOString()
          })
          .eq('user_id', currentUser.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
        }

        // Check if profile is now complete and award bonus if eligible
        try {
          const { data: completionCheck } = await supabase.rpc('calculate_profile_completion', {
            p_user_id: currentUser.id
          });
          
          if (completionCheck && typeof completionCheck === 'object' && 'eligible_for_bonus' in completionCheck && completionCheck.eligible_for_bonus) {
            await supabase.rpc('award_profile_completion_bonus', {
              p_user_id: currentUser.id
            });
            
            toast({
              title: "Profile Complete! 🎉",
              description: "You've earned 500 NCTR for completing your profile!",
            });
          }
        } catch (profileError) {
          console.error('Error checking profile completion:', profileError);
        }
      }

      toast({
        title: "Wallet Connected",
        description: currentUser 
          ? `Wallet linked to your account!`
          : `Connected to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
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
    try {
      if (currentUser) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            wallet_address: null, 
            wallet_connected_at: null 
          })
          .eq('user_id', currentUser.id);

        if (error) throw error;
      }

      setAddress(null);
      setIsConnected(false);
      setProvider(null);

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

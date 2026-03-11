import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, referralCode?: string | null) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithWallet: (walletAddress: string, signer?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth state change:', event, session?.user?.id ? 'User logged in' : 'User logged out');
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Initial session:', session?.user?.id ? 'User session found' : 'No session');
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, referralCode?: string | null) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const userData: any = {};
    if (fullName) {
      userData.full_name = fullName;
    }
    if (referralCode) {
      userData.referral_code = referralCode;
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: Object.keys(userData).length > 0 ? userData : undefined,
      }
    });
    
    // Capture IP address for fraud detection
    if (!error) {
      setTimeout(async () => {
        try {
          await supabase.functions.invoke('capture-user-ip', {
            body: { action: 'signup' }
          });
          console.log('✅ IP captured for new signup');
        } catch (ipError) {
          console.error('Failed to capture IP (non-blocking):', ipError);
        }
      }, 500);
    }
    
    // If signup was successful, add user to Mailchimp
    if (!error && fullName) {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setTimeout(async () => {
        try {
          const { supabase: supabaseClient } = await import('@/integrations/supabase/client');
          
          const { error: mailchimpError } = await supabaseClient.functions.invoke('mailchimp-integration', {
            body: {
              action: 'subscribe',
              listId: 'ac31586d64',
              contact: {
                email,
                firstName,
                lastName,
                status: 'subscribed',
                tags: ['new-signup', 'garden-member'],
                mergeFields: {
                  SIGNUP_DATE: new Date().toISOString().split('T')[0],
                  REFERRAL: referralCode || '',
                }
              }
            }
          });
          
          if (!mailchimpError) {
            console.log('User successfully subscribed to Mailchimp');
            
            await supabaseClient.functions.invoke('mailchimp-integration', {
              body: {
                action: 'send_confirmation',
                listId: 'ac31586d64',
                contact: { email, firstName, lastName },
                emailTemplate: {
                  templateId: 12752381,
                  subject: `Welcome to The Garden, ${firstName}! 🌱`,
                  customData: {
                    from_name: 'The Garden Team',
                    reply_to: 'support@nctr.live'
                  }
                }
              }
            });
          }
        } catch (mailchimpError) {
          console.error('Mailchimp integration failed (non-blocking):', mailchimpError);
        }
      }, 1000);
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      setTimeout(async () => {
        try {
          await supabase.functions.invoke('capture-user-ip', {
            body: { action: 'login' }
          });
          console.log('✅ Login IP captured');
        } catch (ipError) {
          console.error('Failed to capture login IP (non-blocking):', ipError);
        }
      }, 500);
    }
    
    return { error };
  };

  const signInWithWallet = async (walletAddress: string, signer?: any) => {
    try {
      console.log('🔐 Starting wallet authentication for:', walletAddress);

      // STEP 1: Request a challenge from the server
      console.log('🔑 Requesting challenge...');
      const { data: challengeData, error: challengeError } = await supabase.functions.invoke('wallet-auth', {
        body: { action: 'challenge', walletAddress }
      });

      if (challengeError || !challengeData?.message) {
        console.error('❌ Failed to get challenge:', challengeError);
        return { error: challengeError || new Error('Failed to get authentication challenge') };
      }

      console.log('✅ Challenge received, requesting wallet signature...');

      // STEP 2: Sign the challenge message with the wallet
      let signedMessage: string;
      try {
        if (signer && typeof signer.signMessage === 'function') {
          signedMessage = await signer.signMessage(challengeData.message);
        } else {
          // Fallback: try using window.ethereum personal_sign
          const ethereum = (window as any).ethereum;
          if (!ethereum) {
            return { error: new Error('No wallet signer available. Please reconnect your wallet.') };
          }
          signedMessage = await ethereum.request({
            method: 'personal_sign',
            params: [challengeData.message, walletAddress],
          });
        }
      } catch (signError: any) {
        console.error('❌ User rejected signature or signing failed:', signError);
        return { error: new Error('Wallet signature was rejected or failed. Please try again.') };
      }

      console.log('✅ Message signed, verifying with server...');

      // STEP 3: Send signature to server for verification
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('wallet-auth', {
        body: {
          action: 'verify',
          walletAddress,
          signature: {
            message: challengeData.message,
            sig: signedMessage,
          }
        }
      });

      if (verifyError) {
        console.error('❌ Server verification failed:', verifyError);
        return { error: verifyError };
      }

      // Handle case where wallet is not linked to any account
      if (verifyData?.needsSignup) {
        console.log('ℹ️ Wallet verified but not linked to an account');
        return { error: new Error('This wallet is not linked to any account. Please sign up first or link your wallet from your profile.') };
      }

      if (!verifyData?.token) {
        return { error: new Error('Authentication failed - no token received') };
      }

      console.log('✅ Signature verified, completing authentication...');

      // STEP 4: Use the token to create a session
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: verifyData.token,
        type: 'magiclink'
      });

      if (otpError) {
        console.error('❌ Token verification failed:', otpError);
        return { error: otpError };
      }

      console.log('✅ Successfully signed in with wallet');
      
      // Capture login IP
      setTimeout(async () => {
        try {
          await supabase.functions.invoke('capture-user-ip', {
            body: { action: 'wallet_login' }
          });
        } catch (ipError) {
          console.error('Failed to capture login IP (non-blocking):', ipError);
        }
      }, 500);

      return { error: null };

    } catch (error: any) {
      console.error('❌ Wallet authentication error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      signUp,
      signIn,
      signInWithWallet,
      signOut,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

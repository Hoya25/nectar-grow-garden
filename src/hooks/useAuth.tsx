import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, referralCode?: string | null) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithWallet: (walletAddress: string) => Promise<{ error: any }>;
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Security: Remove sensitive user data from console logs in production
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth state change:', event, session?.user?.id ? 'User logged in' : 'User logged out');
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Security: Remove sensitive user data from console logs in production
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
      // Parse full name into first and last names
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Subscribe user to Mailchimp in the background
      // This won't block the signup process if it fails
      setTimeout(async () => {
        try {
          // Import and use Mailchimp integration dynamically to avoid initialization issues
          const { supabase: supabaseClient } = await import('@/integrations/supabase/client');
          
          const { error: mailchimpError } = await supabaseClient.functions.invoke('mailchimp-integration', {
            body: {
              action: 'subscribe',
              listId: 'ac31586d64', // Your Mailchimp Audience ID
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
            
            // Also send a branded welcome email
            await supabaseClient.functions.invoke('mailchimp-integration', {
              body: {
                action: 'send_confirmation',
                listId: 'ac31586d64', // Your Mailchimp Audience ID
                contact: { email, firstName, lastName },
                emailTemplate: {
                  templateId: 12752381, // Your actual Mailchimp template ID
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
      }, 1000); // Delay to ensure user signup completes first
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Capture login IP for tracking
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

  const signInWithWallet = async (walletAddress: string) => {
    try {
      console.log('🔐 Starting wallet authentication for:', walletAddress);

      // Generate deterministic password using SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(walletAddress.toLowerCase());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const deterministicPassword = `Wa11et${hashHex.slice(0, 26)}9X`;

      // First, check if this wallet is already linked to an existing user
      console.log('🔍 Checking if wallet is linked to existing account...');
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email, user_id')
        .ilike('wallet_address', walletAddress) // Case-insensitive match
        .maybeSingle();

      console.log('🔍 Profile lookup result:', { existingProfile, profileError });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Error checking for existing profile:', profileError);
      }

      if (existingProfile?.email) {
        // Wallet is linked to an existing account - use server-side wallet auth
        console.log('✅ Found existing account linked to wallet, authenticating via server...');
        
        const { data: authData, error: authError } = await supabase.functions.invoke('wallet-auth', {
          body: { walletAddress }
        });

        if (authError || !authData?.token) {
          console.error('❌ Server-side wallet auth failed:', authError);
          return { 
            error: authError || new Error('Failed to authenticate wallet') 
          };
        }

        console.log('✅ Got auth token from server, verifying OTP...');

        // Use the token to verify and create session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: authData.token,
          type: 'magiclink'
        });

        if (verifyError) {
          console.error('❌ Token verification failed:', verifyError);
          return { error: verifyError };
        }

        console.log('✅ Successfully signed in with linked wallet account');
        
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
      }

      // No existing profile found - create new wallet-only account
      console.log('📧 No existing account found, creating new wallet account');
      const walletEmail = `wallet-${walletAddress.toLowerCase().replace('0x', '')}@base.app`;

      // Attempt to sign in
      let { error: signInError } = await supabase.auth.signInWithPassword({
        email: walletEmail,
        password: deterministicPassword,
      });

      // If email not confirmed, auto-confirm wallet email and retry
      if (signInError && (signInError.message.includes('Email not confirmed') || (signInError as any).code === 'email_not_confirmed')) {
        console.log('📧 Email not confirmed, auto-confirming wallet email...');
        
        const { error: confirmError } = await supabase.functions.invoke('auto-confirm-wallet', {
          body: { email: walletEmail }
        });

        if (confirmError) {
          console.error('❌ Auto-confirm failed:', confirmError);
          return { error: new Error('Failed to auto-confirm wallet email') };
        }

        console.log('✅ Wallet email auto-confirmed, retrying sign in...');
        
        // Retry sign in after confirmation
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: walletEmail,
          password: deterministicPassword,
        });

        if (retryError) {
          console.error('❌ Retry sign in failed:', retryError);
          return { error: retryError };
        }

        console.log('✅ Sign in successful after auto-confirmation');
        signInError = null; // Clear the error since sign-in succeeded
      }

      // If user already exists with different password, migrate it
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        console.log('🔄 Credentials invalid, attempting password migration...');

        const { data: migrationData, error: migrationError } = await supabase.functions.invoke(
          'migrate-wallet-password',
          {
            body: { walletAddress }
          }
        );

        if (migrationError) {
          console.error('❌ Migration failed:', migrationError);
          return { error: new Error('Failed to migrate wallet credentials') };
        }

        console.log('✅ Migration response:', migrationData);

        // If migration says it's a new user, create the account
        if (migrationData?.requiresSignup) {
          console.log('📝 Creating new wallet account...');
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: walletEmail,
            password: deterministicPassword,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                wallet_address: walletAddress,
                is_wallet_auth: true,
              }
            }
          });

          if (signUpError) {
            console.error('❌ Signup failed:', signUpError);
            return { error: signUpError };
          }

          console.log('✅ New wallet account created successfully');
          
          // Save wallet address to the new profile
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              wallet_address: walletAddress,
              wallet_connected_at: new Date().toISOString()
            })
            .eq('user_id', signUpData.user?.id);

          if (profileUpdateError) {
            console.error('❌ Failed to save wallet address to profile:', profileUpdateError);
          } else {
            console.log('✅ Wallet address saved to new profile');
          }
          
          // Auto-confirm wallet email using edge function
          console.log('📧 Auto-confirming wallet email...');
          const { error: confirmError } = await supabase.functions.invoke('auto-confirm-wallet', {
            body: { email: walletEmail }
          });

          if (confirmError) {
            console.error('❌ Auto-confirm failed:', confirmError);
          } else {
            console.log('✅ Wallet email auto-confirmed');
          }
          
          // Now sign in with the confirmed account
          console.log('🔐 Signing in with wallet account...');
          const { error: postSignUpLoginError } = await supabase.auth.signInWithPassword({
            email: walletEmail,
            password: deterministicPassword,
          });

          if (postSignUpLoginError) {
            console.error('❌ Post-signup sign in failed:', postSignUpLoginError);
            return { error: postSignUpLoginError };
          }
          
          console.log('✅ Wallet account signed in successfully');
          
          // Capture IP for new wallet signup
          setTimeout(async () => {
            try {
              await supabase.functions.invoke('capture-user-ip', {
                body: { action: 'wallet_signup' }
              });
            } catch (ipError) {
              console.error('Failed to capture IP (non-blocking):', ipError);
            }
          }, 500);

          return { error: null };
        }

        // Retry sign in after successful migration
        console.log('🔄 Retrying sign in after migration...');
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: walletEmail,
          password: deterministicPassword,
        });

        if (retryError) {
          console.error('❌ Retry sign in failed:', retryError);
          return { error: retryError };
        }

        console.log('✅ Sign in successful after migration');
        
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
      }

      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        return { error: signInError };
      }

      console.log('✅ Wallet sign in successful');
      
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
      return { error: error };
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
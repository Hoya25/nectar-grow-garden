import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useMailchimp } from './useMailchimp';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, referralCode?: string | null) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
  const { subscribeUser, sendWelcomeEmail } = useMailchimp();

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
          await subscribeUser({
            email,
            firstName,
            lastName,
            status: 'subscribed',
            tags: ['new-signup', 'garden-member'],
            mergeFields: {
              SIGNUP_DATE: new Date().toISOString().split('T')[0],
              REFERRAL: referralCode || '',
            }
          });
          
          // Also send a branded welcome email
          await sendWelcomeEmail({
            email,
            firstName,
            lastName
          });
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
    
    return { error };
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
      signOut,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
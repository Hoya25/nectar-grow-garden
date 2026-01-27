import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

declare global {
  interface Window {
    Userback: any;
  }
}

export const Userback = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize Userback
    window.Userback = window.Userback || {};
    window.Userback.access_token = 'A-CgAKnnPbKMeBZelCUa5I3ita5';
    
    // Add user data if logged in
    if (user) {
      window.Userback.user_data = {
        id: user.id,
        info: {
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || ''
        }
      };
    }

    // Load the script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://static.userback.io/widget/v1.js';
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [user]);

  return null;
};

export default Userback;

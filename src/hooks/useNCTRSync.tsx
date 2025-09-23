import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

interface SyncResult {
  success: boolean;
  message: string;
  data?: {
    available_nctr: number;
    lock_360_nctr: number;
    total_earned: number;
    status_updated: boolean;
    new_status: string;
  };
}

export const useNCTRSync = () => {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const syncPortfolio = async (walletAddress?: string): Promise<SyncResult> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to sync your portfolio",
        variant: "destructive",
      });
      return { success: false, message: "User not authenticated" };
    }

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('token-nctr-sync', {
        body: {
          action: 'sync_portfolio',
          user_id: user.id,
          wallet_address: walletAddress
        }
      });

      if (error) {
        console.error('Sync error:', error);
        toast({
          title: "Sync Failed",
          description: "Failed to connect to NCTR Live. Please try again.",
          variant: "destructive",
        });
        return { success: false, message: error.message };
      }

      if (data.success) {
        toast({
          title: "Portfolio Synced! 🎉",
          description: `Synced from NCTR Live: ${data.data.available_nctr} available, ${data.data.lock_360_nctr} in 360LOCK. Status: ${data.data.new_status}`,
        });
        
        // Trigger a page refresh to show updated data
        window.location.reload();
      } else {
        toast({
          title: "Sync Failed",
          description: data.message || "Unknown error occurred",
          variant: "destructive",
        });
      }

      return data;

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
      return { success: false, message: "Network error" };
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncPortfolio,
    syncing,
  };
};
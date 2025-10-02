import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PartyPopper, ShoppingBag, Gift, TrendingUp } from 'lucide-react';

interface TransactionNotificationProps {
  userId: string | undefined;
  onTransactionReceived?: () => void;
}

export const useTransactionNotifications = ({ userId, onTransactionReceived }: TransactionNotificationProps) => {
  const lastNotifiedTransaction = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Setting up real-time transaction notifications for user:', userId);

    const channel = supabase
      .channel('transaction-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nctr_transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🎉 New transaction detected:', payload);
          
          const transaction = payload.new as any;
          
          // Avoid duplicate notifications
          if (lastNotifiedTransaction.current === transaction.id) {
            return;
          }
          lastNotifiedTransaction.current = transaction.id;

          // Only show notifications for earned transactions (purchases, not withdrawals)
          if (transaction.transaction_type === 'earned') {
            showCelebrationNotification(transaction);
            onTransactionReceived?.();
          }
        }
      )
      .subscribe((status) => {
        console.log('Transaction notification subscription status:', status);
      });

    return () => {
      console.log('🔕 Cleaning up transaction notifications');
      supabase.removeChannel(channel);
    };
  }, [userId, onTransactionReceived]);

  const showCelebrationNotification = (transaction: any) => {
    const nctrAmount = parseFloat(transaction.nctr_amount || 0);
    const source = transaction.earning_source;
    const partnerName = transaction.partner_name;
    const description = transaction.description;

    // Determine notification style based on source
    let title = '🎉 NCTR Earned!';
    let message = '';
    let icon = PartyPopper;

    switch (source) {
      case 'token_purchase':
        title = '🎉 NCTR Purchase Successful!';
        message = description || `Your ${formatNCTR(nctrAmount)} NCTR has been locked in 360LOCK!`;
        icon = ShoppingBag;
        
        // Show extra celebratory message for large purchases
        if (nctrAmount >= 1000) {
          setTimeout(() => {
            toast({
              title: "🌟 Welcome to The Garden!",
              description: `Your ${formatNCTR(nctrAmount)} NCTR is now working for you in 360LOCK!`,
              duration: 5000,
            });
          }, 2000);
        }
        break;
        
      case 'affiliate_purchase':
        title = '🛍️ Purchase Confirmed!';
        message = `You earned ${formatNCTR(nctrAmount)} NCTR from ${partnerName || 'your purchase'}!`;
        icon = ShoppingBag;
        
        // Show extra celebratory message for large purchases
        if (nctrAmount >= 5000) {
          setTimeout(() => {
            toast({
              title: "🌟 Awesome Purchase!",
              description: `That's a ${formatNCTR(nctrAmount)} NCTR reward - great shopping!`,
              duration: 5000,
            });
          }, 2000);
        }
        break;
        
      case 'referral':
      case 'referral_signup':
        title = '🎁 Referral Reward!';
        message = description || `You earned ${formatNCTR(nctrAmount)} NCTR from a referral!`;
        icon = Gift;
        break;
        
      case 'daily_checkin':
        title = '✅ Daily Check-in Complete!';
        message = `You earned ${formatNCTR(nctrAmount)} NCTR! Come back tomorrow for more.`;
        break;
        
      case 'profile_completion':
        title = '🎊 Profile Complete!';
        message = `You earned ${formatNCTR(nctrAmount)} NCTR bonus for completing your profile!`;
        break;
        
      default:
        message = description || `You earned ${formatNCTR(nctrAmount)} NCTR!`;
        break;
    }

    // Show main notification
    toast({
      title,
      description: message,
      duration: 6000,
    });

    // Play a subtle success sound if available
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVq/m77BdFwxBnN/vxmwkBi+E0PLRfzEGHWy+7+OaTgwMU63l8LNhGgtAmt/ux2sjBi+C0PPQgDEGHGq+7+OaSgwLUqzl8LVjGwtAmN3vx2wjBi+B0PPPgTEGHGq97+KZSgwLUazl8LRjGwtBmN3vx2sjBjB/z/PPgDEGHGi87+GZSwwLUarm8LNiGgtAmN3ux20kBi9/z/POgTEGG2i87+CZSwwLUarm8LNiGgxAl93ux20kBi9/zvPOgTEGG2e87+CZSwwKUKnm8LNiGgxAl93tyW0kBi9+zvPOgDEGG2a77+CZSwwKUKjm8LNiGgxBlt3ux2wjBi9+zvPNgDEGHGa77+CYSgwKUKfm8LNiGgxBldztx2wjBi9+zvPNgDEGHGW77+CYSgwKT6fm8LRiGgxBldztyG0kBi99zvPNgDEGHGS77+CXSgwKT6fm8LRiGgxCltzsyGwjBi99zvLNgDIGHGS77+CXSQwKT6bm8LRiGg1CldzsyGwiBjA9zvLMgDIGHGO77+CXSQwKTqbm8LRhGg1CldvsyGwiBjA9zvLMgDIGG2O77t+XSQwKTqXm8LNhGg1CldvsyGsiBjA9zvLMgDIGG2K77t+WSQwJTqXm8LNhGg1CldvsyGsiBi88zvLMgDIGG2K77t+WSQwJTqXm77NhGg1Cltvsx2siBi88zvLMgDIGG2G77N6WSQwJTqTm77NhGg1Cldvsx2oiBi88zvHMgDIGG2G76t6WSQwJTqTm77NgGg1Cldvsx2oiBi87zvHMgDIGG2C76t6WSQwJTaPm77NgGg1Cldvsx2kiBi87zvHMgDIGG1+76t6VRwwJTqPm77NgGg5Cldvrx2kiBi86zvHMgDIGG1676t6VRwwJTqPm77NgGg5Cldvrx2kiBi86zvHLgDIGG1676t6VRwwJTqLm77NgGg5Cldvrxmkh'); 
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore if audio play fails
    } catch (error) {
      // Silently fail - audio is optional
    }
  };

  const formatNCTR = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(amount));
  };
};

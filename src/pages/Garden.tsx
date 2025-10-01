import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { useTransactionNotifications } from '@/hooks/useTransactionNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Lock360InfoTooltip, Lock90InfoTooltip } from '@/components/ui/info-tooltip';
import { Coins, TrendingUp, Gift, Users, Power, ExternalLink, Copy, User, Play, Settings, Mail, MessageCircle, Share2, Check, Link, UserCheck, Wallet, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LockCommitmentModal from '@/components/LockCommitmentModal';
import ReferralSystem from '@/components/ReferralSystem';
import UserAffiliateLinks from '@/components/UserAffiliateLinks';
import { WithdrawalModal } from '@/components/WithdrawalModal';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useAdmin } from '@/hooks/useAdmin';
import { MemberStatusShowcase } from '@/components/MemberStatusShowcase';
import { DailyCheckinCountdown } from '@/components/DailyCheckinCountdown';
import { MemberStatusBanner } from '@/components/MemberStatusBanner';
import { CollapsibleDashboard } from '@/components/CollapsibleDashboard';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { RewardDisplay } from '@/components/RewardDisplay';
import BatchLockUpgrade from '@/components/BatchLockUpgrade';
import nctrLogo from "@/assets/nctr-logo-grey.png";
import nctrNLogo from "@/assets/nctr-n-yellow.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  opportunity_status: string;
  lock_90_nctr: number;
  lock_360_nctr: number;
}

interface LockCommitment {
  id: string;
  lock_type: string;
  nctr_amount: number;
  lock_date: string;
  unlock_date: string;
  status: string;
  lock_category: string;
  can_upgrade?: boolean;
}

interface EarningOpportunity {
  id: string;
  title: string;
  description: string;
  opportunity_type: string;
  nctr_reward: number;
  reward_per_dollar: number;
  partner_name: string;
  partner_logo_url: string;
  affiliate_link?: string;
  video_url?: string;
  video_title?: string;
  video_description?: string;
  cta_text?: string;
  brand_id?: string; // Link to brands table for proper tracking
  // New reward structure fields
  available_nctr_reward?: number;
  lock_90_nctr_reward?: number;
  lock_360_nctr_reward?: number;
  reward_distribution_type?: string;
  reward_structure?: any;
}

import ProfileModal from '@/components/ProfileModal';

const Garden = () => {
  const { user, signOut } = useAuth();
  const { address: connectedWallet } = useWallet();
  const { isAdmin } = useAdmin();
  const { currentPrice, priceChange24h, formatPrice, formatChange, getChangeColor, calculatePortfolioValue, contractAddress, formatUSD } = useNCTRPrice();
  const { getSetting, loading: settingsLoading } = useSiteSettings(['earning_opportunities_banner_title', 'earning_opportunities_banner_subtitle']);
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [locks, setLocks] = useState<LockCommitment[]>([]);
  const [opportunities, setOpportunities] = useState<EarningOpportunity[]>([]);
  const [completedOpportunityIds, setCompletedOpportunityIds] = useState<string[]>([]);
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [userMultiplier, setUserMultiplier] = useState(1.0);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ total: 0, successful: 0 });
  const [dailyCheckinAvailable, setDailyCheckinAvailable] = useState(true);
  const [lastCheckinTime, setLastCheckinTime] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh trigger

  // Set up real-time transaction notifications
  useTransactionNotifications({
    userId: user?.id,
    onTransactionReceived: () => {
      // Refresh user data when new transaction arrives
      fetchUserData();
    }
  });

  useEffect(() => {
    if (!user) {
      // Store the current path for redirect after auth
      sessionStorage.setItem('authRedirect', '/garden');
      navigate('/auth');
      return;
    }
    
    fetchUserData();
    generateReferralCode();
    fetchReferralStats();
  }, [user, navigate, refreshKey]); // Add refreshKey to dependencies

  // Real-time updates for earning opportunities
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('earning-opportunities-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'earning_opportunities'
        },
        (payload) => {
          console.log('Earning opportunities updated:', payload);
          // Refetch opportunities when any change occurs
          fetchOpportunities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const generateReferralCode = () => {
    if (user) {
      // Generate a simple referral code based on user ID
      const code = user.id.slice(0, 8).toUpperCase();
      setReferralCode(code);
    }
  };

  const fetchReferralStats = async () => {
    if (!user) return;
    
    try {
      // Get total referrals count
      const { count: totalReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', user.id);

      // Get successful referrals count
      const { count: successfulReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', user.id)
        .eq('status', 'completed')
        .eq('reward_credited', true);

      setReferralStats({
        total: totalReferrals || 0,
        successful: successfulReferrals || 0
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    }
  };

  const getReferralLink = () => {
    return `${window.location.origin}/auth?ref=${referralCode}`;
  };

  const copyInviteLink = async () => {
    const link = getReferralLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Your referral link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Please manually copy the link.",
        variant: "destructive",
      });
    }
  };

  const shareViaEmail = () => {
    const userReward = Math.round(1000 * userMultiplier);
    const subject = "Join The Garden and Start Earning NCTR!";
    const body = `Hey! I wanted to invite you to join The Garden, where you can earn NCTR tokens through everyday activities.

Use my referral link to get started: ${getReferralLink()}

I earn ${userReward} NCTR and you get 1000 NCTR in 360LOCK when you sign up!`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareViaText = () => {
    const message = `Join The Garden and earn NCTR tokens! Use my referral link: ${getReferralLink()}`;
    window.open(`sms:?body=${encodeURIComponent(message)}`);
  };

  const shareViaWhatsApp = () => {
    const message = `🌱 Join The Garden and start earning NCTR tokens! Use my referral link: ${getReferralLink()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const fetchOpportunities = async () => {
    try {
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('earning_opportunities')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (opportunitiesError) {
        console.error('Error fetching opportunities:', opportunitiesError);
      } else {
        // Sort opportunities to prioritize shopping (with display_order) over bonus/invite
        const sortedOpportunities = (opportunitiesData || []).sort((a, b) => {
          // First, separate by type: shopping opportunities vs bonus/invite
          const aIsShopping = a.opportunity_type === 'shopping';
          const bIsShopping = b.opportunity_type === 'shopping';
          
          if (aIsShopping && !bIsShopping) return -1; // Shopping first
          if (!aIsShopping && bIsShopping) return 1;  // Then bonus/invite
          
          // Within shopping opportunities, sort by display_order (ascending - lower numbers first)
          if (aIsShopping && bIsShopping) {
            const aOrder = a.display_order ?? 999;
            const bOrder = b.display_order ?? 999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            // Fall back to created_at if display_order is the same
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          // Within bonus/invite opportunities, sort by created_at (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setOpportunities(sortedOpportunities);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      // Fetch portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('available_nctr, pending_nctr, total_earned, opportunity_status, lock_90_nctr, lock_360_nctr')
        .eq('user_id', user?.id)
        .single();

      if (portfolioError && portfolioError.code !== 'PGRST116') {
        console.error('Portfolio error:', portfolioError);
      } else {
        setPortfolio(portfolioData);
        
        // Fetch user's reward multiplier based on their status
        if (portfolioData?.opportunity_status) {
          const { data: statusLevel, error: statusError } = await supabase
            .from('opportunity_status_levels')
            .select('reward_multiplier')
            .eq('status_name', portfolioData.opportunity_status)
            .single();

          if (!statusError && statusLevel) {
            setUserMultiplier(statusLevel.reward_multiplier || 1.0);
          }
        }
      }

      // Fetch lock commitments
      const { data: locksData, error: locksError } = await supabase
        .from('nctr_locks')
        .select('*, lock_category, commitment_days')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (locksError) {
        console.error('Locks error:', locksError);
      } else {
        setLocks(locksData || []);
      }

      // Fetch completed opportunities - but exclude certain types that have special handling
      const { data: completedData, error: completedError } = await supabase
        .from('nctr_transactions')
        .select('opportunity_id, earning_source')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .not('opportunity_id', 'is', null);

      if (completedError) {
        console.error('Completed opportunities error:', completedError);
      } else {
        // Only mark as completed based on earning source - allow social follows to show as completed
        let completedIds = (completedData || [])
          .map(item => item.opportunity_id)
          .filter(Boolean);

        // Check for profile completion separately
        try {
          const { data: profileCompletionData } = await supabase.rpc('calculate_profile_completion', {
            p_user_id: user.id
          });
          
          if (profileCompletionData && typeof profileCompletionData === 'object' && 'bonus_awarded' in profileCompletionData) {
            const completion = profileCompletionData as { bonus_awarded: boolean };
            if (completion.bonus_awarded) {
              // Find all profile completion opportunities and mark them as completed
              // We'll do this after opportunities are loaded to get accurate IDs
              console.log('Profile completion bonus was awarded - will mark profile opportunities as completed');
            }
          }
        } catch (error) {
          console.error('Error checking profile completion:', error);
        }

        setCompletedOpportunityIds(completedIds);
      }

      // Fetch earning opportunities
      await fetchOpportunities();

      // After opportunities are loaded, check for profile completion
      try {
        const { data: profileCompletionData } = await supabase.rpc('calculate_profile_completion', {
          p_user_id: user.id
        });
        
        if (profileCompletionData && typeof profileCompletionData === 'object' && 'bonus_awarded' in profileCompletionData) {
          const completion = profileCompletionData as { bonus_awarded: boolean };
          if (completion.bonus_awarded) {
            console.log('Profile completion bonus was awarded - will mark profile opportunities as completed');
          }
        }
      } catch (error) {
        console.error('Error checking profile completion after opportunities loaded:', error);
      }

      // Check daily checkin availability
      await checkDailyCheckinAvailability();
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your garden data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDailyCheckinAvailability = async () => {
    try {
      const { data: isAvailable } = await supabase.rpc('is_daily_checkin_available', {
        p_user_id: user?.id
      });
      setDailyCheckinAvailable(isAvailable);

      // Get the user's last check-in time for the countdown
      const { data: lastCheckin } = await supabase
        .from('nctr_transactions')
        .select('created_at')
        .eq('user_id', user?.id)
        .eq('earning_source', 'daily_checkin')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setLastCheckinTime(lastCheckin?.created_at || null);
    } catch (error) {
      console.error('Error checking daily checkin availability:', error);
      setDailyCheckinAvailable(false);
      setLastCheckinTime(null);
    }
  };

  const refreshOpportunities = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Refreshing Data",
      description: "Updated opportunity rewards are being loaded...",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatNCTR = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.floor(amount));
  };

  const handleOpportunityClick = async (opportunity: EarningOpportunity) => {
    console.log('Opportunity clicked:', opportunity.title, opportunity.opportunity_type);
    
    switch (opportunity.opportunity_type) {
      case 'invite':
        handleInviteOpportunity(opportunity);
        break;
      case 'bonus':
        handleBonusOpportunity(opportunity);
        break;
      case 'daily_checkin':
        handleDailyCheckinOpportunity(opportunity);
        break;
      case 'social_follow':
        handleSocialFollowOpportunity(opportunity);
        break;
      case 'shopping':
      case 'partner':
        handleShoppingOpportunity(opportunity);
        break;
      default:
        handleGenericOpportunity(opportunity);
        break;
    }
  };

  const handleDailyCheckinOpportunity = async (opportunity: EarningOpportunity) => {
    try {
      // Check if daily checkin is available
      const { data: isAvailable } = await supabase.rpc('is_daily_checkin_available', {
        p_user_id: user?.id
      });

      if (!isAvailable) {
        toast({
          title: "Already Claimed Today",
          description: "You've already claimed your daily bonus today. Come back tomorrow!",
          variant: "destructive",
        });
        return;
      }

      // Process the daily checkin
      const { data: result, error } = await supabase.rpc('process_daily_checkin', {
        p_user_id: user?.id
      });

      if (error) throw error;

      const checkinResult = result as { success: boolean; reward_amount?: number; message?: string; error?: string };

      if (checkinResult.success) {
        // Immediately update UI state
        setDailyCheckinAvailable(false);
        setLastCheckinTime(new Date().toISOString()); // Set current time as last check-in
        
        toast({
          title: "Daily Bonus Claimed! 🎉",
          description: `You earned ${checkinResult.reward_amount?.toFixed(2)} NCTR! ${checkinResult.message}`,
        });
        
        // Refresh user data to show updated balance
        fetchUserData();
      } else {
        throw new Error(checkinResult.error || 'Failed to claim daily bonus');
      }
    } catch (error: any) {
      console.error('Daily checkin error:', error);
      toast({
        title: "Checkin Failed",
        description: error.message || "Failed to claim daily bonus. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSocialFollowOpportunity = async (opportunity: EarningOpportunity) => {
    // Open the social media link
    if (opportunity.affiliate_link) {
      window.open(opportunity.affiliate_link, '_blank');
      
      // Show confirmation modal after a brief delay
      setTimeout(() => {
        const confirmCompletion = confirm(`Did you complete the task: "${opportunity.title}"?\n\nClick OK if you successfully followed/subscribed, or Cancel to try again.`);
        
        if (confirmCompletion) {
          awardSocialFollowReward(opportunity);
        }
      }, 2000);
      
      toast({
        title: `Opening ${opportunity.partner_name || 'social platform'}`,
        description: "Complete the follow/subscribe action, then confirm completion to earn your NCTR reward!",
      });
    } else {
      toast({
        title: "Link Not Available",
        description: "The social media link for this opportunity is not configured yet.",
        variant: "destructive",
      });
    }
  };

  const awardSocialFollowReward = async (opportunity: EarningOpportunity) => {
    try {
      // Check if already completed
      const { data: existingTransaction } = await supabase
        .from('nctr_transactions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('opportunity_id', opportunity.id)
        .maybeSingle();

      if (existingTransaction) {
        toast({
          title: "Already Completed!",
          description: "You've already earned rewards for this social media task.",
          variant: "destructive",
        });
        return;
      }

      // Calculate total reward from new structure
      const availableReward = opportunity.available_nctr_reward || 0;
      const lock90Reward = opportunity.lock_90_nctr_reward || 0;  
      const lock360Reward = opportunity.lock_360_nctr_reward || 0;
      const totalReward = availableReward + lock90Reward + lock360Reward;

      if (totalReward <= 0) {
        toast({
          title: "No Reward Configured",
          description: "This opportunity doesn't have a reward configured yet.",
          variant: "destructive",
        });
        return;
      }

      // Update portfolio - add to appropriate buckets
      const { error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: (portfolio?.available_nctr || 0) + availableReward,
          total_earned: (portfolio?.total_earned || 0) + totalReward,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (portfolioError) throw portfolioError;

      // Create locks for 90LOCK and 360LOCK rewards
      if (lock90Reward > 0) {
        await supabase.from('nctr_locks').insert({
          user_id: user?.id,
          nctr_amount: lock90Reward,
          lock_type: '90LOCK',
          lock_category: '90LOCK',
          commitment_days: 90,
          unlock_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: true,
          original_lock_type: '90LOCK'
        });
      }

      if (lock360Reward > 0) {
        await supabase.from('nctr_locks').insert({
          user_id: user?.id,
          nctr_amount: lock360Reward,
          lock_type: '360LOCK',
          lock_category: '360LOCK', 
          commitment_days: 360,
          unlock_date: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
          can_upgrade: false,
          original_lock_type: '360LOCK'
        });
      }

      // Record transaction
      await supabase.from('nctr_transactions').insert({
        user_id: user?.id,
        transaction_type: 'earned',
        nctr_amount: totalReward,
        opportunity_id: opportunity.id,
        description: `Completed social media task: ${opportunity.title} (${availableReward} Available + ${lock90Reward} 90LOCK + ${lock360Reward} 360LOCK)`,
        earning_source: 'social_follow',
        status: 'completed'
      });

      // Refresh data
      await fetchUserData();

      toast({
        title: "🎉 Reward Earned!",
        description: `You've earned ${formatNCTR(totalReward)} NCTR for completing "${opportunity.title}"!`,
      });

    } catch (error) {
      console.error('Error awarding social follow reward:', error);
      toast({
        title: "Error",
        description: "Failed to award reward. Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleInviteOpportunity = (opportunity: EarningOpportunity) => {
    // For invite opportunities, open a direct share link modal
    const userReward = Math.round(1000 * userMultiplier);
    setInviteModalOpen(true);
    toast({
      title: "🎉 Invite Friends",
      description: `Share your link and earn ${userReward} NCTR in 360LOCK for each friend who joins!`,
    });
  };

  const handleBonusOpportunity = async (opportunity: EarningOpportunity) => {
    if (opportunity.title.includes('Profile')) {
      // Navigate to profile page for profile completion
      navigate('/profile');
      toast({
        title: "Complete Your Profile",
        description: "Fill out your profile to earn NCTR automatically locked in 360LOCK!",
      });
    } else if (opportunity.title.includes('Daily Check-in')) {
      // Handle daily check-in with auto-lock
      await awardDailyBonus(opportunity);
    } else {
      // Generic bonus handling with auto-lock
      await awardBonus(opportunity);
    }
  };

  const handleShoppingOpportunity = async (opportunity: EarningOpportunity) => {
    if (!opportunity.affiliate_link) {
      toast({
        title: "Link Not Available",
        description: "This shopping opportunity doesn't have a configured affiliate link yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🛍️ Tracking shopping opportunity click:', opportunity.title);
      
      // Generate unique tracking ID for this user + opportunity
      const trackingId = `tgn_${user?.id?.slice(-8)}_${opportunity.id?.slice(-8)}_${Date.now().toString(36)}`;
      console.log('🆔 Generated tracking ID:', trackingId);
      
      // Start with the original URL
      // Build proper Loyalize tracking URL
      let finalUrl = opportunity.affiliate_link;
      
      // If URL has template placeholders, replace them
      if (finalUrl.includes('{{USER_ID}}')) {
        finalUrl = finalUrl.replace(/\{\{USER_ID\}\}/g, user?.id || 'anonymous');
      }
      
      if (finalUrl.includes('{{TRACKING_ID}}')) {
        finalUrl = finalUrl.replace(/\{\{TRACKING_ID\}\}/g, trackingId);
      }
      
      // Build proper Loyalize API tracking URL
      // New format uses api.loyalize.com/v1/stores/{storeId}/tracking with params
      if (finalUrl.includes('api.loyalize.com/v1/stores/')) {
        // The URL already has the tracking parameters from the database
        // We just need to ensure placeholders are replaced (done above)
        console.log('✅ Using Loyalize API tracking URL:', finalUrl);
      }
      
      console.log('🔗 FINAL tracked URL:', finalUrl);
      
      
      // Record click tracking (may fail for shopping opportunities not in independent_affiliate_links - that's OK)
      const { error: clickError } = await supabase
        .from('affiliate_link_clicks')
        .insert({
          user_id: user?.id,
          link_id: opportunity.id,
          referrer: window.location.href,
          user_agent: navigator.userAgent,
          ip_address: null
        });
      
      if (clickError) {
        console.warn('Click logging skipped (expected for shopping opportunities):', clickError.message);
      }
      
      // CRITICAL: Create tracking mapping for purchase attribution
      // Use brand_id from opportunity to properly link to brands table
      const brandIdToUse = opportunity.brand_id || opportunity.id;
      const { error: mappingError } = await supabase
        .from('affiliate_link_mappings')
        .insert({
          tracking_id: trackingId,
          user_id: user?.id,
          brand_id: brandIdToUse, // Use proper brand_id from opportunity
        });
      
      if (mappingError) {
        console.error('❌ Failed to create tracking mapping:', mappingError);
      } else {
        console.log('✅ Tracking mapping created:', trackingId);
      }
      
      // Open the URL
      console.log('🚀 Opening URL in new window...');
      window.open(finalUrl, '_blank');
      console.log('✅ Window.open called');
      
      
      // Enhanced notification with tracking confirmation
      const rewardRate = opportunity.reward_per_dollar || 50;
      toast({
        title: `🔗 ${opportunity.partner_name || 'Partner'} Link Activated!`,
        description: `Click tracked! Your purchases are now linked to your account. Earn ${rewardRate} NCTR per $1 spent.`,
        duration: 6000,
      });
      
      console.log('🎯 Tracking complete:', {
        user_id: user?.id,
        tracking_id: trackingId,
        opportunity: opportunity.title,
        partner: opportunity.partner_name
      });
      
    } catch (error) {
      console.error('❌ Error handling shopping opportunity:', error);
      
      // Fallback: try to open URL anyway but warn user
      let fallbackUrl = opportunity.affiliate_link;
      if (fallbackUrl.includes('%7B%7B') || fallbackUrl.includes('{{')) {
        const trackingId = `fallback_${Date.now()}`;
        fallbackUrl = fallbackUrl
          .replace(/%7B%7BUSER_ID%7D%7D/g, user?.id || 'anonymous')
          .replace(/\{\{USER_ID\}\}/g, user?.id || 'anonymous')
          .replace(/%7B%7BTRACKING_ID%7D%7D/g, trackingId)
          .replace(/\{\{TRACKING_ID\}\}/g, trackingId);
      }
      
      window.open(fallbackUrl, '_blank');
      toast({
        title: "⚠️ Tracking Issue", 
        description: `Link opened but tracking may be limited. Contact support if purchases don't appear.`,
        variant: "destructive",
      });
    }
  };

  const handleGenericOpportunity = (opportunity: EarningOpportunity) => {
    toast({
      title: "Opportunity Details",
      description: opportunity.description || "More details coming soon!",
    });
  };

  const awardDailyBonus = async (opportunity: EarningOpportunity) => {
    try {
      // Check if user already claimed today's bonus
      const today = new Date().toISOString().split('T')[0];
      const { data: existingTransaction } = await supabase
        .from('nctr_transactions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('opportunity_id', opportunity.id)
        .gte('created_at', today + 'T00:00:00')
        .maybeSingle();

      if (existingTransaction) {
        toast({
          title: "Already Claimed!",
          description: "You've already claimed today's daily bonus. Come back tomorrow!",
          variant: "destructive",
        });
        return;
      }

      await awardNCTR(opportunity, 'Daily check-in bonus');
    } catch (error) {
      console.error('Error awarding daily bonus:', error);
      toast({
        title: "Error",
        description: "Failed to award daily bonus. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'vip': return 'text-yellow-500';
      case 'premium': return 'text-purple-500';
      case 'platinum': return 'text-slate-400';
      case 'advanced': return 'text-blue-500';
      case 'bronze': return 'text-amber-600';
      case 'silver': return 'text-gray-500';
      case 'gold': return 'text-yellow-500';
      case 'diamond': return 'text-blue-500';
      default: return 'text-primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'premium': return 'bg-gradient-to-r from-purple-400 to-purple-600';
      case 'platinum': return 'bg-gradient-to-r from-slate-300 to-slate-400';
      case 'advanced': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default: return 'bg-gradient-to-r from-green-400 to-green-600';
    }
  };

  const awardBonus = async (opportunity: EarningOpportunity) => {
    try {
      // Check if user already completed this bonus opportunity
      const { data: existingTransaction } = await supabase
        .from('nctr_transactions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('opportunity_id', opportunity.id)
        .maybeSingle();

      if (existingTransaction) {
        toast({
          title: "Already Completed!",
          description: "You've already completed this bonus opportunity.",
          variant: "destructive",
        });
        return;
      }

      await awardNCTR(opportunity, 'Bonus opportunity completed');
    } catch (error) {
      console.error('Error awarding bonus:', error);
      toast({
        title: "Error",
        description: "Failed to award bonus. Please try again.",
        variant: "destructive",
      });
    }
  };

  const awardNCTR = async (opportunity: EarningOpportunity, description: string) => {
    try {
      const rewardAmount = opportunity.nctr_reward || 0;
      
      if (rewardAmount <= 0) {
        toast({
          title: "No Reward",
          description: "This opportunity doesn't have an immediate NCTR reward.",
        });
        return;
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('nctr_transactions')
        .insert({
          user_id: user?.id,
          transaction_type: 'earned',
          nctr_amount: rewardAmount,
          opportunity_id: opportunity.id,
          description: description,
          partner_name: opportunity.partner_name,
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Update user portfolio
      const { error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: (portfolio?.available_nctr || 0) + rewardAmount,
          total_earned: (portfolio?.total_earned || 0) + rewardAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (portfolioError) throw portfolioError;

      // Refresh user data
      await fetchUserData();

      toast({
        title: "🎉 NCTR Earned!",
        description: `You've earned ${formatNCTR(rewardAmount)} NCTR from ${opportunity.title}!`,
      });

    } catch (error) {
      console.error('Error awarding NCTR:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your garden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      {/* Header with Wings Status */}
      <header className="section-highlight backdrop-blur-sm border-b border-section-border">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <h1 className="text-xl sm:text-2xl font-bold nctr-text">
                  The Garden
                </h1>
                <img 
                  src={nctrLogo} 
                  alt="NCTR" 
                  className="h-16 sm:h-28 w-auto opacity-90"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1 sm:gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-1 sm:gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                  >
                    <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshOpportunities}
                  className="flex items-center gap-1 sm:gap-2 border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                  title="Refresh opportunity rewards"
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSignOut}
                  className="border-primary/50 section-text hover:bg-primary/10 hover:text-primary whitespace-nowrap min-h-[40px] text-xs sm:text-sm"
                >
                  <Power className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
            
            {/* Compact Status Display in Header */}
            <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total NCTR</p>
                  <p className="text-sm font-semibold text-section-accent">
                    {formatNCTR((portfolio?.available_nctr || 0) + (portfolio?.lock_90_nctr || 0) + (portfolio?.lock_360_nctr || 0))}
                  </p>
                </div>
              </div>
              {/* Live NCTR Price Feed */}
              <div className="border-l border-primary/20 pl-3">
                <p className="text-xs text-muted-foreground">Live Price</p>
                <p className="text-sm font-semibold text-section-accent">
                  ${formatPrice(currentPrice)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
        {/* Wings Status - Prominent Section */}
        <div className="mb-8">
          <MemberStatusBanner 
            currentStatus={portfolio?.opportunity_status || 'starter'}
            current360NCTR={parseFloat(portfolio?.lock_360_nctr?.toString() || '0')}
            availableNCTR={portfolio?.available_nctr || 0}
            onUpgradeClick={() => {
              // Scroll to lock commitment modal or trigger it
              const lockButton = document.querySelector('[data-lock-commitment]');
              if (lockButton) {
                (lockButton as HTMLElement).click();
              }
            }}
            onEarnMoreClick={() => {
              // Scroll to earning opportunities
              const opportunitiesSection = document.querySelector('[data-earning-opportunities]');
              if (opportunitiesSection) {
                opportunitiesSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        </div>

        {/* Profile Completion Banner */}
        <div className="mb-6">
          <ProfileCompletionBanner />
        </div>

        {/* Portfolio Section - Collapsible */}
        <div className="mb-8">
          <Card 
            className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 shadow-premium cursor-pointer hover:shadow-premium-hover transition-all duration-300"
            onClick={() => setPortfolioExpanded(!portfolioExpanded)}
          >
            <CardHeader>
              <CardTitle className="text-xl section-heading flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-primary" />
                  Your NCTR Portfolio
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatNCTR((portfolio?.available_nctr || 0) + (portfolio?.lock_90_nctr || 0) + (portfolio?.lock_360_nctr || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Total NCTR</p>
                  </div>
                  <div className={`transform transition-transform duration-300 ${portfolioExpanded ? 'rotate-180' : ''}`}>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            
            {portfolioExpanded && (
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Card className="bg-white shadow-sm">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Coins className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-muted-foreground">Available</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600 mb-1">
                        {formatNCTR(portfolio?.available_nctr || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(calculatePortfolioValue(portfolio?.available_nctr || 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">Ready to commit</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gift className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-600">90LOCK</span>
                        <Lock90InfoTooltip size={14} />
                      </div>
                      <p className="text-xl font-bold text-orange-600 mb-1">
                        {formatNCTR(portfolio?.lock_90_nctr || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatUSD(portfolio?.lock_90_nctr || 0)}</p>
                      <p className="text-xs text-orange-600/80">Short commitment</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gift className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-primary">360LOCK</span>
                        <Lock360InfoTooltip size={14} />
                      </div>
                      <p className="text-xl font-bold text-primary mb-1">
                        {formatNCTR(portfolio?.lock_360_nctr || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatUSD(portfolio?.lock_360_nctr || 0)}</p>
                      <p className="text-xs text-primary/80">Alliance Benefits</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Total Earned</span>
                      </div>
                      <p className="text-xl font-bold text-green-600 mb-1">
                        {formatNCTR(portfolio?.total_earned || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatUSD(portfolio?.total_earned || 0)}</p>
                      <p className="text-xs text-green-600/80">Lifetime NCTR</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate('/referrals')}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <UserCheck className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-600">My Invites</span>
                      </div>
                      <p className="text-xl font-bold text-purple-600 mb-1">
                        {referralStats.successful}
                      </p>
                      <p className="text-xs text-purple-600/80">
                        {referralStats.total > referralStats.successful && (
                          <span className="text-xs text-muted-foreground">
                            ({referralStats.total - referralStats.successful} pending)
                          </span>
                        )}
                        {referralStats.total === 0 ? "Click to invite" : "Click for details"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Easy Button for 360LOCK Commitment */}
                <div className="mb-6">
                  <BatchLockUpgrade 
                    locks={locks}
                    onUpgradeComplete={fetchUserData}
                    availableNCTR={portfolio?.available_nctr || 0}
                  />
                </div>

                <div className="flex justify-center gap-4 flex-wrap">
                  <Button 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/profile');
                    }}
                    className="border-primary/50 text-primary hover:bg-primary/10"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Portfolio Details & Sync
                  </Button>
                  
                  {(portfolio?.available_nctr && portfolio.available_nctr > 0) && (
                    <Button 
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWithdrawalModalOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Withdraw NCTR
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Main Earning Opportunities - Front and Center */}
        <div data-earning-opportunities>
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold section-heading mb-3 sm:mb-4">
              {getSetting('earning_opportunities_banner_title') || 'Turn Your Everyday Activities Into NCTR Rewards'}
            </h2>
            <p className="text-base sm:text-lg section-text max-w-3xl mx-auto">
              {getSetting('earning_opportunities_banner_subtitle') || 'Simple activities, real rewards – start earning today'}
            </p>
          </div>

          {/* Daily Check-in Section - Premium Design */}
          <div className="mb-8">
            {opportunities.filter(op => op.opportunity_type === 'daily_checkin').map(opportunity => {
              // Show different UI based on availability
              if (!dailyCheckinAvailable) {
                // Minimized completed state
                return (
                  <Card key={opportunity.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Gift className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-700">{opportunity.title}</h3>
                            <p className="text-xs text-gray-500">Already claimed today</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                            ✓ Completed
                          </span>
                          <DailyCheckinCountdown 
                            className="text-gray-500"
                            onComplete={() => checkDailyCheckinAvailability()}
                            lastCheckinTime={lastCheckinTime}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              
              // Full active state
              return (
                <Card key={opportunity.id} className="bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-200 shadow-premium hover:shadow-premium-hover transition-all duration-500 cursor-pointer group" onClick={() => handleOpportunityClick(opportunity)}>
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Gift className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-700 mb-1">{opportunity.title}</h3>
                        <p className="text-sm text-green-600">{opportunity.description}</p>
                      </div>
                    </div>

                    <div className="text-center py-4 mb-4">
                      {/* Total Available Bonus */}
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-3xl font-bold text-green-600">
                          {(() => {
                            const total = (opportunity.available_nctr_reward || 0) + 
                                        (opportunity.lock_90_nctr_reward || 0) + 
                                        (opportunity.lock_360_nctr_reward || 0);
                            return formatNCTR(total || 50);
                          })()} NCTR
                        </span>
                      </div>
                      <p className="text-sm text-green-600 mb-4">Total Available Bonus</p>
                      
                      {/* Reward Breakdown */}
                      <div className="bg-white/50 rounded-lg p-3 mb-4">
                        <p className="text-xs font-semibold text-green-700 mb-2">Daily Reward Breakdown:</p>
                        <div className="flex flex-wrap justify-center gap-2 text-xs">
                          {(opportunity.available_nctr_reward || 0) > 0 && (
                            <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full">
                              {formatNCTR(opportunity.available_nctr_reward || 0)} Active
                            </span>
                          )}
                          {(opportunity.lock_90_nctr_reward || 0) > 0 && (
                            <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                              {formatNCTR(opportunity.lock_90_nctr_reward || 0)} 90LOCK
                            </span>
                          )}
                          {(opportunity.lock_360_nctr_reward || 0) > 0 && (
                            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                              {formatNCTR(opportunity.lock_360_nctr_reward || 0)} 360LOCK
                              <Lock360InfoTooltip size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <RewardDisplay opportunity={opportunity} size="md" />
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-6 group-hover:scale-105 transition-transform"
                      size="lg"
                    >
                      {opportunity.cta_text || '✅ Claim Daily Bonus'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Invite Section - Premium Design */}
          <div className="mb-8">
            {opportunities.filter(op => op.opportunity_type === 'invite' && !completedOpportunityIds.includes(op.id)).map(opportunity => (
              <Card key={opportunity.id} className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 shadow-premium hover:shadow-premium-hover transition-all duration-500 cursor-pointer group" onClick={() => handleOpportunityClick(opportunity)}>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-1">{opportunity.title}</h3>
                      <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                    </div>
                  </div>

                  <div className="text-center py-4 mb-4">
                    {/* Total NCTR Earn Opportunity */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-3xl font-bold text-primary">
                        {(() => {
                          if (opportunity.opportunity_type === 'invite') {
                            // For invite opportunities, show user's multiplied reward
                            const baseReward = 1000;
                            return formatNCTR(baseReward * userMultiplier);
                          } else {
                            // For other opportunities, show the configured reward
                            const newRewardTotal = (opportunity.available_nctr_reward || 0) + (opportunity.lock_90_nctr_reward || 0) + (opportunity.lock_360_nctr_reward || 0);
                            const totalReward = newRewardTotal > 0 ? newRewardTotal : (opportunity.nctr_reward || 0);
                            return formatNCTR(totalReward);
                          }
                        })()} NCTR
                      </span>
                    </div>
                    {/* Only show "Per $1 Spent" for shopping opportunities */}
                    {opportunity.opportunity_type === 'shopping' && (
                      <p className="text-sm text-muted-foreground mb-4">Per $1 Spent</p>
                    )}
                    {opportunity.opportunity_type === 'invite' && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {userMultiplier > 1 ? (
                          <span>
                            Wings <span className={`font-semibold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{portfolio?.opportunity_status}</span> bonus: <span className={`font-bold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{userMultiplier}x</span> multiplier
                          </span>
                        ) : 'Per friend who joins'}
                      </p>
                    )}
                    
                    {/* Bounty Breakdown */}
                    <RewardDisplay opportunity={opportunity} size="md" showPerDollar={false} userMultiplier={userMultiplier} userStatus={portfolio?.opportunity_status || 'starter'} />
                  </div>

                  <Button 
                    className="w-full bg-primary hover:bg-primary-glow text-primary-foreground text-base py-6 group-hover:scale-[1.02] transition-all duration-300"
                    size="lg"
                  >
                    {opportunity.title} →
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center py-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-lg font-bold text-green-600">{formatNCTR(opportunity.nctr_reward)}</span>
                        <span className="text-xs text-green-600 font-semibold">NCTR</span>
                      </div>
                      <div className="text-xs text-muted-foreground">for you</div>
                    </div>

                    <div className="text-center py-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-lg font-bold text-green-600">{formatNCTR(opportunity.nctr_reward)}</span>
                        <span className="text-xs text-green-600 font-semibold">NCTR</span>
                      </div>
                      <div className="text-xs text-muted-foreground">for friend</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button onClick={(e) => { e.stopPropagation(); shareViaEmail(); }} variant="outline" size="sm" className="text-xs">
                        <Mail className="w-3 h-3 mr-1" />
                        Email
                      </Button>
                      <Button onClick={(e) => { e.stopPropagation(); shareViaText(); }} variant="outline" size="sm" className="text-xs">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Text
                      </Button>
                      <Button onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(); }} variant="outline" size="sm" className="text-xs">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Code</div>
                      <div className="text-sm font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                        {referralCode}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Shopping Opportunities */}
          {opportunities.filter(op => op.opportunity_type === 'shopping' && !completedOpportunityIds.includes(op.id)).length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold section-heading mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                🟢 Live Opportunities
              </h3>
              {opportunities.filter(op => op.opportunity_type === 'shopping' && !completedOpportunityIds.includes(op.id)).map((opportunity) => (
                <Card 
                  key={opportunity.id} 
                  className="mb-4 cursor-pointer hover:shadow-medium transition-all duration-300 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent"
                  onClick={() => handleOpportunityClick(opportunity)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      <div className="relative flex items-center justify-center lg:w-48 h-32 lg:h-auto bg-gradient-to-br from-white to-gray-50 rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none border-r border-gray-100">
                        {opportunity.partner_logo_url ? (
                          <BrandLogo 
                            src={opportunity.partner_logo_url} 
                            alt={opportunity.partner_name}
                            size="xl"
                            variant="auto"
                            className="p-4"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Gift className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="p-4 sm:p-6 lg:p-8 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg sm:text-xl font-semibold section-heading truncate">
                                {opportunity.title}
                              </h3>
                              <Badge className="bg-green-600 text-white font-bold ml-2">
                                LIVE
                              </Badge>
                            </div>
                            <p className="text-sm sm:text-base section-text line-clamp-2">
                              {opportunity.description}
                            </p>
                          </div>
                        </div>

                         <div className="text-center mb-4 sm:mb-6">
                           {/* Total NCTR Earn Opportunity */}
                            <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                              {(() => {
                                if (opportunity.opportunity_type === 'invite') {
                                  // For invite opportunities, show user's multiplied reward
                                  const baseReward = 1000;
                                  return formatNCTR(baseReward * userMultiplier);
                                } else {
                                  // For other opportunities, show the configured reward
                                  const newRewardTotal = (opportunity.available_nctr_reward || 0) + (opportunity.lock_90_nctr_reward || 0) + (opportunity.lock_360_nctr_reward || 0);
                                  const totalReward = newRewardTotal > 0 ? newRewardTotal : (opportunity.reward_per_dollar || 0);
                                  return formatNCTR(totalReward);
                                }
                              })()} NCTR
                            </div>
                            {/* Only show "Per $1 Spent" for shopping opportunities */}
                            {opportunity.opportunity_type === 'shopping' && (
                              <div className="text-xs sm:text-sm text-muted-foreground mb-4">Per $1 Spent</div>
                            )}
                            {opportunity.opportunity_type === 'invite' && (
                              <div className="text-xs sm:text-sm text-muted-foreground mb-4">
                                {userMultiplier > 1 ? (
                                  <span>
                                    Wings <span className={`font-semibold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{portfolio?.opportunity_status}</span> bonus
                                  </span>
                                ) : 'Per friend who joins'}
                              </div>
                            )}
                           
                           {/* Bounty Breakdown */}
                           <RewardDisplay opportunity={opportunity} size="md" showPerDollar={false} userMultiplier={userMultiplier} userStatus={portfolio?.opportunity_status || 'starter'} />
                         </div>

                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-6"
                          size="lg"
                        >
                          🛍️ Shop & Earn →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Social Media & Other Opportunities */}
          {opportunities.filter(op => ['social_follow', 'bonus'].includes(op.opportunity_type)).length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold section-heading mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                🔗 Social & Bonus Opportunities
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {opportunities.filter(op => ['social_follow', 'bonus'].includes(op.opportunity_type)).map((opportunity) => {
                  const isCompleted = completedOpportunityIds.includes(opportunity.id);
                  
                  // Show minimized completed state
                  if (isCompleted) {
                    return (
                      <Card key={opportunity.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-700">{opportunity.title}</h4>
                                <p className="text-xs text-gray-500">Completed & rewarded</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                                +{formatNCTR(
                                  (opportunity.available_nctr_reward || 0) + 
                                  (opportunity.lock_90_nctr_reward || 0) + 
                                  (opportunity.lock_360_nctr_reward || 0) ||
                                  opportunity.nctr_reward || 0
                                )} NCTR
                              </span>
                              <span className="text-xs text-gray-500">✓ Done</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // Show full active state
                  return (
                    <Card 
                      key={opportunity.id}
                      className="cursor-pointer hover:shadow-medium transition-all duration-300 group border bg-gradient-to-br from-white to-section-highlight border-section-border hover:border-primary/30"
                      onClick={() => handleOpportunityClick(opportunity)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full transition-colors bg-primary/10 group-hover:bg-primary/20">
                              {opportunity.opportunity_type === 'social_follow' ? (
                                <ExternalLink className="w-6 h-6 text-primary" />
                              ) : (
                                <Gift className="w-6 h-6 text-primary" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm mb-1 section-heading">
                                {opportunity.title}
                              </h4>
                              <p className="text-xs line-clamp-2 section-text">
                                {opportunity.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-center mb-4">
                          {/* Total NCTR Earn Opportunity */}
                          <div className="text-lg font-bold text-primary mb-2">
                            {(() => {
                              if (opportunity.opportunity_type === 'invite') {
                                // For invite opportunities, show user's multiplied reward
                                const baseReward = 1000;
                                return formatNCTR(baseReward * userMultiplier);
                              } else {
                                // For other opportunities, show the configured reward
                                const newRewardTotal = (opportunity.available_nctr_reward || 0) + (opportunity.lock_90_nctr_reward || 0) + (opportunity.lock_360_nctr_reward || 0);
                                const totalReward = newRewardTotal > 0 ? newRewardTotal : (opportunity.nctr_reward || 0);
                                return formatNCTR(totalReward);
                              }
                            })()} NCTR
                          </div>
                          {/* Only show "Per $1 Spent" for shopping opportunities */}
                          {opportunity.opportunity_type === 'shopping' && (
                            <div className="text-xs text-muted-foreground mb-3">Per $1 Spent</div>
                          )}
                          {opportunity.opportunity_type === 'invite' && (
                            <div className="text-xs text-muted-foreground mb-3">
                              {userMultiplier > 1 ? (
                                <span>
                                  Wings <span className={`font-semibold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{portfolio?.opportunity_status}</span> bonus
                                </span>
                              ) : 'Per friend who joins'}
                            </div>
                          )}
                          
                          {/* Bounty Breakdown */}
                          <RewardDisplay opportunity={opportunity} size="sm" showPerDollar={false} userMultiplier={userMultiplier} userStatus={portfolio?.opportunity_status || 'starter'} />
                        </div>

                        <Button 
                          className="w-full py-3 text-sm transition-all duration-300 bg-primary hover:bg-primary-glow text-primary-foreground"
                        >
                          {opportunity.opportunity_type === 'social_follow' 
                            ? 'Follow & Earn →' 
                            : 'Complete Task →'
                          }
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Affiliate Links Section - Admin Only */}
          {isAdmin && (
            <Card className="bg-gradient-to-br from-section-highlight to-white border border-section-border shadow-medium">
              <CardHeader>
                <CardTitle className="text-xl section-heading flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  Affiliate Links Management (Admin)
                </CardTitle>
                <p className="text-muted-foreground">
                  Create and manage tracked affiliate links for all users
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ExternalLink className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Admin: Create Affiliate Links</h3>
                        <p className="text-sm text-muted-foreground">
                          Add curated affiliate links that all users can access with tracking
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate('/admin')}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Admin Panel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </main>

      {/* Invite Friends Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base sm:text-lg">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              🎉 Invite Friends & Earn {Math.round(1000 * userMultiplier)} NCTR in 360LOCK
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 sm:p-4 border border-primary/20">
              <h4 className="font-semibold text-primary mb-2 text-sm sm:text-base">How it works:</h4>
              <ul className="text-xs sm:text-sm space-y-1 text-muted-foreground">
                <li>• Share your unique link below</li>
                <li>• Friends join using your link</li>
                <li>• You earn {Math.round(1000 * userMultiplier)} NCTR {userMultiplier > 1 && (
                  <span>
                    (<span className={`font-bold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{userMultiplier}x</span> Wings bonus)
                  </span>
                )} & they get 1000 NCTR in 360LOCK!</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invite-link" className="text-sm">Your Personal Invite Link:</Label>
              <div className="flex space-x-2">
                <Input
                  id="invite-link"
                  value={getReferralLink()}
                  readOnly
                  className="flex-1 text-xs sm:text-sm min-h-[44px]"
                />
                <Button 
                  onClick={copyInviteLink}
                  variant="outline"
                  className="flex-shrink-0 min-h-[44px] px-3"
                  size="sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={shareViaEmail} variant="outline" size="sm" className="text-xs min-h-[44px] flex-col gap-1 p-2">
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </Button>
              <Button onClick={shareViaText} variant="outline" size="sm" className="text-xs min-h-[44px] flex-col gap-1 p-2">
                <MessageCircle className="w-4 h-4" />
                <span>Text</span>
              </Button>
              <Button onClick={shareViaWhatsApp} variant="outline" size="sm" className="text-xs min-h-[44px] flex-col gap-1 p-2">
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>
            </div>

            <Button 
              onClick={() => setInviteModalOpen(false)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px] text-sm sm:text-base"
            >
              Start Sharing!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Modal */}
      <WithdrawalModal 
        isOpen={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
        availableNCTR={portfolio?.available_nctr || 0}
        walletAddress={connectedWallet}
      />
    </div>
  );
};

export default Garden;
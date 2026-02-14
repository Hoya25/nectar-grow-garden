import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { useTransactionNotifications } from '@/hooks/useTransactionNotifications';
import { useInviteReward } from '@/hooks/useInviteReward';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Lock360InfoTooltip, Lock90InfoTooltip } from '@/components/ui/info-tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, TrendingUp, Gift, Users, Power, ExternalLink, Copy, User, Play, Settings, Mail, MessageCircle, Share2, Check, Link, UserCheck, Wallet, RefreshCw, BookOpen, ShoppingBag, LayoutDashboard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AllianceTokenWalletPrompt } from '@/components/AllianceTokenWalletPrompt';
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
import { GardenHeroSection } from '@/components/GardenHeroSection';
import { MallView } from '@/components/garden/MallView';
import { CrescendoStatusCard } from '@/components/CrescendoStatusCard';

import { PortfolioStory } from '@/components/PortfolioStory';

import nctrLogo from "@/assets/nctr-logo-grey-transparent.png";
import nctrNLogo from "@/assets/nctr-n-yellow.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FeaturedBrand {
  id: string;
  name: string;
  logo_url: string | null;
  commission_rate: number;
  loyalize_id: string;
}


interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  opportunity_status: string;
  lock_90_nctr: number;
  lock_360_nctr: number;
  alliance_tokens?: any; // JSONB field storing token balances as {"SOL": 100, "BASE": 250}
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
  social_platform?: string; // e.g., "Instagram", "Twitter", "YouTube"
  social_handle?: string; // e.g., "@thegarden"
  // New reward structure fields
  available_nctr_reward?: number;
  lock_90_nctr_reward?: number;
  lock_360_nctr_reward?: number;
  reward_distribution_type?: string;
  reward_structure?: any;
  // Alliance Token fields
  alliance_token_enabled?: boolean;
  alliance_token_name?: string;
  alliance_token_symbol?: string;
  alliance_token_logo_url?: string;
  alliance_token_ratio?: number;
  alliance_token_lock_days?: number;
  // Joined brand data
  brands?: {
    id: string;
    name: string;
    loyalize_id: string;
    is_active: boolean;
  };
}

import ProfileModal from '@/components/ProfileModal';

const Garden = () => {
  const { user, signOut } = useAuth();
  const { address: connectedWallet } = useWallet();
  const { isAdmin } = useAdmin();
  const { currentPrice, priceChange24h, formatPrice, formatChange, getChangeColor, calculatePortfolioValue, contractAddress, formatUSD } = useNCTRPrice();
  const { getSetting, loading: settingsLoading } = useSiteSettings(['earning_opportunities_banner_title', 'earning_opportunities_banner_subtitle']);
  const { inviteReward } = useInviteReward();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasWallet, setHasWallet] = useState(false);
  const [featuredBrands, setFeaturedBrands] = useState<FeaturedBrand[]>([]);
  const [thisMonthEarned, setThisMonthEarned] = useState(0);
  const [brandsShoppedCount, setBrandsShoppedCount] = useState(0);
  const [totalBrandsCount, setTotalBrandsCount] = useState(6823);
  const [activeTab, setActiveTab] = useState<'shop' | 'dashboard'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as 'shop' | 'dashboard') || 'shop';
  });

  // Sync activeTab with URL search params
  useEffect(() => {
    const tab = searchParams.get('tab') as 'shop' | 'dashboard';
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      // Set loading to false so landing page can show for unauthenticated users
      setLoading(false);
      return;
    }
    
    fetchUserData();
    generateReferralCode();
    fetchReferralStats();
  }, [user, navigate, refreshKey, searchParams]); // fetchUserData is stable (memoized)

  // Handle Stripe purchase success/cancel redirects
  useEffect(() => {
    // Don't process purchase status if user isn't loaded yet
    if (!user) return;

    const purchaseStatus = searchParams.get('purchase');
    const nctrAmount = searchParams.get('nctr');

    if (purchaseStatus === 'success' && nctrAmount) {
      // Show success message
      toast({
        title: "🎉 Purchase Successful!",
        description: `Your ${parseFloat(nctrAmount).toLocaleString()} NCTR has been locked in 360LOCK and will appear in your portfolio within a few moments.`,
        duration: 8000,
      });

      // Trigger immediate refresh
      setRefreshKey(prev => prev + 1);

      // Clean up URL after a short delay to let the refresh complete
      setTimeout(() => {
        navigate('/garden', { replace: true });
      }, 1000);
    } else if (purchaseStatus === 'cancelled') {
      toast({
        title: "Purchase Cancelled",
        description: "Your purchase was cancelled. No charges were made.",
        variant: "destructive",
      });

      // Clean up URL
      navigate('/garden', { replace: true });
    }
  }, [searchParams, navigate, user, toast]);

  // Real-time updates for earning opportunities
  useEffect(() => {
    if (!user) return;

    console.log('📡 Setting up real-time subscription for opportunities...');

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
          console.log('🔔 Earning opportunities changed!', payload);
          console.log('🔄 Refetching opportunities due to change...');
          // Refetch opportunities when any change occurs
          fetchOpportunities();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('📡 Cleaning up real-time subscription...');
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
        .eq('referrer_id', user.id);

      // Get successful referrals count
      const { count: successfulReferrals } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('is_paid', true);

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
    const userReward = Math.round(inviteReward * userMultiplier);
    const subject = "Join The Garden and Start Earning NCTR!";
    const body = `Hey! I wanted to invite you to join The Garden, where you can earn NCTR tokens through everyday activities.

Use my referral link to get started: ${getReferralLink()}

I earn ${userReward} NCTR and you get ${inviteReward} NCTR in 360LOCK when you sign up!`;
    
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

  const fetchOpportunities = useCallback(async () => {
    try {
      console.log('🔄 Fetching opportunities...');
      
      // Get all active opportunities with optional brand info (left join to include invite opportunities)
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('earning_opportunities')
        .select(`
          *,
          brands (
            id,
            name,
            loyalize_id,
            is_active
          )
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      // Also fetch Learn and Earn modules
      const { data: learningModulesData, error: learningError } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      console.log('📊 Raw opportunities data:', opportunitiesData);
      console.log('📚 Learning modules data:', learningModulesData);

      if (opportunitiesError) {
        console.error('Error fetching opportunities:', opportunitiesError);
      } else {
        console.log(`📋 Total opportunities fetched: ${opportunitiesData?.length || 0}`);
        console.log(`📚 Total learning modules fetched: ${learningModulesData?.length || 0}`);
        
        // Convert learning modules to opportunity format
        const learningOpportunities = (learningModulesData || []).map(module => ({
          id: module.id,
          title: module.title,
          description: module.description,
          opportunity_type: 'learn_and_earn',
          nctr_reward: module.nctr_reward,
          reward_per_dollar: 0,
          partner_name: 'The Garden',
          partner_logo_url: '/nctr-logo.png',
          video_url: module.video_url,
          lock_90_nctr_reward: module.lock_type === '90LOCK' ? module.nctr_reward : 0,
          lock_360_nctr_reward: module.lock_type === '360LOCK' ? module.nctr_reward : 0,
          reward_distribution_type: module.lock_type === '90LOCK' ? 'lock_90' : 'lock_360',
          display_order: module.display_order,
          created_at: module.created_at,
          brands: null, // Learn opportunities don't have brands
        }));
        
        // Combine opportunities with learning modules
        const allOpportunities = [...(opportunitiesData || []), ...learningOpportunities];
        
        // Filter out opportunities with invalid loyalize_ids (shopping type only)
        const validOpportunities = allOpportunities.filter(opp => {
          // For non-shopping opportunities (invite, social, bonus, learn, etc.), allow them through
          if (opp.opportunity_type !== 'shopping') return true;
          
          // For shopping opportunities, require valid brand with active status and real loyalize_id
          if (!opp.brands || !opp.brands.is_active || !opp.brands.loyalize_id) return false;
          
          // Filter out placeholder IDs (containing dashes but not numeric)
          const loyalizeId = String(opp.brands.loyalize_id);
          if (loyalizeId.includes('-') && isNaN(Number(loyalizeId))) {
            console.warn(`Skipping opportunity "${opp.title}" - invalid loyalize_id: ${loyalizeId}`);
            return false;
          }
          
          return true;
        });
        
        console.log(`✅ Valid opportunities after filtering: ${validOpportunities.length}`);
        console.log('📋 Opportunity types:', validOpportunities.map(o => `${o.title} (${o.opportunity_type})`));
        
        // Sort opportunities: Welcome → Invite → Shopping → Free Trial → Other Learn modules
        const sortedOpportunities = validOpportunities.sort((a, b) => {
          // PRIORITY 1: "Welcome to The Garden" always first
          const aIsWelcome = a.opportunity_type === 'learn_and_earn' && a.title === 'Welcome to The Garden';
          const bIsWelcome = b.opportunity_type === 'learn_and_earn' && b.title === 'Welcome to The Garden';
          
          if (aIsWelcome) return -1;
          if (bIsWelcome) return 1;
          
          // PRIORITY 2: Invite opportunities
          const aIsInvite = a.opportunity_type === 'invite';
          const bIsInvite = b.opportunity_type === 'invite';
          
          if (aIsInvite && !bIsInvite) return -1;
          if (!aIsInvite && bIsInvite) return 1;
          
          // PRIORITY 3: Shopping opportunities
          const aIsShopping = a.opportunity_type === 'shopping';
          const bIsShopping = b.opportunity_type === 'shopping';
          
          if (aIsShopping && !bIsShopping) return -1;
          if (!aIsShopping && bIsShopping) return 1;
          
          // Within shopping, sort by display_order
          if (aIsShopping && bIsShopping) {
            const aOrder = a.display_order ?? 999;
            const bOrder = b.display_order ?? 999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          // PRIORITY 4: Free trial opportunities (after shopping)
          const aIsFreeTrial = a.opportunity_type === 'free_trial';
          const bIsFreeTrial = b.opportunity_type === 'free_trial';
          
          if (aIsFreeTrial && !bIsFreeTrial) return -1;
          if (!aIsFreeTrial && bIsFreeTrial) return 1;
          
          // PRIORITY 5: Other Learn modules (after free trial)
          const aIsOtherLearn = a.opportunity_type === 'learn_and_earn' && !aIsWelcome;
          const bIsOtherLearn = b.opportunity_type === 'learn_and_earn' && !bIsWelcome;
          
          // Within other Learn modules, sort by display_order
          if (aIsOtherLearn && bIsOtherLearn) {
            const aOrder = a.display_order ?? 999;
            const bOrder = b.display_order ?? 999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          // Default: newest first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        console.log('📊 Sorted opportunity order:', sortedOpportunities.map(o => `${o.title} (${o.opportunity_type})`));
        
        console.log(`📊 Final sorted opportunities count: ${sortedOpportunities.length}`);
        
        setOpportunities(sortedOpportunities);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  }, []);

  const checkDailyCheckinAvailability = useCallback(async () => {
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
  }, [user?.id]);

  const fetchUserData = useCallback(async () => {
    try {
      // Fetch portfolio from nctr_portfolio (for total_earned, opportunity_status, alliance_tokens)
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('nctr_portfolio')
        .select('available_nctr, pending_nctr, total_earned, opportunity_status, lock_90_nctr, lock_360_nctr, alliance_tokens')
        .eq('user_id', user?.id)
        .single();

      // Also fetch from unified_profiles for available_nctr and pending_nctr
      const { data: unifiedProfile } = await supabase
        .from('unified_profiles')
        .select('available_nctr, pending_nctr')
        .eq('auth_user_id', user?.id)
        .single();

      if (portfolioError && portfolioError.code !== 'PGRST116') {
        console.error('Portfolio error:', portfolioError);
      } else {
        // Merge data: prefer unified_profiles for available/pending, use nctr_portfolio for the rest
        const mergedPortfolio = {
          ...portfolioData,
          available_nctr: unifiedProfile?.available_nctr ?? portfolioData?.available_nctr ?? 0,
          pending_nctr: unifiedProfile?.pending_nctr ?? portfolioData?.pending_nctr ?? 0,
        };
        
        console.log('📊 Portfolio Data:', mergedPortfolio);
        console.log('💎 Alliance Tokens:', portfolioData?.alliance_tokens);
        setPortfolio(mergedPortfolio);
        
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

      // Fetch profile to check wallet address
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        setHasWallet(!!profileData.wallet_address);
      }

      // Fetch lock commitments from nctr_locks table
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
        
        // Calculate 90LOCK and 360LOCK totals from nctr_locks table
        const locked90 = (locksData || [])
          .filter((l: any) => l.lock_type === '90LOCK')
          .reduce((sum: number, l: any) => sum + Number(l.nctr_amount || 0), 0);
        const locked360 = (locksData || [])
          .filter((l: any) => l.lock_type === '360LOCK')
          .reduce((sum: number, l: any) => sum + Number(l.nctr_amount || 0), 0);
        
        // Update portfolio with calculated lock amounts from nctr_locks
        setPortfolio(prev => prev ? {
          ...prev,
          lock_90_nctr: locked90,
          lock_360_nctr: locked360
        } : null);
      }

      // Fetch completed opportunities - include both 'completed' and 'pending_verification' (for free trials)
      const { data: completedData, error: completedError } = await supabase
        .from('nctr_transactions')
        .select('opportunity_id, earning_source')
        .eq('user_id', user?.id)
        .in('status', ['completed', 'pending_verification'])
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
      
      // Fetch hero section data
      await fetchHeroData();
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
  }, [user?.id, fetchOpportunities, checkDailyCheckinAvailability, toast]);
  
  // Fetch data for the hero section
  const fetchHeroData = useCallback(async () => {
    try {
      // Fetch featured brands (top earning, real loyalize IDs only)
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, logo_url, commission_rate, loyalize_id')
        .eq('is_active', true)
        .not('loyalize_id', 'like', 'gc-%')
        .not('loyalize_id', 'like', 'fallback%')
        .not('loyalize_id', 'like', '%manual%')
        .order('commission_rate', { ascending: false })
        .limit(12);
      
      if (brandsData) {
        // Filter to only include reasonable commission rates (not data errors)
        const validBrands = brandsData.filter(b => 
          b.commission_rate && b.commission_rate <= 1 // 100% max
        ).slice(0, 6);
        setFeaturedBrands(validBrands as FeaturedBrand[]);
      }
      
      // Get total active brands count
      const { count: brandsCount } = await supabase
        .from('brands')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (brandsCount) {
        setTotalBrandsCount(brandsCount);
      }
      
      // Fetch this month's earnings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: monthlyData } = await supabase
        .from('nctr_transactions')
        .select('nctr_amount')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());
      
      if (monthlyData) {
        const total = monthlyData.reduce((sum, t) => sum + (t.nctr_amount || 0), 0);
        setThisMonthEarned(total);
      }
      
      // Count unique brands shopped
      const { data: shoppedData } = await supabase
        .from('nctr_transactions')
        .select('partner_name')
        .eq('user_id', user?.id)
        .eq('earning_source', 'affiliate_purchase')
        .eq('status', 'completed');
      
      if (shoppedData) {
        const uniqueBrands = new Set(shoppedData.map(t => t.partner_name).filter(Boolean));
        setBrandsShoppedCount(uniqueBrands.size);
      }
    } catch (error) {
      console.error('Error fetching hero data:', error);
    }
  }, [user?.id]);

  // Memoize the transaction callback to prevent effect restarts
  const handleTransactionReceived = useCallback(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Set up real-time transaction notifications
  useTransactionNotifications({
    userId: user?.id,
    onTransactionReceived: handleTransactionReceived
  });

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

  // Handler for Shop & Earn button - navigate to affiliate links page
  const handleShopAndEarn = () => {
    navigate('/affiliate-links');
  };

  // Handler for clicking a featured brand
  const handleFeaturedBrandClick = async (brand: FeaturedBrand) => {
    if (!user?.id || !brand.loyalize_id) {
      toast({
        title: "Error",
        description: "Unable to process this brand. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const trackingId = `tgn_${user.id.slice(-8)}_${brand.id.slice(-8)}_${Date.now().toString(36)}`;
      
      // Create tracking mapping
      await supabase
        .from('affiliate_link_mappings')
        .insert({
          tracking_id: trackingId,
          user_id: user.id,
          brand_id: brand.id,
        });
      
      // Build redirect URL
      const finalUrl = `https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=${brand.loyalize_id}&user=${user.id}&tracking=${trackingId}`;
      
      window.open(finalUrl, '_blank');
      
      toast({
        title: `✅ ${brand.name} - Tracking Active!`,
        description: `Shop normally and earn crypto back. Your rewards will appear within 24-48 hours.`,
        duration: 6000,
      });
    } catch (error) {
      console.error('Error handling brand click:', error);
      toast({
        title: "Error",
        description: "Failed to open brand link. Please try again.",
        variant: "destructive",
      });
    }
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
      case 'free_trial':
        handleFreeTrialOpportunity(opportunity);
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

      // Process the daily checkin with streak tracking
      const { data: result, error } = await supabase.rpc('process_daily_checkin_with_streak', {
        p_user_id: user?.id
      });

      if (error) throw error;

      const checkinResult = result as { 
        success: boolean; 
        reward_amount?: number; 
        message?: string; 
        error?: string;
        streak?: {
          current_streak: number;
          streak_bonus_awarded: boolean;
          streak_bonus_amount: number;
          next_bonus_in: number;
        };
      };

      if (checkinResult.success) {
        // Immediately update UI state
        setDailyCheckinAvailable(false);
        setLastCheckinTime(new Date().toISOString());
        
        const streakInfo = checkinResult.streak;
        const isStreakBonus = streakInfo?.streak_bonus_awarded;
        
        toast({
          title: isStreakBonus ? "🔥 Streak Bonus Earned!" : "Daily Bonus Claimed! 🎉",
          description: (checkinResult.message || `You earned ${checkinResult.reward_amount?.toFixed(2)} NCTR!`) + " Visit Crescendo to lock your stakes and level up your status.",
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
      
      // Show username prompt after a brief delay
      setTimeout(() => {
        const platformName = opportunity.social_platform || 'social media';
        const username = prompt(`To verify your follow, please enter your ${platformName} username:\n\n(This will be pending admin approval)`);
        
        if (username && username.trim()) {
          awardSocialFollowReward(opportunity, username.trim());
        }
      }, 3000);
      
      toast({
        title: `Opening ${opportunity.partner_name || 'social platform'}`,
        description: "Complete the follow/subscribe action, then enter your username for verification!",
      });
    } else {
      toast({
        title: "Link Not Available",
        description: "The social media link for this opportunity is not configured yet.",
        variant: "destructive",
      });
    }
  };

  const awardSocialFollowReward = async (opportunity: EarningOpportunity, username: string) => {
    try {
      // Check if already has a pending or completed claim
      const { data: existingTransaction } = await supabase
        .from('nctr_transactions')
        .select('id, status')
        .eq('user_id', user?.id)
        .eq('opportunity_id', opportunity.id)
        .maybeSingle();

      if (existingTransaction) {
        if (existingTransaction.status === 'pending') {
          toast({
            title: "Already Submitted!",
            description: "Your claim is pending admin approval. Please wait for verification.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Already Completed!",
            description: "You've already earned rewards for this social media task.",
            variant: "destructive",
          });
        }
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

      // Create PENDING transaction with username in metadata
      const platformName = opportunity.social_platform || 'social_media';
      await supabase.from('nctr_transactions').insert({
        user_id: user?.id,
        transaction_type: 'earned',
        nctr_amount: totalReward,
        opportunity_id: opportunity.id,
        description: `${opportunity.title}`,
        earning_source: 'social_follow',
        status: 'pending',
        metadata: {
          platform: platformName,
          username: username,
          platform_handle: opportunity.social_handle,
          claimed_at: new Date().toISOString(),
          reward_breakdown: {
            available: availableReward,
            lock_90: lock90Reward,
            lock_360: lock360Reward
          }
        }
      });

      // Refresh data to show pending status
      await fetchUserData();

      toast({
        title: "✅ Claim Submitted!",
        description: `Your claim for "${opportunity.title}" is pending admin approval. We'll verify your @${username} follow and credit your rewards soon!`,
      });

    } catch (error) {
      console.error('Error submitting social follow claim:', error);
      toast({
        title: "Error",
        description: "Failed to submit claim. Please try again or contact support.",
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
    // Debug: Check what data we have
    console.log('🔍 Opportunity data:', {
      id: opportunity.id,
      title: opportunity.title,
      brand_id: opportunity.brand_id,
      brands: opportunity.brands,
      has_brands_data: !!opportunity.brands
    });
    
    // Validate that we have both brand info and a valid loyalize_id
    if (!opportunity.brands?.id || !opportunity.brands?.loyalize_id) {
      console.error('❌ Missing brand data:', {
        has_brands: !!opportunity.brands,
        brands_id: opportunity.brands?.id,
        loyalize_id: opportunity.brands?.loyalize_id
      });
      
      toast({
        title: "Link Not Available",
        description: "This shopping opportunity is not properly configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🛍️ Tracking shopping opportunity click:', opportunity.title);
      
      // Generate unique tracking ID for this user + opportunity
      const trackingId = `tgn_${user?.id?.slice(-8)}_${opportunity.brands.id?.slice(-8)}_${Date.now().toString(36)}`;
      console.log('🆔 Generated tracking ID:', trackingId);
      
      // Build Loyalize redirect URL using the brand's loyalize_id
      const loyalizeStoreId = opportunity.brands.loyalize_id;
      const finalUrl = `https://rndivcsonsojgelzewkb.supabase.co/functions/v1/loyalize-redirect?store=${loyalizeStoreId}&user=${user?.id}&tracking=${trackingId}`;
      
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
      const { error: mappingError } = await supabase
        .from('affiliate_link_mappings')
        .insert({
          tracking_id: trackingId,
          user_id: user?.id,
          brand_id: opportunity.brands.id, // Use brand_id from joined brands data
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
      // Calculate actual reward display based on distribution type
      let rewardDescription = '';
      
      if (opportunity.reward_distribution_type === 'combined') {
        // For combined distribution, show the per-dollar breakdown
        const perDollarRewards = [];
        if (opportunity.available_nctr_reward && opportunity.available_nctr_reward > 0) {
          perDollarRewards.push(`${opportunity.available_nctr_reward} NCTR (available)`);
        }
        if (opportunity.lock_90_nctr_reward && opportunity.lock_90_nctr_reward > 0) {
          perDollarRewards.push(`${opportunity.lock_90_nctr_reward} NCTR (90LOCK)`);
        }
        if (opportunity.lock_360_nctr_reward && opportunity.lock_360_nctr_reward > 0) {
          perDollarRewards.push(`${opportunity.lock_360_nctr_reward} NCTR (360LOCK)`);
        }
        
        const totalPerDollar = (opportunity.available_nctr_reward || 0) + 
                               (opportunity.lock_90_nctr_reward || 0) + 
                               (opportunity.lock_360_nctr_reward || 0);
        
        rewardDescription = `Shop normally and earn ${totalPerDollar} NCTR per $1 spent (${perDollarRewards.join(' + ')})`;
      } else if (opportunity.reward_distribution_type === 'available') {
        rewardDescription = `Shop normally and earn ${opportunity.available_nctr_reward || 0} NCTR per $1 spent (available immediately)`;
      } else if (opportunity.reward_distribution_type === 'lock_90') {
        rewardDescription = `Shop normally and earn ${opportunity.lock_90_nctr_reward || 0} NCTR per $1 spent (90LOCK)`;
      } else if (opportunity.reward_distribution_type === 'lock_360') {
        rewardDescription = `Shop normally and earn ${opportunity.lock_360_nctr_reward || 0} NCTR per $1 spent (360LOCK)`;
      } else {
        // Legacy mode - use reward_per_dollar
        const rewardRate = opportunity.reward_per_dollar || 50;
        rewardDescription = `Shop normally and earn ${rewardRate} NCTR per $1 spent`;
      }
      
      toast({
        title: `✅ ${opportunity.partner_name || 'Partner'} - Tracking Active!`,
        description: `${rewardDescription}. Complete your purchase in the new tab - your rewards will appear automatically within 24-48 hours.\n\nTracking ID: ${trackingId}`,
        duration: 8000,
        className: "border-green-500 bg-green-50 dark:bg-green-950",
      });
      
      console.log('🎯 Tracking complete:', {
        user_id: user?.id,
        tracking_id: trackingId,
        opportunity: opportunity.title,
        partner: opportunity.partner_name
      });
      
    } catch (error) {
      console.error('❌ Error handling shopping opportunity:', error);
      toast({
        title: "⚠️ Tracking Issue", 
        description: `Failed to set up tracking. Please try again or contact support.`,
        variant: "destructive",
      });
    }
  };

  const handleFreeTrialOpportunity = (opportunity: EarningOpportunity) => {
    // Open the affiliate link for the free trial
    if (opportunity.affiliate_link) {
      window.open(opportunity.affiliate_link, '_blank');
      
      toast({
        title: `${opportunity.partner_name || 'Free Trial'} Activated! 🎉`,
        description: "Complete the signup and return here to mark it complete for your reward!",
        duration: 8000,
      });
    } else {
      toast({
        title: "Link Not Available",
        description: "The free trial link is not configured yet.",
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
      // Use the proper database function for daily check-in
      const { data, error } = await supabase.rpc('process_daily_checkin', {
        p_user_id: user?.id
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; reward_amount?: number; multiplier?: number };

      if (!result.success) {
        toast({
          title: "Already Claimed!",
          description: result.message || "You've already claimed today's daily bonus. Come back tomorrow!",
          variant: "destructive",
        });
        return;
      }

      // Refresh user data to show updated balances
      await fetchUserData();

      toast({
        title: "🎉 Daily Bonus Earned!",
        description: `You've earned ${(result.reward_amount || 0).toFixed(2)} NCTR! (${result.multiplier || 1}x Crescendo multiplier)`,
      });
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

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-page">
        <header className="section-highlight backdrop-blur-sm border-b border-section-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold nctr-text">The Garden</h1>
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                  BETA
                </Badge>
              </div>
              <Button
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Sign In
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-6 max-w-4xl">
          <div className="text-center py-12">
            <div className="mb-8">
              <img 
                src={nctrLogo} 
                alt="NCTR Logo" 
                className="h-20 mx-auto mb-6 opacity-90"
              />
              <h2 className="text-4xl font-bold mb-4 nctr-text">
                Welcome to The Garden
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Your personal crypto rewards hub. Earn NCTR tokens through everyday activities like shopping, inviting friends, and engaging with partners.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Gift className="h-5 w-5 text-primary" />
                    Earn Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Earn NCTR by shopping with NCTR Alliance brand partners.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Build Your Alliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Invite friends and grow together. Both earn rewards after completing profile and making their first purchase
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Crescendo Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Lock NCTR to unlock higher status tiers and amplify all your earnings
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg"
              >
                Enter The Garden →
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/')}
                className="border-primary/50 text-primary hover:bg-primary/10 px-8 py-6 text-lg"
              >
                ← Back to Home
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      {/* Alliance Token Wallet Prompt */}
      {user?.id && (
        <AllianceTokenWalletPrompt 
          userId={user.id} 
          hasWallet={hasWallet}
          onWalletAdded={() => setHasWallet(true)}
        />
      )}
      
      {/* Main Content */}
      {activeTab === 'shop' ? (
        <MallView 
          userId={user?.id} 
          availableNctr={portfolio?.available_nctr || 0}
          totalNctr={parseFloat(portfolio?.lock_360_nctr?.toString() || '0') + parseFloat(portfolio?.lock_90_nctr?.toString() || '0')}
        />
      ) : (
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
        {/* HERO SECTION - Above the fold */}
        <GardenHeroSection
          userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'}
          portfolio={portfolio}
          featuredBrands={featuredBrands}
          totalBrands={totalBrandsCount}
          thisMonthEarned={thisMonthEarned}
          brandsShoppedCount={brandsShoppedCount}
          onShopClick={() => setActiveTab('shop')}
          onBrandClick={handleFeaturedBrandClick}
        />

        {/* Crescendo Status - Below hero */}
        <div className="mb-8">
          <MemberStatusBanner 
            currentStatus={portfolio?.opportunity_status || 'starter'}
            current360NCTR={parseFloat(portfolio?.lock_360_nctr?.toString() || '0')}
            availableNCTR={portfolio?.available_nctr || 0}
            onUpgradeClick={() => {
              const lockButton = document.querySelector('[data-lock-commitment]');
              if (lockButton) {
                (lockButton as HTMLElement).click();
              }
            }}
            onEarnMoreClick={() => {
              const opportunitiesSection = document.querySelector('[data-earning-opportunities]');
              if (opportunitiesSection) {
                opportunitiesSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        </div>

        {/* Stakes Overview - Collapsible */}
        <div className="mb-8">
          <Card 
            className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 shadow-premium cursor-pointer hover:shadow-premium-hover transition-all duration-300"
            onClick={() => setPortfolioExpanded(!portfolioExpanded)}
          >
            <CardHeader>
              <CardTitle className="text-xl section-heading flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coins className="w-6 h-6 text-primary" />
                  Your NCTR Stakes
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatNCTR((portfolio?.available_nctr || 0) + (portfolio?.lock_90_nctr || 0) + (portfolio?.lock_360_nctr || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {portfolioExpanded ? 'Tap to collapse' : 'Tap to view details'}
                    </p>
                  </div>
                  <div className={`transform transition-transform duration-300 ${portfolioExpanded ? 'rotate-180' : ''}`}>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            
            {/* Collapsed mini breakdown */}
            {!portfolioExpanded && (
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-card rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-0.5">Available</p>
                    <p className="text-sm font-bold text-foreground">{formatNCTR(portfolio?.available_nctr || 0)}</p>
                  </div>
                  <div className="text-center p-2 bg-card rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-0.5">90LOCK</p>
                    <p className="text-sm font-bold text-foreground">{formatNCTR(portfolio?.lock_90_nctr || 0)}</p>
                  </div>
                  <div className="text-center p-2 bg-card rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-0.5">360LOCK</p>
                    <p className="text-sm font-bold text-foreground">{formatNCTR(portfolio?.lock_360_nctr || 0)}</p>
                  </div>
                </div>
              </CardContent>
            )}

            {portfolioExpanded && (
              <CardContent className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Card className="bg-white shadow-sm">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Coins className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-muted-foreground">Available Stakes</span>
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
                        <span className="text-sm font-medium text-green-600">Total Earned Stakes</span>
                      </div>
                      <p className="text-xl font-bold text-green-600 mb-1">
                        {formatNCTR(portfolio?.total_earned || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatUSD(portfolio?.total_earned || 0)}</p>
                      <p className="text-xs text-green-600/80">Lifetime Stakes</p>
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

                {/* Alliance Tokens Display */}
                {portfolio?.alliance_tokens && Object.keys(portfolio.alliance_tokens).length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                        Alliance Stake Balances
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(portfolio.alliance_tokens as Record<string, any>).map(([symbol, tokenData]) => {
                        const amount = typeof tokenData === 'number' ? tokenData : (tokenData?.amount || 0);
                        const lockInfo = typeof tokenData === 'object' ? tokenData : null;
                        
                        return (
                          <Card key={symbol} className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-2 border-purple-300 dark:border-purple-700">
                            <CardContent className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">{symbol}</span>
                              </div>
                              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">
                                {new Intl.NumberFormat('en-US', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 5,
                                }).format(amount)}
                              </p>
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs">
                                🔒 {lockInfo?.lock_category || '360LOCK'}
                              </Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                    Stakes Details & Sync
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

                {/* Stakes Story - Transaction History */}
                <div className="mt-6">
                  <PortfolioStory userId={user?.id || ''} refreshKey={refreshKey} />
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Top Earning Opportunities - Above the fold */}
        <div data-earning-opportunities>
          {/* Daily Check-in Section */}
          <div className="mb-6">
            {opportunities.filter(op => op.opportunity_type === 'daily_checkin').map(opportunity => {
              if (!dailyCheckinAvailable) {
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
              
              return (
                <Card key={opportunity.id} className="bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-200 shadow-premium hover:shadow-premium-hover transition-all duration-500 cursor-pointer group" onClick={() => handleOpportunityClick(opportunity)}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Gift className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-green-700 mb-0.5">{opportunity.title}</h3>
                        <div className="text-xs text-green-600 line-clamp-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: opportunity.description?.replace(/\n/g, '<br>') || '' }} />
                      </div>
                    </div>

                    <div className="text-center py-2 mb-2">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <span className="text-xl font-bold text-green-600">
                          {(() => {
                            const total = (opportunity.available_nctr_reward || 0) + 
                                        (opportunity.lock_90_nctr_reward || 0) + 
                                        (opportunity.lock_360_nctr_reward || 0);
                            return formatNCTR(total || 50);
                          })()}
                        </span>
                        <img src={nctrLogo} alt="NCTR" className="h-14 w-auto -ml-4" />
                      </div>
                      <p className="text-xs text-green-600 mb-1">Total Available Bonus</p>
                      
                      <div className="bg-white/50 rounded-lg p-1.5 mb-2">
                        <p className="text-[10px] font-semibold text-green-700 mb-1">Daily Reward Breakdown:</p>
                        <div className="flex flex-wrap justify-center gap-1 text-[10px]">
                          {(opportunity.available_nctr_reward || 0) > 0 && (
                            <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full">
                              {formatNCTR(opportunity.available_nctr_reward || 0)} Active
                            </span>
                          )}
                          {(opportunity.lock_90_nctr_reward || 0) > 0 && (
                            <span className="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full">
                              {formatNCTR(opportunity.lock_90_nctr_reward || 0)} 90LOCK
                            </span>
                          )}
                          {(opportunity.lock_360_nctr_reward || 0) > 0 && (
                            <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              {formatNCTR(opportunity.lock_360_nctr_reward || 0)} 360LOCK
                              <Lock360InfoTooltip size={10} />
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <RewardDisplay opportunity={opportunity} size="md" />
                      
                      {opportunity.alliance_token_enabled && opportunity.alliance_token_ratio && opportunity.alliance_token_ratio > 0 && (
                        <div className="mt-2 p-1.5 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/30 rounded-lg">
                          <div className="text-center">
                            <h4 className="text-[10px] font-bold text-primary uppercase mb-1">
                              Alliance Stake Bonus
                            </h4>
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <span className="text-sm font-bold text-primary">
                                +{opportunity.alliance_token_ratio.toFixed(4)}
                              </span>
                              {opportunity.alliance_token_logo_url && (
                                <img 
                                  src={opportunity.alliance_token_logo_url} 
                                  alt={opportunity.alliance_token_name || 'Stake'}
                                  className="h-3 w-3"
                                />
                              )}
                              <span className="text-xs font-semibold text-primary">
                                {opportunity.alliance_token_symbol || opportunity.alliance_token_name}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mb-0.5">per $1 spent</div>
                            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                              🔒 Locked for {opportunity.alliance_token_lock_days || 90} days
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-3 group-hover:scale-105 transition-transform"
                      size="sm"
                    >
                      {opportunity.cta_text || '✅ Claim Daily Bonus'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* First invite opportunity (above the fold) */}
          <div className="mb-8">
            {opportunities.filter(op => op.opportunity_type === 'invite' && !completedOpportunityIds.includes(op.id)).slice(0, 1).map(opportunity => (
              <Card key={opportunity.id} className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => handleOpportunityClick(opportunity)}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">Best Way to Earn</div>
                        <h3 className="text-lg font-bold text-primary mb-1">{opportunity.title}</h3>
                        <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: opportunity.description?.replace(/\n/g, '<br>') || '' }} />
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-primary">
                        {formatNCTR((opportunity.nctr_reward || 1000) * userMultiplier)}
                      </div>
                      <div className="text-xs text-muted-foreground">NCTR per friend</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground group-hover:scale-[1.01] transition-all"
                      size="default"
                    >
                      Start Inviting →
                    </Button>
                    
                    <Button 
                      onClick={(e) => { e.stopPropagation(); copyInviteLink(); }} 
                      variant="outline" 
                      size="default"
                      className="border-primary/30 hover:bg-primary/10"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ═══ MORE WAYS TO EARN - Below the fold ═══ */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border" />
              <h2 className="text-lg font-semibold text-muted-foreground whitespace-nowrap">More Ways to Earn</h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Remaining invite opportunities */}
            <div className="mb-6 space-y-4">
              {opportunities.filter(op => op.opportunity_type === 'invite' && !completedOpportunityIds.includes(op.id)).slice(1).map(opportunity => (
                <Card key={opportunity.id} className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => handleOpportunityClick(opportunity)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">Best Way to Earn</div>
                          <h3 className="text-lg font-bold text-primary mb-1">{opportunity.title}</h3>
                          <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: opportunity.description?.replace(/\n/g, '<br>') || '' }} />
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-primary">
                          {formatNCTR((opportunity.nctr_reward || 1000) * userMultiplier)}
                        </div>
                        <div className="text-xs text-muted-foreground">NCTR per friend</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground group-hover:scale-[1.01] transition-all"
                        size="default"
                      >
                        Start Inviting →
                      </Button>
                      
                      <Button 
                        onClick={(e) => { e.stopPropagation(); copyInviteLink(); }} 
                        variant="outline" 
                        size="default"
                        className="border-primary/30 hover:bg-primary/10"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Learn, Shopping & Free Trial Opportunities */}
            <div className="mb-8 space-y-2">
              {opportunities
                .filter(op => 
                  ['learn_and_earn', 'shopping', 'free_trial'].includes(op.opportunity_type) && 
                  !completedOpportunityIds.includes(op.id)
                )
                .map((opportunity, index, array) => {
                  const isLearnAndEarn = opportunity.opportunity_type === 'learn_and_earn';
                  const prevOpp = index > 0 ? array[index - 1] : null;
                  const showLearnHeader = isLearnAndEarn && (!prevOpp || prevOpp.opportunity_type !== 'learn_and_earn');
                  const showShoppingHeader = opportunity.opportunity_type === 'shopping' && (!prevOpp || !['shopping', 'free_trial'].includes(prevOpp.opportunity_type));
                  
                  return (
                    <>
                      {showLearnHeader && (
                        <h3 className="text-xl font-semibold section-heading mb-4 mt-6 flex items-center gap-2">
                          <div className="w-2 h-6 bg-primary rounded-full"></div>
                          📚 Learn & Earn
                        </h3>
                      )}
                      {showShoppingHeader && (
                        <h3 className="text-xl font-semibold section-heading mb-4 mt-6 flex items-center gap-2">
                          <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                          🟢 Live Opportunities
                        </h3>
                      )}
                      
                      {isLearnAndEarn ? (
                        <Card 
                          key={opportunity.id} 
                          className="mb-2 cursor-pointer hover:shadow-medium transition-all duration-300 border-l-2 border-l-primary bg-gradient-to-r from-primary/5 to-transparent"
                          onClick={() => navigate('/learn')}
                        >
                          <CardContent className="p-0">
                            <div className="flex flex-col lg:flex-row">
                              <div className="relative flex items-center justify-center lg:w-24 h-16 lg:h-auto bg-gradient-to-br from-white to-gray-50 rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none border-r border-gray-100">
                                {opportunity.video_url ? (
                                  <div className="relative">
                                    <Play className="w-8 h-8 text-primary" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                              </div>

                              <div className="p-2 sm:p-3 lg:p-4 flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <h3 className="text-sm sm:text-base font-semibold section-heading truncate">
                                        {opportunity.title}
                                      </h3>
                                      <Badge className="bg-primary text-primary-foreground font-bold ml-1 text-[10px] px-1.5 py-0.5">
                                        LEARN
                                      </Badge>
                                    </div>
                                    <div className="text-xs sm:text-sm section-text line-clamp-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: opportunity.description?.replace(/\n/g, '<br>') || '' }} />
                                  </div>
                                </div>

                                <div className="text-center mb-1.5 sm:mb-2">
                                  <div className="flex items-center justify-center gap-0.5 text-lg sm:text-xl font-bold text-primary mb-0.5">
                                    <span>
                                      {formatNCTR((opportunity.lock_90_nctr_reward || 0) + (opportunity.lock_360_nctr_reward || 0))}
                                    </span>
                                    <img src={nctrLogo} alt="NCTR" className="h-12 sm:h-14 w-auto -ml-4" />
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                                    Watch, Learn & Take Quiz
                                  </div>
                                  <RewardDisplay opportunity={opportunity} size="md" showPerDollar={false} />
                                </div>

                                <Button 
                                  onClick={() => navigate('/learn')}
                                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-3"
                                  size="sm"
                                >
                                  Start Learning →
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card
                    key={opportunity.id} 
                    className="mb-2 cursor-pointer hover:shadow-medium transition-all duration-300 border-l-2 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent"
                    onClick={() => handleOpportunityClick(opportunity)}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        <div className="relative flex items-center justify-center lg:w-24 h-16 lg:h-auto bg-gradient-to-br from-white to-gray-50 rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none border-r border-gray-100">
                          {opportunity.partner_logo_url ? (
                            <BrandLogo 
                              src={opportunity.partner_logo_url} 
                              alt={opportunity.partner_name}
                              size="md"
                              variant="auto"
                              className="p-2"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                              <Gift className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="p-2 sm:p-3 lg:p-4 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm sm:text-base font-semibold section-heading truncate">
                                  {opportunity.title}
                                </h3>
                                <Badge className="bg-green-600 text-white font-bold ml-1 text-[10px] px-1.5 py-0.5">
                                  LIVE
                                </Badge>
                              </div>
                              <div className="text-xs sm:text-sm section-text line-clamp-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: opportunity.description?.replace(/\n/g, '<br>') || '' }} />
                            </div>
                          </div>

                            <div className="text-center mb-1.5 sm:mb-2">
                             {/* Total NCTR Earn Opportunity */}
                              <div className="flex items-center justify-center gap-0.5 text-lg sm:text-xl font-bold text-primary mb-0.5">
                                <span>
                                  {(() => {
                                    if (opportunity.opportunity_type === 'invite') {
                                      const baseReward = 1000;
                                      return formatNCTR(baseReward * userMultiplier);
                                    } else {
                                      const newRewardTotal = (opportunity.available_nctr_reward || 0) + (opportunity.lock_90_nctr_reward || 0) + (opportunity.lock_360_nctr_reward || 0);
                                      const totalReward = newRewardTotal > 0 ? newRewardTotal : (opportunity.reward_per_dollar || 0);
                                      return formatNCTR(totalReward);
                                    }
                                  })()}
                                </span>
                                 <img src={nctrLogo} alt="NCTR" className="h-12 sm:h-14 w-auto -ml-4" />
                               </div>
                               {opportunity.opportunity_type === 'shopping' && (
                                 <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Per $1 Spent</div>
                               )}
                               {opportunity.opportunity_type === 'invite' && (
                                 <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                                   {userMultiplier > 1 ? (
                                     <span>
                                       Crescendo <span className={`font-semibold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{portfolio?.opportunity_status}</span> bonus
                                     </span>
                                   ) : 'Per friend who joins'}
                                 </div>
                               )}
                              
                              <RewardDisplay opportunity={opportunity} size="md" showPerDollar={false} userMultiplier={userMultiplier} userStatus={portfolio?.opportunity_status || 'starter'} />
                              
                              {opportunity.alliance_token_enabled && opportunity.alliance_token_ratio && opportunity.alliance_token_ratio > 0 && opportunity.opportunity_type === 'shopping' && (
                                <div className="mt-2 p-2 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/30 rounded-lg">
                                  <div className="text-center">
                                    <h4 className="text-[10px] font-bold text-primary uppercase mb-1">
                                      Alliance Stake Bonus
                                    </h4>
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                      <span className="text-sm font-bold text-primary">
                                        +{opportunity.alliance_token_ratio.toFixed(4)}
                                      </span>
                                      {opportunity.alliance_token_logo_url && (
                                        <img 
                                          src={opportunity.alliance_token_logo_url} 
                                          alt={opportunity.alliance_token_name || 'Stake'}
                                          className="h-4 w-4"
                                        />
                                      )}
                                      <span className="text-xs font-semibold text-primary">
                                        {opportunity.alliance_token_symbol || opportunity.alliance_token_name}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mb-1">per $1 spent</div>
                                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                      🔒 Locked for {opportunity.alliance_token_lock_days || 90} days
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <Button 
                             onClick={() => handleOpportunityClick(opportunity)}
                             className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-3"
                             size="sm"
                           >
                             {opportunity.opportunity_type === 'free_trial' ? '🌐 Explore & Earn →' : '🛍️ Shop & Earn →'}
                           </Button>
                          {opportunity.opportunity_type === 'free_trial' && (
                            <Button
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase
                                    .from('nctr_transactions')
                                    .insert({
                                      user_id: user?.id,
                                      transaction_type: 'earned',
                                      nctr_amount: 0,
                                      description: `Free trial completion claim: ${opportunity.partner_name || 'Partner'}`,
                                      earning_source: 'free_trial',
                                      status: 'pending_verification',
                                      metadata: { opportunity_id: opportunity.id }
                                    })
                                    .select()
                                    .single();

                                  if (error) throw error;

                                  toast({
                                    title: "✅ Completion Submitted!",
                                    description: "Admin will verify and credit your NCTR reward soon.",
                                    duration: 5000,
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: "⚠️ Submission Failed",
                                    description: error.message || "Please try again or contact support.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              variant="outline"
                              className="w-full border-2 border-primary text-primary hover:bg-primary/10 text-sm py-4 mt-2"
                            >
                              ✓ I Completed This Trial
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                      )}
                    </>
                  );
                })}
            </div>

            {/* Social Media & Other Opportunities */}
            {opportunities.filter(op => {
              const isSocialBonusPartner = ['social_follow', 'bonus', 'partner'].includes(op.opportunity_type);
              const isCompletedFreeTrial = op.opportunity_type === 'free_trial' && completedOpportunityIds.includes(op.id);
              return isSocialBonusPartner || isCompletedFreeTrial;
            }).length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold section-heading mb-4 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                  🔗 Social & Bonus Opportunities
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {opportunities.filter(op => {
                    const isSocialBonusPartner = ['social_follow', 'bonus', 'partner'].includes(op.opportunity_type);
                    const isCompletedFreeTrial = op.opportunity_type === 'free_trial' && completedOpportunityIds.includes(op.id);
                    return isSocialBonusPartner || isCompletedFreeTrial;
                  }).map((opportunity) => {
                    const isCompleted = completedOpportunityIds.includes(opportunity.id);
                    
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
                                <div className="text-xs line-clamp-2 section-text whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: opportunity.description?.replace(/\n/g, '<br>') || '' }} />
                              </div>
                            </div>
                          </div>

                          <div className="text-center mb-4">
                            <div className="text-lg font-bold text-primary mb-2">
                              {(() => {
                                if (opportunity.opportunity_type === 'invite') {
                                  const baseReward = 1000;
                                  return formatNCTR(baseReward * userMultiplier);
                                } else {
                                  const newRewardTotal = (opportunity.available_nctr_reward || 0) + (opportunity.lock_90_nctr_reward || 0) + (opportunity.lock_360_nctr_reward || 0);
                                  const totalReward = newRewardTotal > 0 ? newRewardTotal : (opportunity.nctr_reward || 0);
                                  return formatNCTR(totalReward);
                                }
                              })()} NCTR
                            </div>
                            {opportunity.opportunity_type === 'shopping' && (
                              <div className="text-xs text-muted-foreground mb-3">Per $1 Spent</div>
                            )}
                            {opportunity.opportunity_type === 'invite' && (
                              <div className="text-xs text-muted-foreground mb-3">
                                {userMultiplier > 1 ? (
                                  <span>
                                    Crescendo <span className={`font-semibold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{portfolio?.opportunity_status}</span> bonus
                                  </span>
                                ) : 'Per friend who joins'}
                              </div>
                            )}
                            
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
          </div>

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
      )}

      {/* Invite Friends Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base sm:text-lg">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              🎉 Invite Friends & Earn {Math.round(inviteReward * userMultiplier)} NCTR in 360LOCK
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 sm:p-4 border border-primary/20">
              <h4 className="font-semibold text-primary mb-2 text-sm sm:text-base">How it works:</h4>
              <ul className="text-xs sm:text-sm space-y-1 text-muted-foreground">
                <li>• Share your unique link below</li>
                <li>• Friends join using your link</li>
                <li>• You earn {Math.round(inviteReward * userMultiplier)} NCTR {userMultiplier > 1 && (
                  <span>
                    (<span className={`font-bold ${getStatusTextColor(portfolio?.opportunity_status || 'starter')}`}>{userMultiplier}x</span> Crescendo bonus)
                  </span>
                )} & they get {inviteReward} NCTR in 360LOCK!</li>
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
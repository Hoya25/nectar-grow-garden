import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  TrendingUp, 
  Gift, 
  Users, 
  Lock,
  Wallet,
  BarChart3,
  User,
  Settings,
  Power
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNavigate } from 'react-router-dom';
import { useNCTRPrice } from '@/hooks/useNCTRPrice';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { Lock360InfoTooltip } from '@/components/ui/info-tooltip';
import NCTRLiveSync from './NCTRLiveSync';
import nctrLogo from "@/assets/nctr-logo-transparent.png";

interface Portfolio {
  available_nctr: number;
  pending_nctr: number;
  total_earned: number;
  lock_90_nctr: number;
  lock_360_nctr: number;
  opportunity_status: string;
}

interface AppSidebarProps {
  portfolio: Portfolio | null;
  onLockCreated: () => void;
}

const formatNCTR = (amount: number): string => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
  if (amount >= 10000) return (amount / 1000).toFixed(2) + 'K';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export function AppSidebar({ portfolio, onLockCreated }: AppSidebarProps) {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { currentPrice, priceChange24h, formatPrice, formatChange, getChangeColor, calculatePortfolioValue, formatUSD } = useNCTRPrice();

  const handleCommitTo360LOCK = async () => {
    if (!user || !portfolio?.available_nctr || portfolio.available_nctr <= 0) {
      toast({
        title: "No NCTR Available",
        description: "You don't have any available NCTR to commit.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('commit_available_to_360lock', {
        p_user_id: user.id,
        p_amount: portfolio.available_nctr
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result?.success) {
        toast({
          title: "🎉 Committed to 360LOCK!",
          description: `Successfully committed ${formatNCTR(portfolio.available_nctr)} NCTR to 360LOCK for maximum alliance benefits.`,
        });
        onLockCreated();
      } else {
        throw new Error(result?.error || 'Failed to commit to 360LOCK');
      }
    } catch (error) {
      console.error('Error committing to 360LOCK:', error);
      toast({
        title: "Commitment Failed",
        description: error instanceof Error ? error.message : "Failed to commit NCTR to 360LOCK. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navigationItems = [
    { title: "Profile", url: "/profile", icon: User },
    ...(isAdmin ? [{ title: "Admin", url: "/admin", icon: Settings }] : []),
  ];

  return (
    <Sidebar
      className={open ? "w-80" : "w-14"}
      collapsible="icon"
    >
      <SidebarContent className="bg-section-highlight border-r border-section-border">
        {/* Header */}
          <div className="p-4 border-b border-section-border">
          <div className="flex items-center justify-between">
            {open && (
              <h2 className="text-lg font-semibold section-heading">Portfolio Dashboard</h2>
            )}
            <SidebarTrigger />
          </div>
        </div>

        {/* NCTR Live Sync */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            {open && "NCTR Live Sync"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {open && (
              <div className="p-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sync your portfolio with token.nctr.live to update your Wings status and balance
                </p>
                <NCTRLiveSync onSyncComplete={() => window.location.reload()} />
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Portfolio Breakdown */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {open && "Portfolio Breakdown"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {open && (
              <div className="p-3 space-y-3">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>⏰ Last synced: 9/23/2025, 3:07:48 PM</span>
                </div>
                
                {/* Available NCTR */}
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-section-text/70 font-medium">Available NCTR</p>
                        <p className="text-lg font-bold text-section-accent mb-1">
                          {formatNCTR(portfolio?.available_nctr || 0)} NCTR
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          ${formatPrice(calculatePortfolioValue(portfolio?.available_nctr || 0))}
                        </p>
                        {portfolio?.available_nctr && portfolio.available_nctr > 0 && (
                          <Button
                            onClick={handleCommitTo360LOCK}
                            size="sm"
                            variant="360lock"
                            className="mt-2 h-6 text-xs"
                          >
                            → 360LOCK
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 360LOCK NCTR */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-bold text-primary">360LOCK NCTR</span>
                          <Lock360InfoTooltip size={14} />
                        </div>
                        <p className="text-lg font-bold text-primary mb-1">
                          {formatNCTR(portfolio?.lock_360_nctr || 0)} NCTR
                        </p>
                        <p className="text-xs text-primary font-medium">
                          ${formatPrice(calculatePortfolioValue(portfolio?.lock_360_nctr || 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Earned */}
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-section-text/70 font-medium">Total Earned</p>
                        <p className="text-lg font-bold text-section-accent mb-1">
                          {formatNCTR(portfolio?.total_earned || 0)} NCTR
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          ${formatPrice(calculatePortfolioValue(portfolio?.total_earned || 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-center py-2 text-xs text-muted-foreground">
                  Sync with NCTR Live to see portfolio breakdown
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* NCTR Price Info */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {open && "NCTR Price"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {open && (
              <Card className="mx-3 bg-white shadow-medium border border-section-border">
                <CardContent className="p-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <img 
                        src={nctrLogo} 
                        alt="NCTR" 
                        className="h-12 w-auto"
                      />
                    </div>
                    <p className="text-xl font-bold text-section-accent mb-1">${formatPrice(currentPrice)}</p>
                    <p className={`text-sm mb-2 ${getChangeColor(priceChange24h)}`}>
                      {formatChange(priceChange24h)} (24h)
                    </p>
                    
                    {/* Total Portfolio Value */}
                    <div className="mt-3 pt-3 border-t border-section-border">
                      <p className="text-xs text-muted-foreground mb-1">Total Portfolio Value</p>
                      <p className="text-lg font-bold text-primary">
                        {formatUSD(
                          (portfolio?.available_nctr || 0) + 
                          (portfolio?.lock_90_nctr || 0) + 
                          (portfolio?.lock_360_nctr || 0)
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNCTR(
                          (portfolio?.available_nctr || 0) + 
                          (portfolio?.lock_90_nctr || 0) + 
                          (portfolio?.lock_360_nctr || 0)
                        )} NCTR
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {open && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button 
                      onClick={() => navigate(item.url)}
                      className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-md"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-md text-red-600"
                  >
                    <Power className="h-4 w-4" />
                    {open && <span>Sign Out</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
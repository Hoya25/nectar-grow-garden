import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Garden from "./pages/Garden";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Referrals from "./pages/Referrals";
import AffiliateLinks from "./pages/AffiliateLinks";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";

const queryClient = new QueryClient();

const App = () => {
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    // Check if the user came from www.NCTR.Live or has the preview parameter
    const referrer = document.referrer.toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'coming-soon';
    
    console.log('Debug - Referrer:', referrer);
    console.log('Debug - URL Search:', window.location.search);
    console.log('Debug - Preview param:', urlParams.get('preview'));
    console.log('Debug - Is Preview:', isPreview);
    
    if (referrer.includes('nctr.live') || isPreview) {
      console.log('Debug - Should show Coming Soon page');
      setShowComingSoon(true);
    } else {
      console.log('Debug - Should show normal app');
    }
  }, []);

  // Show Coming Soon page if user came from NCTR.Live
  if (showComingSoon) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ComingSoon />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <WalletProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/garden" element={<Garden />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/affiliate-links" element={<AffiliateLinks />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </WalletProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

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
    // Check if the user came from www.NCTR.Live
    const referrer = document.referrer.toLowerCase();
    if (referrer.includes('nctr.live')) {
      setShowComingSoon(true);
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

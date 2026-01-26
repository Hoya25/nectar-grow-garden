import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Garden from "./pages/Garden";
import GardenCategoryPage from "./pages/GardenCategoryPage";
import GardenTagPage from "./pages/GardenTagPage";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Referrals from "./pages/Referrals";
import AffiliateLinks from "./pages/AffiliateLinks";
import LearnAndEarn from "./pages/LearnAndEarn";
import AdminBrandRates from "./pages/AdminBrandRates";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import { CustomerServiceBubble } from "./components/CustomerServiceBubble";

const queryClient = new QueryClient();

// Component to track route changes and update body attribute
const RouteTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    document.body.setAttribute('data-route', location.pathname);
  }, [location.pathname]);
  
  return null;
};

const App = () => {
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'coming-soon';
    setShowComingSoon(isPreview);
  }, []);

  // Show Coming Soon page if conditions are met
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RouteTracker />
          <AuthProvider>
            <WalletProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/garden" element={<Garden />} />
                <Route path="/garden/category/:slug" element={<GardenCategoryPage />} />
                <Route path="/garden/tag/:slug" element={<GardenTagPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/brand-rates" element={<AdminBrandRates />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/affiliate-links" element={<AffiliateLinks />} />
                <Route path="/learn" element={<LearnAndEarn />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CustomerServiceBubble />
            </WalletProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

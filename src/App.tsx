import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Garden from "./pages/Garden";
import GardenCategoryPage from "./pages/GardenCategoryPage";
import GardenTagPage from "./pages/GardenTagPage";
import KromaWellness from "./pages/KromaWellness";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Referrals from "./pages/Referrals";
import AffiliateLinks from "./pages/AffiliateLinks";
import LearnAndEarn from "./pages/LearnAndEarn";
import AdminBrandRates from "./pages/AdminBrandRates";
import AdminBrandAudit from "./pages/AdminBrandAudit";
import AdminBrandPriority from "./pages/AdminBrandPriority";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import FAQPage from "./pages/FAQPage";
import ForAgentsPage from "./pages/ForAgentsPage";
import About from "./pages/About";
import { CustomerServiceBubble } from "./components/CustomerServiceBubble";
import { Userback } from "./components/Userback";

const queryClient = new QueryClient();

// Redirect /dashboard to /garden?tab=dashboard
const DashboardRedirect = () => <Navigate to="/garden?tab=dashboard" replace />;

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
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/brand-rates" element={<AdminBrandRates />} />
                <Route path="/admin/brand-audit" element={<AdminBrandAudit />} />
                <Route path="/admin/brand-priority" element={<AdminBrandPriority />} />
                
                {/* Public routes that work with or without auth */}
                <Route path="/garden" element={<Garden />} />
                <Route path="/garden/category/:slug" element={<GardenCategoryPage />} />
                <Route path="/garden/tag/:slug" element={<GardenTagPage />} />
                <Route path="/garden/brand/kroma-wellness" element={<KromaWellness />} />
                <Route path="/brands/kroma-wellness" element={<KromaWellness />} />
                <Route path="/dashboard" element={<DashboardRedirect />} />
                
                {/* Authenticated routes with shared navigation layout */}
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/affiliate-links" element={<AffiliateLinks />} />
                  <Route path="/learn" element={<LearnAndEarn />} />
                </Route>
                
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/for-agents" element={<ForAgentsPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CustomerServiceBubble />
              <Userback />
            </WalletProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

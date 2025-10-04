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
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Referrals from "./pages/Referrals";
import AffiliateLinks from "./pages/AffiliateLinks";
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
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // More comprehensive URL and referrer checking
    const currentUrl = window.location.href;
    const searchParams = window.location.search;
    const urlParams = new URLSearchParams(searchParams);
    const previewParam = urlParams.get('preview');
    const isPreview = previewParam === 'coming-soon';
    const referrer = document.referrer.toLowerCase();
    const fromNCTR = referrer.includes('nctr.live');
    
    const debugOutput = `
=== COMING SOON DEBUG (useEffect) ===
Current URL: ${currentUrl}
Search params: ${searchParams}
All URL params: ${Array.from(urlParams.entries())}
Preview param value: "${previewParam}"
Is preview exactly 'coming-soon': ${isPreview}
Document referrer: "${referrer}"
From NCTR: ${fromNCTR}
Should show Coming Soon: ${isPreview || fromNCTR}
User agent: ${navigator.userAgent}
================================
    `;
    
    console.log(debugOutput);
    setDebugInfo(debugOutput);
    
    // Set state based on conditions
    if (isPreview || fromNCTR) {
      console.log('✅ Setting showComingSoon to true');
      setShowComingSoon(true);
    } else {
      console.log('❌ Not showing Coming Soon page');
      setShowComingSoon(false);
    }
  }, []);

  // Show debug info on page for easier debugging
  if (window.location.search.includes('debug=true')) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
        <h2>Debug Information</h2>
        {debugInfo}
        <button onClick={() => setShowComingSoon(!showComingSoon)}>
          Toggle Coming Soon ({showComingSoon ? 'ON' : 'OFF'})
        </button>
        {showComingSoon && <ComingSoon />}
      </div>
    );
  }

  // Add test button for easy Coming Soon testing (temporary)
  if (window.location.search.includes('test=true')) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Coming Soon Test</h2>
        <p>Click the button below to test the Coming Soon page:</p>
        <button 
          onClick={() => setShowComingSoon(!showComingSoon)}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          {showComingSoon ? 'Hide Coming Soon' : 'Show Coming Soon'}
        </button>
        {showComingSoon && <ComingSoon />}
      </div>
    );
  }

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
        <BrowserRouter>
          <RouteTracker />
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
              <CustomerServiceBubble />
            </WalletProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

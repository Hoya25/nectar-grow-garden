import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface NCTRPriceData {
  price_usd: number;
  source: string;
  updated_at: string;
}

export const SecureNCTRPrice = () => {
  const [priceData, setPriceData] = useState<NCTRPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateLimited, setRateLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPriceData = async () => {
    try {
      setLoading(true);
      setError(null);
      setRateLimited(false);
      
      // Check rate limit first
      const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_price_access_rate_limit');
      
      if (rateLimitError) {
        throw rateLimitError;
      }
      
      if (!rateLimitCheck) {
        setRateLimited(true);
        setError('Rate limit exceeded. Please try again in an hour.');
        return;
      }
      
      // Fetch price data with rate limiting approved
      const { data, error } = await supabase
        .from('nctr_price_cache')
        .select('price_usd, source, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          setError('NCTR price data not available');
          return;
        }
        throw error;
      }
      
      setPriceData(data);
      
      // Log business data access for security monitoring
      await supabase.rpc('log_business_data_access', { 
        p_table_name: 'nctr_price_cache',
        p_action: 'select'
      });
      
    } catch (err: any) {
      console.error('Price fetch error:', err);
      setError(err.message || 'Failed to fetch NCTR price');
      toast({
        title: "Price Fetch Error",
        description: "Unable to load current NCTR price",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceData();
    
    // Refresh every 30 seconds, but rate limiting will control actual access
    const interval = setInterval(fetchPriceData, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(price);
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading NCTR price...</span>
      </div>
    );
  }

  if (rateLimited) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700">
          Rate limit reached. Price updates available in 1 hour.
        </AlertDescription>
      </Alert>
    );
  }

  if (error || !priceData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'NCTR price unavailable'}
        </AlertDescription>
      </Alert>
    );
  }

  const isRecent = new Date().getTime() - new Date(priceData.updated_at).getTime() < 5 * 60 * 1000; // 5 minutes

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg">
          {formatPrice(priceData.price_usd)}
        </span>
        <Badge 
          variant={isRecent ? "default" : "secondary"}
          className="text-xs"
        >
          NCTR/USD
        </Badge>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Updated {formatLastUpdated(priceData.updated_at)}</span>
        {priceData.source && (
          <>
            <span>•</span>
            <span>{priceData.source}</span>
          </>
        )}
      </div>
      
      {!isRecent && (
        <Badge variant="outline" className="text-xs">
          Delayed
        </Badge>
      )}
    </div>
  );
};

export default SecureNCTRPrice;
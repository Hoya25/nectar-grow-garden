import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NCTRPrice {
  price_usd: number;
  price_change_24h?: number;
  market_cap?: number;
  volume_24h?: number;
  last_updated: string;
}

interface PriceData {
  success: boolean;
  contract_address: string;
  chain_id: number;
  price: NCTRPrice;
  sources?: any[];
  cached_at: string;
}

export const useNCTRPrice = () => {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('nctr-pricing', {
        body: { action: 'current' }
      });

      if (error) throw error;

      setPriceData(data);
    } catch (error) {
      console.error('Error fetching NCTR price:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch price');
      
      // Fallback to mock data
      setPriceData({
        success: true,
        contract_address: '0x973104fAa7F2B11787557e85953ECA6B4e262328',
        chain_id: 8453,
        price: {
          price_usd: 0.00125,
          price_change_24h: 2.4,
          last_updated: new Date().toISOString()
        },
        cached_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async (days: number = 7) => {
    try {
      const { data, error } = await supabase.functions.invoke('nctr-pricing', {
        body: { action: 'history', days }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching NCTR price history:', error);
      throw error;
    }
  };

  const calculatePortfolioValue = (nctrAmount: number): number => {
    if (!priceData?.price?.price_usd || nctrAmount === 0) return 0;
    return nctrAmount * priceData.price.price_usd;
  };

  const formatPrice = (price: number): string => {
    if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(8);
    }
  };

  const formatChange = (change?: number): string => {
    if (!change) return '+0.00%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change?: number): string => {
    if (!change) return 'text-muted-foreground';
    return change >= 0 ? 'text-green-500' : 'text-red-500';
  };

  useEffect(() => {
    fetchPrice();

    // Set up periodic price updates (every 30 seconds)
    const interval = setInterval(() => {
      fetchPrice();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    priceData,
    loading,
    error,
    fetchPrice,
    fetchPriceHistory,
    calculatePortfolioValue,
    formatPrice,
    formatChange,
    getChangeColor,
    // Convenience getters
    currentPrice: priceData?.price?.price_usd || 0,
    priceChange24h: priceData?.price?.price_change_24h || 0,
    lastUpdated: priceData?.price?.last_updated || new Date().toISOString(),
    contractAddress: '0x973104fAa7F2B11787557e85953ECA6B4e262328'
  };
};
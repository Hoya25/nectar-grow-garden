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

interface RealTimePriceData {
  price: number;
  last_updated: string;
  source: string;
  error?: string;
}

export const useNCTRPrice = () => {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try the new real-time price feed
      const { data: realtimeData, error: realtimeError } = await supabase.functions.invoke('nctr-price-feed', {
        body: { action: 'get_price' }
      });

      if (!realtimeError && realtimeData) {
        const rtData = realtimeData as RealTimePriceData;
        
        // Convert to the expected format
        const formattedData: PriceData = {
          success: true,
          contract_address: '0x973104fAa7F2B11787557e85953ECA6B4e262328',
          chain_id: 8453, // Base network
          price: {
            price_usd: rtData.price,
            price_change_24h: 0, // TODO: Calculate from historical data
            last_updated: rtData.last_updated
          },
          sources: [{ name: 'DEX', type: rtData.source }],
          cached_at: rtData.last_updated
        };
        
        setPriceData(formattedData);
        console.log(`📊 Real-time NCTR Price: $${rtData.price} (source: ${rtData.source})`);
        return;
      }

      // Fallback to the existing pricing function
      const { data, error } = await supabase.functions.invoke('nctr-pricing', {
        body: { action: 'current' }
      });

      if (error) throw error;

      setPriceData(data);
    } catch (fetchError) {
      console.error('Error fetching NCTR price:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch price');
      
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

  const forceUpdatePrice = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('nctr-price-feed', {
        body: { action: 'update_price' }
      });

      if (error) throw error;

      if (data.success) {
        const formattedData: PriceData = {
          success: true,
          contract_address: '0x973104fAa7F2B11787557e85953ECA6B4e262328',
          chain_id: 8453,
          price: {
            price_usd: data.price,
            price_change_24h: priceData?.price?.price_change_24h || 0,
            last_updated: data.updated_at
          },
          sources: [{ name: 'DEX', type: 'onchain' }],
          cached_at: data.updated_at
        };
        
        setPriceData(formattedData);
        console.log(`🔄 NCTR Price force updated: $${data.price}`);
      }
    } catch (updateError) {
      console.error('Error force updating NCTR price:', updateError);
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

  const formatUSD = (nctrAmount: number): string => {
    const usdValue = calculatePortfolioValue(nctrAmount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(usdValue);
  };

  const formatPrice = (price: number): string => {
    return price.toFixed(2);
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

    // Set up periodic price updates (every 5 minutes for real-time data)
    const interval = setInterval(() => {
      fetchPrice();
    }, 5 * 60 * 1000);

    // Set up real-time updates from database changes
    const subscription = supabase
      .channel('nctr_price_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'nctr_price_cache' },
        (payload) => {
          console.log('🔔 Price update received:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            
            const formattedData: PriceData = {
              success: true,
              contract_address: '0x973104fAa7F2B11787557e85953ECA6B4e262328',
              chain_id: 8453,
              price: {
                price_usd: newData.price_usd,
                price_change_24h: priceData?.price?.price_change_24h || 0,
                last_updated: newData.updated_at
              },
              sources: [{ name: 'DEX', type: newData.source || 'realtime' }],
              cached_at: newData.updated_at
            };
            
            setPriceData(formattedData);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return {
    priceData,
    loading,
    error,
    fetchPrice,
    forceUpdatePrice,
    fetchPriceHistory,
    calculatePortfolioValue,
    formatUSD,
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
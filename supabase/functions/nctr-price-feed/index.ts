import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from "https://esm.sh/ethers@6.7.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Uniswap V3 Pool ABI (minimal - just the functions we need)
const UNISWAP_V3_POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
]

// ERC20 ABI for token decimals
const ERC20_ABI = [
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action } = await req.json().catch(() => ({ action: 'get_price' }))

    if (action === 'get_price') {
      return await getCurrentNCTRPrice(supabaseClient)
    }

    if (action === 'update_price') {
      return await updateNCTRPrice(supabaseClient)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('NCTR price feed error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getCurrentNCTRPrice(supabaseClient: any) {
  try {
    console.log('🔍 Getting current NCTR price...');
    
    // First try to get cached price from database
    const { data: cachedPrice, error } = await supabaseClient
      .from('nctr_price_cache')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && cachedPrice) {
      const lastUpdate = new Date(cachedPrice.updated_at)
      const now = new Date()
      const ageMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

      console.log(`📅 Cached price age: ${ageMinutes.toFixed(1)} minutes`);

      // If price is less than 10 minutes old, return cached version
      if (ageMinutes < 10) {
        console.log(`✅ Returning cached NCTR price: $${cachedPrice.price_usd}`);
        return new Response(
          JSON.stringify({
            price: cachedPrice.price_usd,
            last_updated: cachedPrice.updated_at,
            source: 'cache'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('🔄 Fetching fresh price from sources...');
    
    // Fetch fresh price from multiple sources
    const freshPrice = await fetchOnChainPrice()
    
    // Update cache
    await supabaseClient
      .from('nctr_price_cache')
      .upsert({
        id: cachedPrice?.id || undefined,
        price_usd: freshPrice,
        updated_at: new Date().toISOString(),
        source: 'api_fetch'
      })

    console.log(`✅ Updated NCTR price: $${freshPrice}`);

    return new Response(
      JSON.stringify({
        price: freshPrice,
        last_updated: new Date().toISOString(),
        source: 'fresh'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error getting NCTR price:', error)
    
    // Fallback to last known price if available
    try {
      const { data: fallbackPrice } = await supabaseClient
        .from('nctr_price_cache')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (fallbackPrice) {
        console.log(`🔄 Using fallback price: $${fallbackPrice.price_usd}`);
        return new Response(
          JSON.stringify({
            price: fallbackPrice.price_usd,
            last_updated: fallbackPrice.updated_at,
            source: 'fallback',
            error: 'Using cached price due to fetch error'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }

    // Ultimate fallback - use the user-mentioned price
    const emergencyPrice = 0.088;
    console.log(`🚨 Using emergency fallback price: $${emergencyPrice}`);
    
    return new Response(
      JSON.stringify({ 
        price: emergencyPrice,
        last_updated: new Date().toISOString(),
        source: 'emergency_fallback',
        error: 'All price sources failed, using emergency price'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
}

async function updateNCTRPrice(supabaseClient: any) {
  try {
    console.log('🔄 Manually updating NCTR price...');
    const freshPrice = await fetchOnChainPrice()
    
    await supabaseClient
      .from('nctr_price_cache')
      .upsert({
        price_usd: freshPrice,
        updated_at: new Date().toISOString(),
        source: 'manual_update'
      })

    console.log(`✅ NCTR price manually updated: $${freshPrice}`)

    return new Response(
      JSON.stringify({
        success: true,
        price: freshPrice,
        updated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error updating NCTR price:', error)
    
    // Even if update fails, try to return current cached price
    try {
      const { data: currentPrice } = await supabaseClient
        .from('nctr_price_cache')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (currentPrice) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            current_price: currentPrice.price_usd,
            last_updated: currentPrice.updated_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    } catch (fallbackError) {
      console.error('❌ Could not get fallback price:', fallbackError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error instanceof Error ? error.message : 'Unknown error') || 'Unknown error during price update'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function fetchOnChainPrice(): Promise<number> {
  console.log('🔍 Fetching NCTR price from multiple sources...');
  
  // Try DEXScreener first (most reliable API)
  try {
    const price = await fetchFromDEXScreener();
    if (price > 0) {
      console.log(`✅ Successfully fetched price: $${price}`);
      return price;
    }
  } catch (error) {
    console.log(`⚠️ DEXScreener failed:`, error instanceof Error ? error.message : 'Unknown error');
  }

  // Try CoinGecko as backup API
  try {
    const price = await fetchFromCoinGecko();
    if (price > 0) {
      console.log(`✅ Successfully fetched price: $${price}`);
      return price;
    }
  } catch (error) {
    console.log(`⚠️ CoinGecko failed:`, error instanceof Error ? error.message : 'Unknown error');
  }

  // Skip Uniswap V3 on-chain calls for now due to RPC issues
  console.log('⚠️ Skipping Uniswap V3 due to RPC provider issues');

  // No reliable API sources worked
  throw new Error('All reliable price API sources failed');
}

async function fetchFromDEXScreener(): Promise<number> {
  console.log('📊 Trying DEXScreener API...');
  
  const response = await fetch(
    'https://api.dexscreener.com/latest/dex/tokens/0x973104fAa7F2B11787557e85953ECA6B4e262328',
    { headers: { 'User-Agent': 'NCTR-PriceFeed/1.0' } }
  );
  
  if (!response.ok) {
    throw new Error(`DEXScreener API error: ${response.status}`);
  }
  
  const data = await response.json() as any;
  
  if (data.pairs && data.pairs.length > 0) {
    // Find the most liquid pair (highest volume)
    const bestPair = data.pairs.reduce((best: any, current: any) => {
      const currentVolume = parseFloat(current.volume?.h24 || '0');
      const bestVolume = parseFloat(best.volume?.h24 || '0');
      return currentVolume > bestVolume ? current : best;
    });
    
    const price = parseFloat(bestPair.priceUsd);
    if (price > 0) {
      console.log(`💰 DEXScreener price: $${price} (from ${bestPair.dexId})`);
      return price;
    }
  }
  
  throw new Error('No valid price data from DEXScreener');
}

async function fetchFromCoinGecko(): Promise<number> {
  console.log('🪙 Trying CoinGecko API...');
  
  // Note: CoinGecko might not have NCTR directly, but we can try
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/token_price/base?contract_addresses=0x973104fAa7F2B11787557e85953ECA6B4e262328&vs_currencies=usd',
    { 
      headers: { 
        'User-Agent': 'NCTR-PriceFeed/1.0',
        'Accept': 'application/json'
      } 
    }
  );
  
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  
  const data = await response.json() as any;
  const tokenAddress = '0x973104fAa7F2B11787557e85953ECA6B4e262328'.toLowerCase();
  
  if (data[tokenAddress] && data[tokenAddress].usd) {
    const price = parseFloat(data[tokenAddress].usd);
    if (price > 0) {
      console.log(`💰 CoinGecko price: $${price}`);
      return price;
    }
  }
  
  throw new Error('No valid price data from CoinGecko');
}

async function fetchFromUniswapPool(): Promise<number> {
  console.log('🦄 Trying Uniswap V3 pool...');
  
  // Set up Base network provider
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  // Contract addresses
  const NCTR_TOKEN = '0x973104fAa7F2B11787557e85953ECA6B4e262328';
  const POOL_ADDRESS = '0x3BB64B23b0A1A5E510F67B0Cc1ab0C2F6dC84dD8';
  
  try {
    // Get pool contract
    const poolContract = new ethers.Contract(POOL_ADDRESS, UNISWAP_V3_POOL_ABI, provider);
    
    // Get current price from pool
    const slot0 = await poolContract.slot0();
    const sqrtPriceX96 = slot0[0];
    
    // Get token addresses
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();
    
    console.log(`Pool info: token0=${token0}, token1=${token1}`);
    
    // Get token contracts for decimals
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);
    
    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol()
    ]);
    
    console.log(`Pool tokens: ${token0Symbol} (${token0Decimals} decimals) / ${token1Symbol} (${token1Decimals} decimals)`);
    
    // Calculate price from sqrtPriceX96 (convert to BigInt for division)
    const Q96 = 2n ** 96n;
    const price = (BigInt(sqrtPriceX96) * BigInt(sqrtPriceX96)) / (Q96 * Q96);
    
    // Adjust for decimals
    const decimalsAdjustment = 10n ** BigInt(token0Decimals - token1Decimals);
    const adjustedPrice = price * decimalsAdjustment;
    
    // Convert to number
    let finalPrice = Number(adjustedPrice) / Math.pow(10, Number(token0Decimals));
    
    // Check if NCTR is token0 or token1
    const isNCTRToken0 = token0.toLowerCase() === NCTR_TOKEN.toLowerCase();
    if (!isNCTRToken0) {
      finalPrice = 1 / finalPrice;
    }
    
    console.log(`🦄 Uniswap pool price: $${finalPrice}`);
    
    // Sanity check - if price is too far from expected range, it might be wrong
    if (finalPrice < 0.001 || finalPrice > 1.0) {
      console.log(`⚠️ Price ${finalPrice} seems out of range, might be calculation error`);
      throw new Error(`Calculated price ${finalPrice} seems incorrect`);
    }
    
    return finalPrice;
    
  } catch (error) {
    console.error('❌ Uniswap pool error:', error);
    throw error;
  }
}

async function fetchFallbackPrice(): Promise<number> {
  console.log('🔄 Using fallback price...');
  
  // Based on user feedback, use $0.088 as fallback
  // This should be updated when we have reliable price sources
  const fallbackPrice = 0.088;
  
  console.log(`📌 Fallback price: $${fallbackPrice}`);
  return fallbackPrice;
}
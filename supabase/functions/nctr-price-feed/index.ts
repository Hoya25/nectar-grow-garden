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

      // If price is less than 5 minutes old, return cached version
      if (ageMinutes < 5) {
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

    // Fetch fresh price from on-chain
    const freshPrice = await fetchOnChainPrice()
    
    // Update cache
    await supabaseClient
      .from('nctr_price_cache')
      .upsert({
        price_usd: freshPrice,
        updated_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        price: freshPrice,
        last_updated: new Date().toISOString(),
        source: 'onchain'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting NCTR price:', error)
    
    // Fallback to last known price if available
    const { data: fallbackPrice } = await supabaseClient
      .from('nctr_price_cache')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (fallbackPrice) {
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

    return new Response(
      JSON.stringify({ error: 'Unable to fetch NCTR price' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function updateNCTRPrice(supabaseClient: any) {
  try {
    const freshPrice = await fetchOnChainPrice()
    
    await supabaseClient
      .from('nctr_price_cache')
      .upsert({
        price_usd: freshPrice,
        updated_at: new Date().toISOString()
      })

    console.log(`🔄 NCTR price updated: $${freshPrice}`)

    return new Response(
      JSON.stringify({
        success: true,
        price: freshPrice,
        updated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error updating NCTR price:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function fetchOnChainPrice(): Promise<number> {
  // Set up Base network provider
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
  
  // Contract addresses
  const NCTR_TOKEN = '0x973104fAa7F2B11787557e85953ECA6B4e262328'
  const POOL_ADDRESS = '0x3BB64B23b0A1A5E510F67B0Cc1ab0C2F6dC84dD8' // DEX pool address
  
  try {
    // Get pool contract
    const poolContract = new ethers.Contract(POOL_ADDRESS, UNISWAP_V3_POOL_ABI, provider)
    
    // Get current price from pool
    const slot0 = await poolContract.slot0()
    const sqrtPriceX96 = slot0[0]
    
    // Get token addresses to determine which is token0 and token1
    const token0 = await poolContract.token0()
    const token1 = await poolContract.token1()
    
    // Get token contracts to check decimals
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider)
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider)
    
    const [token0Decimals, token1Decimals, token0Symbol, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol()
    ])
    
    console.log(`Pool tokens: ${token0Symbol} (${token0}) / ${token1Symbol} (${token1})`)
    
    // Calculate price from sqrtPriceX96
    // Price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n
    const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96)
    
    // Adjust for token decimals
    const decimalsAdjustment = 10n ** BigInt(token0Decimals - token1Decimals)
    const adjustedPrice = price * decimalsAdjustment
    
    // Convert to number (price of token1 in terms of token0)
    let finalPrice = Number(adjustedPrice) / Math.pow(10, Number(token0Decimals))
    
    // If NCTR is token1, we need the inverse
    const isNCTRToken0 = token0.toLowerCase() === NCTR_TOKEN.toLowerCase()
    if (!isNCTRToken0) {
      finalPrice = 1 / finalPrice
    }
    
    // If paired with USDC/USDT, this is directly the USD price
    // If paired with ETH, we need to get ETH price (for now, assume direct USD pair)
    
    console.log(`💰 Fetched NCTR price from DEX: $${finalPrice}`)
    
    return Math.max(finalPrice, 0.0001) // Ensure minimum price
    
  } catch (error) {
    console.error('Error fetching from DEX:', error)
    
    // Fallback: try to get price from a simple calculation or default
    // This could be enhanced to try multiple DEXs or price feeds
    throw new Error(`Failed to fetch NCTR price from DEX: ${error.message}`)
  }
}
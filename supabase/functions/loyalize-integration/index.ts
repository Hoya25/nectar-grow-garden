import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoyalizeBrand {
  id: string
  name: string
  description?: string
  logo_url?: string
  commission_rate: number
  category?: string
  website_url?: string
  is_featured: boolean
  affiliate_link?: string
  terms_conditions?: string
}

interface LoyalizeApiResponse {
  brands: Array<{
    id: string
    name: string
    description?: string
    logo_url?: string
    commission_rate: number
    category?: string
    website_url?: string
    featured?: boolean
    affiliate_link?: string
    terms?: string
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const loyalizeApiKey = Deno.env.get('LOYALIZE_API_KEY')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const requestBody = await req.json()
    const { action } = requestBody

    switch (action) {
      case 'sync_brands': {
        console.log('Starting brand synchronization from Loyalize API')
        console.log('API Key present:', loyalizeApiKey ? 'Yes' : 'No')
        
        // Check if API key is configured
        if (!loyalizeApiKey || loyalizeApiKey.trim() === '') {
          console.warn('LOYALIZE_API_KEY not configured, using sample data')
          return await syncSampleBrands(supabase)
        }

        // Try to fetch from live API
        try {
          return await syncFromLoyalizeAPI(loyalizeApiKey, supabase)
        } catch (apiError) {
          console.error('Loyalize API failed, falling back to sample data:', apiError)
          return await syncSampleBrands(supabase, true)
        }
      }

      case 'get_brand_offerings': {
        console.log('Fetching brand offerings from database')
        
        const { data: brands, error: brandsError } = await supabase
          .from('brands')
          .select(`
            id,
            loyalize_id,
            name,
            description,
            logo_url,
            commission_rate,
            nctr_per_dollar,
            category,
            website_url,
            is_active,
            featured,
            created_at,
            updated_at
          `)
          .eq('is_active', true)
          .order('featured', { ascending: false })
          .order('name', { ascending: true })
        
        if (brandsError) {
          console.error('Error fetching brands:', brandsError)
          throw brandsError
        }
        
        console.log(`Retrieved ${brands?.length || 0} active brands`)
        
        return new Response(
          JSON.stringify({
            success: true,
            brands: brands || []
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        )
      }

      case 'create_opportunity_from_brand': {
        const { 
          brand_id, 
          opportunity_type = 'shopping',
          custom_nctr_reward,
          custom_reward_per_dollar,
          min_status = 'starter'
        } = await req.json()
        
        console.log('Creating opportunity from brand:', brand_id)
        
        // Get brand details
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .eq('id', brand_id)
          .single()
        
        if (brandError || !brand) {
          console.error('Brand not found:', brandError)
          throw new Error('Brand not found')
        }
        
        // Create earning opportunity
        const { data: opportunity, error: opportunityError } = await supabase
          .from('earning_opportunities')
          .insert({
            title: `Shop with ${brand.name}`,
            description: brand.description || `Earn NCTR when you shop with ${brand.name}. Get rewarded for every purchase!`,
            opportunity_type,
            nctr_reward: custom_nctr_reward || 0,
            reward_per_dollar: custom_reward_per_dollar || brand.nctr_per_dollar,
            partner_name: brand.name,
            partner_logo_url: brand.logo_url,
            affiliate_link: brand.website_url,
            min_status,
            is_active: true
          })
          .select()
          .single()
        
        if (opportunityError) {
          console.error('Error creating opportunity:', opportunityError)
          throw opportunityError
        }
        
        console.log('Successfully created opportunity:', opportunity.id)
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Created earning opportunity for ${brand.name}`,
            opportunity
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Loyalize integration error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

async function syncFromLoyalizeAPI(apiKey: string, supabase: any): Promise<Response> {
  console.log('🔗 Starting Loyalize API sync with correct endpoint...');
  
  try {
    const endpoint = 'https://api.loyalize.com/v1/stores';
    console.log(`🔄 Fetching from: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      throw new Error(`Loyalize API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.content?.length || 0} stores from Loyalize`);
    
    // Transform store data to brand format
    const transformedBrands = data.content?.map((store: any) => ({
      loyalize_id: store.id?.toString() || '',
      name: store.name || 'Unknown Store',
      description: store.description || `Shop with ${store.name} and earn NCTR rewards`,
      logo_url: store.imageUrl || null,
      commission_rate: store.commission?.value ? (store.commission.format === '%' ? store.commission.value / 100 : store.commission.value) : 0.05,
      nctr_per_dollar: store.commission?.value ? (store.commission.format === '%' ? (store.commission.value / 100) * 0.1 : store.commission.value * 0.1) : 0.005,
      category: store.categories?.[0] || 'General',
      website_url: store.url || null,
      is_active: true,
      featured: false,
    })) || [];
    
    if (transformedBrands.length === 0) {
      console.log('⚠️ No stores found in API response');
      throw new Error('No stores found in API response');
    }
    
    // Upsert to database
    const { data: upsertData, error: upsertError } = await supabase
      .from('brands')
      .upsert(transformedBrands, {
        onConflict: 'loyalize_id',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      throw upsertError;
    }
    
    console.log(`🎉 Successfully synced ${transformedBrands.length} stores from Loyalize API`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `✅ Successfully synced ${transformedBrands.length} brands from Loyalize API`,
      brands_synced: transformedBrands.length,
      total_stores: data.totalElements || 0,
      is_live_data: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('🚫 Loyalize API sync failed:', error);
    throw error;
  }
}

async function syncSampleBrands(supabase: any, isFallback = false) {
  console.log(isFallback ? '🔄 Using fallback gift card data...' : '🔄 Using sample gift card data (API key not configured)...')
  
  const giftCardBrands = [
    {
      loyalize_id: 'gc-amazon-001',
      name: 'Amazon Gift Cards',
      description: 'Digital and physical gift cards for the world\'s largest online retailer. Perfect for any occasion.',
      logo_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.04,
      nctr_per_dollar: 0.004,
      category: 'Gift Cards',
      website_url: 'https://amazon.com/gift-cards',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'gc-apple-001', 
      name: 'Apple Store Gift Cards',
      description: 'Gift cards for Apple products, apps, music, movies, and more from the App Store and iTunes.',
      logo_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.035,
      nctr_per_dollar: 0.0035,
      category: 'Gift Cards',
      website_url: 'https://apple.com/gift-cards',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'gc-target-001',
      name: 'Target Gift Cards',
      description: 'Versatile gift cards for retail shopping, groceries, and online purchases at Target.',  
      logo_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.055,
      nctr_per_dollar: 0.0055,
      category: 'Gift Cards',
      website_url: 'https://target.com/gift-cards',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'gc-visa-001',
      name: 'Visa Prepaid Cards',
      description: 'Flexible prepaid Visa cards accepted everywhere Visa is accepted worldwide.',
      logo_url: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.028,
      nctr_per_dollar: 0.0028,
      category: 'Gift Cards',
      website_url: 'https://usa.visa.com/pay-with-visa/cards/prepaid-cards.html',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'gc-steam-001',
      name: 'Steam Gift Cards',
      description: 'Digital gift cards for gaming, software, and entertainment content on the Steam platform.',
      logo_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.062,
      nctr_per_dollar: 0.0062,
      category: 'Gift Cards',
      website_url: 'https://store.steampowered.com/digitalgiftcards',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'gc-walmart-001',
      name: 'Walmart Gift Cards',
      description: 'Gift cards for America\'s largest retailer - use in-store or online for groceries and more.',
      logo_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.045,
      nctr_per_dollar: 0.0045,
      category: 'Gift Cards',
      website_url: 'https://walmart.com/gift-cards',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'gc-bestbuy-001',
      name: 'Best Buy Gift Cards',
      description: 'Electronics and tech gift cards for the latest gadgets, gaming, and home entertainment.',
      logo_url: 'https://images.unsplash.com/photo-1518414881446-83681961ada4?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.038,
      nctr_per_dollar: 0.0038,
      category: 'Gift Cards',
      website_url: 'https://bestbuy.com/gift-cards',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'gc-starbucks-001',
      name: 'Starbucks Gift Cards',
      description: 'Perfect for coffee lovers - reload and use at any Starbucks location worldwide.',
      logo_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.052,
      nctr_per_dollar: 0.0052,
      category: 'Gift Cards',
      website_url: 'https://starbucks.com/gift-cards',
      is_active: true,
      featured: false,
    }
  ]
  
  const { data: upsertData, error: upsertError } = await supabase
    .from('brands')
    .upsert(giftCardBrands, {
      onConflict: 'loyalize_id',
      ignoreDuplicates: false
    })
  
  if (upsertError) {
    console.error('Error upserting gift card brands:', upsertError)
    throw upsertError
  }
  
  const message = isFallback 
    ? `API unavailable, synced ${giftCardBrands.length} fallback gift card offers`
    : `Successfully synced ${giftCardBrands.length} gift card offers (API key not configured)`
  
  console.log(`✅ ${message}`)
  
  return new Response(
    JSON.stringify({
      success: true,
      message,
      brands_count: giftCardBrands.length,
      is_sample_data: !isFallback,
      is_fallback_data: isFallback,
      brand_types: ['Gift Cards']
    }),
    { 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  )
}
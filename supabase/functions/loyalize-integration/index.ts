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
  console.log(isFallback ? '🔄 Using fallback sample data...' : '🔄 Using sample data (API key not configured)...')
  
  const sampleBrands = [
    {
      loyalize_id: 'sample-fashion-1',
      name: 'Premium Fashion Store',
      description: 'High-end fashion retailer with sustainable and ethically-made clothing',
      logo_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.08,
      nctr_per_dollar: 0.008,
      category: 'Fashion & Apparel',
      website_url: 'https://example-fashion.com',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'sample-tech-1', 
      name: 'Tech Electronics Hub',
      description: 'Latest gadgets, smartphones, and tech accessories with competitive prices',
      logo_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.05,
      nctr_per_dollar: 0.005,
      category: 'Electronics & Technology',
      website_url: 'https://example-tech.com',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'sample-home-1',
      name: 'Home & Garden Plus',
      description: 'Everything for your home improvement and gardening needs',  
      logo_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.06,
      nctr_per_dollar: 0.006,
      category: 'Home & Garden',
      website_url: 'https://example-home.com',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'sample-beauty-1',
      name: 'Beauty & Wellness',
      description: 'Premium beauty products and wellness essentials',
      logo_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.07,
      nctr_per_dollar: 0.007,
      category: 'Beauty & Personal Care',
      website_url: 'https://example-beauty.com',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'sample-sports-1',
      name: 'Active Sports Gear',
      description: 'Sports equipment and athletic wear for all fitness levels',
      logo_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=center',
      commission_rate: 0.055,
      nctr_per_dollar: 0.0055,
      category: 'Sports & Fitness',
      website_url: 'https://example-sports.com',
      is_active: true,
      featured: false,
    }
  ]
  
  const { data: upsertData, error: upsertError } = await supabase
    .from('brands')
    .upsert(sampleBrands, {
      onConflict: 'loyalize_id',
      ignoreDuplicates: false
    })
  
  if (upsertError) {
    console.error('Error upserting sample brands:', upsertError)
    throw upsertError
  }
  
  const message = isFallback 
    ? `API unavailable, synced ${sampleBrands.length} fallback brands`
    : `Successfully synced ${sampleBrands.length} sample brands (API key not configured)`
  
  console.log(`✅ ${message}`)
  
  return new Response(
    JSON.stringify({
      success: true,
      message,
      brands_count: sampleBrands.length,
      is_sample_data: !isFallback,
      is_fallback_data: isFallback
    }),
    { 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  )
}
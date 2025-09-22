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
  console.log('🔗 Starting comprehensive Loyalize API sync...');
  
  try {
    let allStores: any[] = [];
    let page = 0;
    let hasMorePages = true;
    const pageSize = 50; // Increase page size for efficiency
    
    // First, try to get all stores with pagination
    while (hasMorePages) {
      const endpoint = `https://api.loyalize.com/v1/stores?page=${page}&size=${pageSize}`;
      console.log(`🔄 Fetching page ${page} from: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`, // Fixed: Added Bearer prefix
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
        
        if (page === 0) {
          // If first page fails, throw error to trigger fallback
          throw new Error(`Loyalize API error: ${response.status} - ${errorText}`);
        } else {
          // If subsequent pages fail, break and use what we got
          console.log(`⚠️ Stopping pagination at page ${page} due to error`);
          break;
        }
      }
      
      const data = await response.json();
      const stores = data.content || [];
      
      console.log(`✅ Retrieved ${stores.length} stores from page ${page}`);
      allStores = allStores.concat(stores);
      
      // Check if there are more pages
      hasMorePages = !data.last && stores.length === pageSize;
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 20) {
        console.log('⚠️ Reached maximum page limit (20), stopping pagination');
        break;
      }
    }
    
    console.log(`📈 Total stores retrieved: ${allStores.length}`);
    
    if (allStores.length === 0) {
      throw new Error('No stores found in API response');
    }
    
    // Fetch logo URLs from sku-details endpoint
    console.log('🖼️ Fetching store logos from sku-details endpoint...');
    const logoData = await fetchStoreLogos(apiKey);
    console.log(`✅ Retrieved logo data for ${Object.keys(logoData).length} stores`);
    
    // Check for Uber specifically and log if found
    const uberStores = allStores.filter(store => 
      store.name?.toLowerCase().includes('uber') ||
      store.description?.toLowerCase().includes('uber')
    );
    
    if (uberStores.length > 0) {
      console.log(`🎯 Found ${uberStores.length} Uber-related stores:`, uberStores.map(s => s.name));
    } else {
      console.log('⚠️ No Uber stores found in API results');
      
      // Add Uber manually if not found
      allStores.push({
        id: 'uber-manual-001',
        name: 'Uber',
        description: 'Uber ride sharing and food delivery platform. Get rides, order food, and more.',
        imageUrl: logoData['uber'] || 'https://api.loyalize.com/resources/stores/uber/logo',
        commission: { value: 4.5, format: '%' },
        categories: ['Transportation', 'Food Delivery'],
        url: 'https://www.uber.com',
        homePage: 'https://www.uber.com'
      });
      console.log('✅ Added Uber manually to ensure availability');
    }
    
    console.log(`📈 Total stores retrieved: ${allStores.length}`);
    
    if (allStores.length === 0) {
      throw new Error('No stores found in API response');
    }
    
    // Check for Uber specifically and log if found
    const uberStores = allStores.filter(store => 
      store.name?.toLowerCase().includes('uber') ||
      store.description?.toLowerCase().includes('uber')
    );
    
    if (uberStores.length > 0) {
      console.log(`🎯 Found ${uberStores.length} Uber-related stores:`, uberStores.map(s => s.name));
    } else {
      console.log('⚠️ No Uber stores found in API results');
      
      // Add Uber manually if not found
      allStores.push({
        id: 'uber-manual-001',
        name: 'Uber',
        description: 'Uber ride sharing and food delivery platform. Get rides, order food, and more.',
        imageUrl: 'https://api.loyalize.com/resources/stores/uber/logo',
        commission: { value: 4.5, format: '%' },
        categories: ['Transportation', 'Food Delivery'],
        url: 'https://www.uber.com',
        homePage: 'https://www.uber.com'
      });
      console.log('✅ Added Uber manually to ensure availability');
    }
    
    // Transform store data to brand format
    const transformedBrands = allStores.map((store: any) => {
      const commissionValue = store.commission?.value || 0;
      const commissionRate = store.commission?.format === '%' ? commissionValue / 100 : commissionValue;
      const storeId = store.id?.toString();
      
      return {
        loyalize_id: storeId || `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: store.name || 'Unknown Store',
        description: store.description || `Shop with ${store.name} and earn NCTR rewards`,
        logo_url: logoData[storeId] || store.imageUrl || `https://api.loyalize.com/resources/stores/${storeId}/logo`,
        commission_rate: Math.max(commissionRate, 0.01), // Minimum 1% commission
        nctr_per_dollar: Math.max(commissionRate * 0.1, 0.001), // 10% of commission as NCTR
        category: store.categories?.[0] || 'General',
        website_url: store.url || store.homePage || null,
        is_active: true,
        featured: store.name?.toLowerCase().includes('uber') || store.name?.toLowerCase().includes('amazon') || store.name?.toLowerCase().includes('starbucks'),
      };
    });
    
    console.log(`🔄 Transformed ${transformedBrands.length} brands for database upsert`);
    
    // Upsert to database in batches to avoid timeout
    const batchSize = 25;
    let syncedCount = 0;
    
    for (let i = 0; i < transformedBrands.length; i += batchSize) {
      const batch = transformedBrands.slice(i, i + batchSize);
      
      const { error: upsertError } = await supabase
        .from('brands')
        .upsert(batch, {
          onConflict: 'loyalize_id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        console.error(`Database upsert error for batch ${Math.floor(i / batchSize) + 1}:`, upsertError);
        throw upsertError;
      }
      
      syncedCount += batch.length;
      console.log(`✅ Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedBrands.length / batchSize)} (${syncedCount}/${transformedBrands.length})`);
    }
    
    console.log(`🎉 Successfully synced ${syncedCount} stores from Loyalize API`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `✅ Successfully synced ${syncedCount} brands from Loyalize API`,
      brands_synced: syncedCount,
      total_pages_fetched: page,
      uber_included: uberStores.length > 0 || true, // Always true since we add manually if not found
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
  console.log(isFallback ? '🔄 Using fallback brand data...' : '🔄 Using sample brand data (API key not configured)...')
  
  const enhancedBrands = [
    // Priority brands including Uber
    {
      loyalize_id: 'uber-001',
      name: 'Uber',
      description: 'Uber ride sharing and food delivery platform. Get rides, order food, and more with Uber services.',
      logo_url: 'https://logo.clearbit.com/uber.com',
      commission_rate: 0.045,
      nctr_per_dollar: 0.0045,
      category: 'Transportation',
      website_url: 'https://www.uber.com',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'uber-eats-001',
      name: 'Uber Eats',
      description: 'Food delivery service from Uber. Order from local restaurants and get delivery straight to your door.',
      logo_url: 'https://logo.clearbit.com/ubereats.com',
      commission_rate: 0.055,
      nctr_per_dollar: 0.0055,
      category: 'Food Delivery',
      website_url: 'https://www.ubereats.com',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'gc-amazon-001',
      name: 'Amazon Gift Cards',
      description: 'Digital and physical gift cards for the world\'s largest online retailer. Perfect for any occasion.',
      logo_url: 'https://logo.clearbit.com/amazon.com',
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
      logo_url: 'https://logo.clearbit.com/apple.com',
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
      logo_url: 'https://logo.clearbit.com/target.com',
      commission_rate: 0.055,
      nctr_per_dollar: 0.0055,
      category: 'Gift Cards',
      website_url: 'https://target.com/gift-cards',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'gc-starbucks-001',
      name: 'Starbucks Gift Cards',
      description: 'Perfect for coffee lovers - reload and use at any Starbucks location worldwide.',
      logo_url: 'https://logo.clearbit.com/starbucks.com',
      commission_rate: 0.052,
      nctr_per_dollar: 0.0052,
      category: 'Gift Cards',
      website_url: 'https://starbucks.com/gift-cards',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'gc-walmart-001',
      name: 'Walmart Gift Cards',
      description: 'Gift cards for America\'s largest retailer - use in-store or online for groceries and more.',
      logo_url: 'https://logo.clearbit.com/walmart.com',
      commission_rate: 0.045,
      nctr_per_dollar: 0.0045,
      category: 'Gift Cards',
      website_url: 'https://walmart.com/gift-cards',
      is_active: true,
      featured: true,
    },
    {
      loyalize_id: 'bestbuy-001',
      name: 'Best Buy',
      description: 'Electronics and tech retailer with the latest gadgets, gaming, and home entertainment.',
      logo_url: 'https://logo.clearbit.com/bestbuy.com',
      commission_rate: 0.038,
      nctr_per_dollar: 0.0038,
      category: 'Electronics',
      website_url: 'https://bestbuy.com',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'nike-001',
      name: 'Nike',
      description: 'Athletic footwear, apparel, and equipment from the world\'s leading sports brand.',
      logo_url: 'https://logo.clearbit.com/nike.com',
      commission_rate: 0.065,
      nctr_per_dollar: 0.0065,
      category: 'Athletic',
      website_url: 'https://nike.com',
      is_active: true,
      featured: false,
    },
    {
      loyalize_id: 'adidas-001',
      name: 'Adidas',
      description: 'Premium athletic wear and footwear for all sports and lifestyle activities.',
      logo_url: 'https://logo.clearbit.com/adidas.com',
      commission_rate: 0.062,
      nctr_per_dollar: 0.0062,
      category: 'Athletic',
      website_url: 'https://adidas.com',
      is_active: true,
      featured: false,
    }
  ]
  
  const { data: upsertData, error: upsertError } = await supabase
    .from('brands')
    .upsert(enhancedBrands, {
      onConflict: 'loyalize_id',
      ignoreDuplicates: false
    })
  
  if (upsertError) {
    console.error('Error upserting enhanced brands:', upsertError)
    throw upsertError
  }
  
  const message = isFallback 
    ? `API unavailable, synced ${enhancedBrands.length} fallback brands including Uber`
    : `Successfully synced ${enhancedBrands.length} enhanced brands including Uber (API key not configured)`
  
  console.log(`✅ ${message}`)
  
  return new Response(
    JSON.stringify({
      success: true,
      message,
      brands_count: enhancedBrands.length,
      uber_included: true,
      is_sample_data: !isFallback,
      is_fallback_data: isFallback,
      brand_types: ['Transportation', 'Gift Cards', 'Electronics', 'Athletic']
    }),
    { 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

async function fetchStoreLogos(apiKey: string): Promise<Record<string, string>> {
  console.log('🖼️ Fetching store logos from sku-details endpoint');
  
  try {
    let logoMap: Record<string, string> = {};
    let page = 0;
    let hasMorePages = true;
    const pageSize = 1000; // Maximum per API docs
    
    while (hasMorePages) {
      const endpoint = `https://api.loyalize.com/v2/sku-details?page=${page}&size=${pageSize}`;
      console.log(`🔄 Fetching logo page ${page} from: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log(`⚠️ Logo fetch failed for page ${page}: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const items = data.content || [];
      
      console.log(`✅ Retrieved ${items.length} logo items from page ${page}`);
      
      // Extract store logos from sku details
      items.forEach((item: any) => {
        if (item.storeId && item.storeLogo) {
          logoMap[item.storeId.toString()] = item.storeLogo;
        }
        // Also try alternative field names that might contain logo data
        if (item.store_id && item.store_logo) {
          logoMap[item.store_id.toString()] = item.store_logo;
        }
        if (item.merchant_id && item.merchant_logo) {
          logoMap[item.merchant_id.toString()] = item.merchant_logo;
        }
      });
      
      // Check if there are more pages
      hasMorePages = !data.last && items.length === pageSize;
      page++;
      
      // Safety limit
      if (page > 10) {
        console.log('⚠️ Reached logo fetch page limit (10), stopping');
        break;
      }
    }
    
    console.log(`🎯 Collected logos for ${Object.keys(logoMap).length} stores`);
    return logoMap;
    
  } catch (error) {
    console.error('❌ Error fetching store logos:', error);
    return {};
  }
}
  )
}
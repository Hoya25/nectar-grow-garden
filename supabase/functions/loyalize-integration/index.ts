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

  let requestBody: any = null;
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    const loyalizeApiKey = Deno.env.get('LOYALIZE_API_KEY')
    
    requestBody = await req.json()
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
          console.error('🚫 Loyalize API sync failed:', apiError)
          console.log('🔄 Using fallback brand data...')
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
            reward_per_dollar: custom_reward_per_dollar || 100.0, // Default 100 NCTR per $1, independent of commission
            partner_name: brand.name,
            partner_logo_url: brand.logo_url,
            affiliate_link: generateTrackingUrl(brand.website_url, 'USER_PLACEHOLDER', brand.loyalize_id),
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
    
    // For sync_brands action, try emergency fallback
    if (requestBody?.action === 'sync_brands') {
      try {
        console.log('Attempting emergency fallback to sample data...')
        return await syncSampleBrands(supabase, true)
      } catch (fallbackError) {
        console.error('Emergency fallback also failed:', fallbackError)
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Internal server error',
        brands_count: 0,
        fallback_attempted: requestBody?.action === 'sync_brands'
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
    const maxPageSize = 1000;
    
    // Fetch all stores with pagination using ONLY the correct auth method
    while (hasMorePages) {
      const endpoint = `https://api.loyalize.com/v1/stores?page=${page}&size=${maxPageSize}`;
      
      console.log(`🔄 Fetching page ${page} from: ${endpoint}`);
      console.log(`🔑 Using API key: ${apiKey ? 'Present (length: ' + apiKey.length + ')' : 'Missing'}`);
      
      // Use ONLY the authentication method confirmed by Loyalize support
      const authHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey // Direct Authorization header as confirmed by support
      };
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders
      });
      
      console.log(`📊 API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
        console.error(`❌ Error response body:`, errorText);
        console.error(`❌ Request URL:`, endpoint);
        
        // Throw error for fallback
        throw new Error(`Loyalize API failed: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const data = await response.json().catch((err) => {
        console.error('❌ Failed to parse JSON response:', err);
        throw new Error('Invalid JSON response from Loyalize API');
      });
      
      console.log(`📊 API Response Structure:`, {
        hasContent: !!data.content,
        contentLength: data.content?.length || 0,
        isLast: data.last,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        currentPage: data.number,
        pageSize: data.size
      });
      
      const stores = data.content || [];
      
      console.log(`✅ Retrieved ${stores.length} stores from page ${page} (Total so far: ${allStores.length + stores.length})`);
      allStores = allStores.concat(stores);
      
      // Check if there are more pages
      hasMorePages = !data.last && stores.length > 0 && (data.totalPages ? page < data.totalPages - 1 : stores.length === maxPageSize);
      page++;
      
      // Safety check to prevent infinite loops
      if (page > 10) {
        console.log('⚠️ Safety limit reached - stopping at page 10');
        break;
      }
    }
    
    console.log(`🎯 FINAL RESULT: Retrieved ${allStores.length} total stores from ${page} pages`);
    
    // Also try to fetch gift card specific endpoint if available
    try {
      console.log('🎁 Attempting to fetch gift cards from dedicated endpoint...');
      const giftCardResponse = await fetch('https://api.loyalize.com/v1/gift-cards?size=500', {
        method: 'GET',
        headers: {
          'Authorization': apiKey, // Correct Loyalize auth format per support
          'Content-Type': 'application/json'
        }
      });
      
      if (giftCardResponse.ok) {
        const giftCardData = await giftCardResponse.json();
        const giftCards = giftCardData.content || giftCardData || [];
        console.log(`🎁 Found ${giftCards.length} additional gift cards`);
        
        // Transform gift cards to store format and add them
        const transformedGiftCards = giftCards.map((gc: any) => ({
          ...gc,
          categories: [...(gc.categories || []), 'Gift Cards'],
          name: gc.name + (gc.name.toLowerCase().includes('gift') ? '' : ' Gift Cards')
        }));
        
        allStores = allStores.concat(transformedGiftCards);
        console.log(`✅ Total after adding gift cards: ${allStores.length}`);
      }
    } catch (giftCardError) {
      console.log('ℹ️ Gift card endpoint not available or failed:', (giftCardError as Error).message);
    }
    
    if (allStores.length === 0) {
      throw new Error('No stores found in API response');
    }
    
    // Fetch logo URLs from sku-details endpoint
    console.log('🖼️ Fetching store logos from sku-details endpoint...');
    const logoData = await fetchStoreLogos(apiKey);
    console.log(`✅ Retrieved logo data for ${Object.keys(logoData).length} stores`);
    
    // Check for priority gift card brands specifically and add manually if not found
    const foundUberStores = allStores.filter(store => 
      store.name?.toLowerCase().includes('uber') ||
      store.description?.toLowerCase().includes('uber')
    );
    
    const foundAirbnbStores = allStores.filter(store => 
      store.name?.toLowerCase().includes('airbnb') ||
      store.description?.toLowerCase().includes('airbnb')
    );
    
    const foundAppleStores = allStores.filter(store => 
      (store.name?.toLowerCase().includes('apple') && store.name?.toLowerCase().includes('gift')) ||
      store.description?.toLowerCase().includes('apple gift')
    );
    
    const foundAmazonStores = allStores.filter(store => 
      (store.name?.toLowerCase().includes('amazon') && store.name?.toLowerCase().includes('gift')) ||
      store.description?.toLowerCase().includes('amazon gift')
    );
    
    if (foundUberStores.length > 0) {
      console.log(`🎯 Found ${foundUberStores.length} Uber-related stores:`, foundUberStores.map(s => s.name));
    } else {
      console.log('⚠️ No Uber stores found in API results');
      
      // Add Uber Gift Cards manually if not found
      allStores.push({
        id: 'uber-gift-cards-manual-001',
        name: 'Uber Gift Cards',
        description: 'Purchase Uber gift cards through MyGiftCardsPlus and earn up to 1% cashback. Perfect for rides and food delivery.',
        imageUrl: logoData['uber'] || 'https://logo.clearbit.com/uber.com',
        commission: { value: 1.0, format: '%' },
        categories: ['Gift Cards', 'Transportation'],
        url: 'https://www.mygiftcardsplus.com/buy/Uber-USADIG3RDB2BVAR',
        homePage: 'https://www.mygiftcardsplus.com/buy/Uber-USADIG3RDB2BVAR'
      });
      console.log('✅ Added Uber Gift Cards manually to ensure availability');
    }
    
    if (foundAirbnbStores.length > 0) {
      console.log(`🎯 Found ${foundAirbnbStores.length} Airbnb-related stores:`, foundAirbnbStores.map(s => s.name));
    } else {
      console.log('⚠️ No Airbnb stores found in API results');
      
      // Add Airbnb Gift Cards manually if not found
      allStores.push({
        id: 'airbnb-gift-cards-manual-001',
        name: 'Airbnb Gift Cards',
        description: 'Purchase Airbnb gift cards and earn up to 2% cashback. Perfect for travel accommodations worldwide.',
        imageUrl: logoData['airbnb'] || 'https://logo.clearbit.com/airbnb.com',
        commission: { value: 2.0, format: '%' },
        categories: ['Gift Cards', 'Travel'],
        url: 'https://www.mygiftcardsplus.com/airbnb-gift-cards',
        homePage: 'https://www.mygiftcardsplus.com/airbnb-gift-cards'
      });
      console.log('✅ Added Airbnb Gift Cards manually to ensure availability');
    }
    
    // Verify Apple Gift Cards have correct commission rate (should be 2.5%)
    if (foundAppleStores.length > 0) {
      console.log(`🎯 Found ${foundAppleStores.length} Apple Gift Card stores:`, foundAppleStores.map(s => s.name));
      foundAppleStores.forEach(store => {
        if (store.commission?.value < 2.5) {
          console.log(`📈 Updating Apple Gift Card commission from ${store.commission?.value}% to 2.5%`);
          store.commission = { value: 2.5, format: '%' };
        }
      });
    } else {
      console.log('⚠️ No Apple Gift Card stores found in API results');
      
      // Add Apple Gift Cards manually with correct commission
      allStores.push({
        id: 'apple-gift-cards-manual-001',
        name: 'Apple Gift Cards',
        description: 'Apple Store gift cards for apps, music, movies, and Apple products. Earn up to 2.5% cashback.',
        imageUrl: logoData['apple'] || 'https://logo.clearbit.com/apple.com',
        commission: { value: 2.5, format: '%' },
        categories: ['Gift Cards', 'Technology'],
        url: 'https://www.mygiftcardsplus.com/apple-gift-cards',
        homePage: 'https://www.mygiftcardsplus.com/apple-gift-cards'
      });
      console.log('✅ Added Apple Gift Cards manually with correct 2.5% commission');
    }
    
    // Verify Amazon Gift Cards have correct commission rate (should be 3.5%)
    if (foundAmazonStores.length > 0) {
      console.log(`🎯 Found ${foundAmazonStores.length} Amazon Gift Card stores:`, foundAmazonStores.map(s => s.name));
      foundAmazonStores.forEach(store => {
        if (store.commission?.value < 3.5) {
          console.log(`📈 Updating Amazon Gift Card commission from ${store.commission?.value}% to 3.5%`);
          store.commission = { value: 3.5, format: '%' };
        }
      });
    } else {
      console.log('⚠️ No Amazon Gift Card stores found in API results');
      
      // Add Amazon Gift Cards manually with correct commission
      allStores.push({
        id: 'amazon-gift-cards-manual-001',
        name: 'Amazon Gift Cards',
        description: 'Amazon gift cards for the world\'s largest online marketplace. Earn up to 3.5% cashback.',
        imageUrl: logoData['amazon'] || 'https://logo.clearbit.com/amazon.com',
        commission: { value: 3.5, format: '%' },
        categories: ['Gift Cards', 'Shopping'],
        url: 'https://www.mygiftcardsplus.com/amazon-gift-cards',
        homePage: 'https://www.mygiftcardsplus.com/amazon-gift-cards'
      });
      console.log('✅ Added Amazon Gift Cards manually with correct 3.5% commission');
    }
    
    console.log(`📈 Total stores retrieved: ${allStores.length}`);
    
    if (allStores.length === 0) {
      throw new Error('No stores found in API response');
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
        commission_rate: Math.min(Math.max(commissionRate, 0.0001), 999999.9999), // Max 999,999.9999 for NUMERIC(10,4)
        nctr_per_dollar: Math.min(100.0, 999999.9999), // Default 100.0, max 999,999.9999 for NUMERIC(10,4)
        category: store.categories?.[0] || 'General',
        website_url: store.url || store.homePage || null,
        is_active: true,
        featured: store.name?.toLowerCase().includes('uber') || 
                 store.name?.toLowerCase().includes('airbnb') ||
                 store.name?.toLowerCase().includes('amazon') || 
                 store.name?.toLowerCase().includes('apple') ||
                 store.name?.toLowerCase().includes('starbucks'),
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
      brands_count: syncedCount,
      brands_synced: syncedCount,
      total_pages_fetched: page,
      uber_gift_cards_included: foundUberStores.length > 0 || true, // Always true since we add manually if not found
      airbnb_gift_cards_included: foundAirbnbStores.length > 0 || true, // Always true since we add manually if not found
      apple_gift_cards_included: foundAppleStores.length > 0 || true, // Always true since we add manually if not found
      amazon_gift_cards_included: foundAmazonStores.length > 0 || true, // Always true since we add manually if not found
      is_sample_data: false,
      is_fallback_data: false
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
    // Priority brands including Uber Gift Cards
    {
      loyalize_id: 'uber-gift-cards-001',
      name: 'Uber Gift Cards',
      description: 'Purchase Uber gift cards for rides and food delivery. Get up to 1% cashback on gift card purchases through MyGiftCardsPlus.',
      logo_url: 'https://logo.clearbit.com/uber.com',
      commission_rate: 0.01, // 1%
      nctr_per_dollar: 100.0,
      category: 'Gift Cards',
      website_url: 'https://www.mygiftcardsplus.com/buy/Uber-USADIG3RDB2BVAR',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'uber-001',
      name: 'Uber',
      description: 'Uber ride sharing and food delivery platform. Get rides, order food, and more with Uber services.',
      logo_url: 'https://logo.clearbit.com/uber.com',
      commission_rate: 0.045, // 4.5%
      nctr_per_dollar: 0.0045,
      category: 'Transportation',
      website_url: 'https://www.uber.com',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'uber-eats-001',
      name: 'Uber Eats',
      description: 'Food delivery service from Uber. Order from local restaurants and get delivery straight to your door.',
      logo_url: 'https://logo.clearbit.com/ubereats.com',
      commission_rate: 0.055, // 5.5%
      nctr_per_dollar: 0.0055,
      category: 'Food Delivery',
      website_url: 'https://www.ubereats.com',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'amazon-gc-001',
      name: 'Amazon Gift Cards',
      description: 'Digital and physical gift cards for the world\'s largest online retailer. Perfect for any occasion.',
      logo_url: 'https://logo.clearbit.com/amazon.com',
      commission_rate: 0.035, // 3.5% - Updated commission rate
      nctr_per_dollar: 100.0,
      category: 'Gift Cards',
      website_url: 'https://amazon.com/gift-cards',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'starbucks-gc-001',
      name: 'Starbucks Gift Cards',
      description: 'Perfect for coffee lovers - reload and use at any Starbucks location worldwide.',
      logo_url: 'https://logo.clearbit.com/starbucks.com',
      commission_rate: 0.052, // 5.2%
      nctr_per_dollar: 100.0,
      category: 'Gift Cards',
      website_url: 'https://starbucks.com/gift-cards',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'walmart-gc-001',
      name: 'Walmart Gift Cards',
      description: 'Gift cards for America\'s largest retailer - use in-store or online for groceries and more.',
      logo_url: 'https://logo.clearbit.com/walmart.com',
      commission_rate: 0.045, // 4.5%
      nctr_per_dollar: 100.0,
      category: 'Gift Cards',
      website_url: 'https://walmart.com/gift-cards',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'apple-gc-001',
      name: 'Apple Store Gift Cards',
      description: 'Gift cards for Apple products, apps, music, movies, and more from the App Store and iTunes.',
      logo_url: 'https://logo.clearbit.com/apple.com',
      commission_rate: 0.025, // 2.5% - Updated commission rate
      nctr_per_dollar: 100.0,
      category: 'Gift Cards',
      website_url: 'https://apple.com/gift-cards',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'airbnb-gc-001',
      name: 'Airbnb Gift Cards',
      description: 'Gift cards for unique travel accommodations and experiences worldwide through Airbnb.',
      logo_url: 'https://logo.clearbit.com/airbnb.com',
      commission_rate: 0.02, // 2.0% - Airbnb gift card commission
      nctr_per_dollar: 100.0,
      category: 'Gift Cards',
      website_url: 'https://airbnb.com/gift-cards',
      is_active: true,
      featured: true
    },
    {
      loyalize_id: 'bestbuy-001',
      name: 'Best Buy',
      description: 'Electronics and tech retailer with the latest gadgets, gaming, and home entertainment.',
      logo_url: 'https://logo.clearbit.com/bestbuy.com',
      commission_rate: 0.038, // 3.8%
      nctr_per_dollar: 100.0,
      category: 'Electronics',
      website_url: 'https://bestbuy.com',
      is_active: true,
      featured: false
    },
    {
      loyalize_id: 'adidas-001',
      name: 'Adidas',
      description: 'Premium athletic wear and footwear for all sports and lifestyle activities.',
      logo_url: 'https://logo.clearbit.com/adidas.com',
      commission_rate: 0.062, // 6.2%
      nctr_per_dollar: 100.0,
      category: 'Athletic',
      website_url: 'https://adidas.com',
      is_active: true,
      featured: false
    }
  ];
  
  console.log(`🔄 Upserting ${enhancedBrands.length} sample/fallback brands...`);
  
  const { error: upsertError } = await supabase
    .from('brands')
    .upsert(enhancedBrands, {
      onConflict: 'loyalize_id',
      ignoreDuplicates: false
    });
  
  if (upsertError) {
    console.error('Database upsert error:', upsertError);
    throw upsertError;
  }
  
  console.log(`✅ ${isFallback ? 'API unavailable, synced' : 'Successfully synced'} ${enhancedBrands.length} ${isFallback ? 'fallback' : 'sample'} brands including Uber`);
  
  return new Response(JSON.stringify({
    success: true,
    message: `${isFallback ? 'API unavailable, synced' : 'Successfully synced'} ${enhancedBrands.length} ${isFallback ? 'fallback' : 'sample'} brands including Uber`,
    brands_count: enhancedBrands.length,
    brands_synced: enhancedBrands.length,
    uber_gift_cards_included: true,
    airbnb_gift_cards_included: true,
    apple_gift_cards_included: true,
    amazon_gift_cards_included: true,
    is_sample_data: !isFallback,
    is_fallback_data: isFallback,
    brand_types: [...new Set(enhancedBrands.map(b => b.category))]
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function generateTrackingUrl(baseUrl: string, userId: string, storeId: string, subId?: string): string {
  if (!baseUrl) return '#';
  
  const url = new URL(baseUrl);
  url.searchParams.set('ref', 'nctr_platform');
  url.searchParams.set('source', storeId);
  url.searchParams.set('user_id', userId);
  
  if (subId) {
    url.searchParams.set('sub_id', subId);
  }
  
  return url.toString();
}

async function fetchStoreLogos(apiKey: string): Promise<Record<string, string>> {
  const logoMap: Record<string, string> = {};
  
  try {
    let page = 0;
    let hasMorePages = true;
    const pageSize = 1000; // Maximum per API docs
    
    while (hasMorePages) {
      const endpoint = `https://api.loyalize.com/v2/sku-details?page=${page}&size=${pageSize}`;
      console.log(`🔄 Fetching logo page ${page} from: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': apiKey, // Correct Loyalize auth format per support
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log(`⚠️ Logo fetch failed for page ${page}: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const skuDetails = data.content || data || [];
      
      // Extract store logos from SKU details
      skuDetails.forEach((sku: any) => {
        if (sku.storeId && sku.storeLogo) {
          logoMap[sku.storeId.toString()] = sku.storeLogo;
        }
      });
      
      console.log(`✅ Processed ${skuDetails.length} SKUs from page ${page}, total logos: ${Object.keys(logoMap).length}`);
      
      // Check pagination
      hasMorePages = !data.last && skuDetails.length === pageSize;
      page++;
      
      // Safety limit
      if (page >= 5) {
        console.log('⚠️ Reached logo fetch page limit (5)');
        break;
      }
    }
    
    console.log(`🖼️ Total logos collected: ${Object.keys(logoMap).length}`);
    return logoMap;
    
  } catch (error) {
    console.error('❌ Error fetching store logos:', error);
    return {};
  }
}
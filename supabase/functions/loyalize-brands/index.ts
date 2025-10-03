import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoyalizeBrand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  category?: string;
  commission_rate: number;
  status: string;
}

interface LoyalizeSearchParams {
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const loyalizeApiKey = Deno.env.get('LOYALIZE_API_KEY');
    if (!loyalizeApiKey) {
      throw new Error('LOYALIZE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request data - support both URL params and body
    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    let brandId = url.searchParams.get('brand_id');
    
    // Try to get from request body if not in URL
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        action = body.action || action || 'search';
        brandId = body.brand_id || brandId;
      } catch {
        action = action || 'search';
      }
    } else {
      action = action || 'search';
    }

    switch (action) {
      case 'search':
        return await searchBrands(req, loyalizeApiKey);
      
      case 'import':
        return await importBrand(req, loyalizeApiKey, supabase);
      
      case 'sync':
        return await syncAllBrands(loyalizeApiKey, supabase);
      
      case 'get_brand_details':
        if (!brandId) {
          throw new Error('brand_id is required for get_brand_details action');
        }
        return await getBrandDetails(brandId, loyalizeApiKey);
      
      default:
        throw new Error('Invalid action. Supported: search, import, sync, get_brand_details');
    }

  } catch (error) {
    console.error('Error in loyalize-brands function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function searchBrands(req: Request, apiKey: string): Promise<Response> {
  const url = new URL(req.url);
  const query = url.searchParams.get('query') || '';
  const category = url.searchParams.get('category') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const countries = url.searchParams.get('countries') || 'US';

  try {
    console.log(`🔍 Searching stores: query="${query}", category="${category}"`);
    
    // For gift card searches, try multiple search variations
    const searchTerms = [query];
    if (query.toLowerCase().includes('gift')) {
      searchTerms.push(`${query} gift card`, `${query} gift cards`);
    }
    if (query.toLowerCase() === 'uber' || query.toLowerCase().includes('uber gift')) {
      searchTerms.push('uber gift card', 'uber gift cards', 'uber eats gift card');
    }
    
    let allResults: any[] = [];
    
    // Try each search term
    for (const searchTerm of searchTerms) {
      const endpoint = 'https://api.loyalize.com/v1/stores/search';
      const searchUrl = new URL(endpoint);
      
      // Add query parameters according to API docs
      if (searchTerm) searchUrl.searchParams.set('term', searchTerm);
      searchUrl.searchParams.set('size', limit.toString());
      searchUrl.searchParams.set('page', Math.floor(offset / limit).toString());
      searchUrl.searchParams.set('countries', countries);

      const response = await fetch(searchUrl.toString(), {
        headers: {
          'Authorization': apiKey, // Correct Loyalize auth format per support
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found ${data.content?.length || 0} stores for "${searchTerm}"`);
        
        if (data.content && data.content.length > 0) {
          allResults = allResults.concat(data.content);
        }
      } else {
        console.log(`⚠️ Search failed for "${searchTerm}": ${response.status}`);
      }
    }

    // Remove duplicates based on store ID
    const uniqueResults = Array.from(
      new Map(allResults.map(store => [store.id, store])).values()
    );

    console.log(`🎯 Total unique results found: ${uniqueResults.length}`);

    // Transform stores to brand format with enhanced gift card detection
    const brands = uniqueResults.map((store: any) => {
      const isGiftCard = 
        store.name?.toLowerCase().includes('gift') ||
        store.description?.toLowerCase().includes('gift card') ||
        store.categories?.some((cat: string) => cat.toLowerCase().includes('gift')) ||
        store.tagline?.toLowerCase().includes('gift');

      return {
        id: store.id?.toString() || '',
        loyalize_id: store.id?.toString() || '',
        name: store.name || 'Unknown Store',
        logo_url: `https://api.loyalize.com/resources/stores/${store.id}/logo`,
        commission_rate: store.commissionRate || 0,
        description: store.description || store.tagline || `${store.name} - Shop and earn rewards`,
        website_url: store.homePage || '',
        tracking_url: store.trackingUrl || generateTrackingUrl(store.id, 'user_placeholder', 'nctr_platform'),
        category: isGiftCard ? 'Gift Cards' : (category || store.categories?.[0] || 'General'),
        countries: store.countries || ['US'],
        status: 'active',
        is_gift_card: isGiftCard
      };
    });
    
    return new Response(JSON.stringify({
      success: true,
      brands: brands,
      total: uniqueResults.length,
      page: Math.floor(offset / limit),
      totalPages: Math.ceil(uniqueResults.length / limit),
      search_terms_used: searchTerms
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Search brands error:', error);
    
    // Enhanced fallback for gift card searches
    const mockBrands = getMockBrands(query, category);
    
    // Add Uber gift card to mock data if searching for Uber
    if (query.toLowerCase().includes('uber')) {
      const uberGiftCard = {
        id: 'uber_gift_mock',
        loyalize_id: 'uber_gift_mock',
        name: 'Uber Gift Cards',
        description: 'Purchase Uber gift cards through MyGiftCardsPlus and earn up to 1% cashback. Perfect for gifting rides and food delivery.',
        logo_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=100&h=100&fit=crop',
        website_url: 'https://www.mygiftcardsplus.com/buy/Uber-USADIG3RDB2BVAR',
        category: 'Gift Cards',
        commission_rate: 4.5,
        status: 'active',
        is_gift_card: true
      };
      mockBrands.unshift(uberGiftCard);
    }
    
    return new Response(JSON.stringify({
      success: true,
      brands: mockBrands.slice(offset, offset + limit),
      total: mockBrands.length,
      note: 'Using enhanced mock data with gift card support - API error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getBrandDetails(brandId: string, apiKey: string): Promise<Response> {
  try {
    console.log(`📊 Fetching brand details for ID: ${brandId}`);
    
    const endpoint = `https://api.loyalize.com/v1/stores/${brandId}`;
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const storeData = await response.json();
      console.log(`✅ Successfully fetched brand details: ${storeData.name}`);
      console.log(`📋 Raw API response fields:`, Object.keys(storeData));
      console.log(`💰 Commission fields:`, {
        commissionRate: storeData.commissionRate,
        commission: storeData.commission,
        rate: storeData.rate,
        payoutRate: storeData.payoutRate
      });
      
      // Try to extract commission rate from multiple possible fields
      let commissionRate = 0;
      if (storeData.commissionRate) {
        commissionRate = storeData.commissionRate;
      } else if (storeData.commission) {
        commissionRate = storeData.commission;
      } else if (storeData.payoutRate) {
        commissionRate = storeData.payoutRate;
      }
      
      // If still 0, try to get from database
      let dbCommission = null;
      if (commissionRate === 0) {
        console.log(`⚠️ No commission rate in API, checking database for loyalize_id: ${brandId}`);
        const { data: dbBrand } = await supabaseClient
          .from('brands')
          .select('commission_rate')
          .eq('loyalize_id', brandId)
          .single();
        
        if (dbBrand?.commission_rate) {
          dbCommission = dbBrand.commission_rate;
          console.log(`📊 Found DB commission rate: ${dbCommission}%`);
        }
      }
      
      // Transform to a clean format for display
      const brandDetails = {
        id: storeData.id?.toString() || brandId,
        name: storeData.name || 'Unknown Store',
        description: storeData.description || storeData.tagline || '',
        commission_rate: dbCommission || (commissionRate * 100), // Use DB or convert API percentage
        category: storeData.categories?.[0] || 'General',
        website_url: storeData.homePage || '',
        status: 'active',
        terms: storeData.terms || storeData.termsAndConditions || '',
        cookie_duration: storeData.cookieDuration || storeData.cookieLength || 30,
        countries: storeData.countries || ['US'],
        tracking_url: storeData.trackingUrl || ''
      };
      
      return new Response(JSON.stringify({
        success: true,
        brand: brandDetails
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ Failed to fetch brand details: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to fetch brand details: ${response.status}`
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('❌ Get brand details error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function importBrand(req: Request, apiKey: string, supabase: any): Promise<Response> {
  try {
    const { brandId } = await req.json();
    console.log(`📥 Importing store: ${brandId}`);
    
    // Get store details from Loyalize API
    const endpoint = `https://api.loyalize.com/v1/stores/${brandId}`;
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': apiKey, // Correct Loyalize auth format per support
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const storeData = await response.json();
      console.log(`✅ Successfully fetched store details: ${storeData.name}`);
      
      // Fetch logo from sku-details endpoint
      const logoUrl = await fetchSingleStoreLogo(apiKey, brandId);
      
      // Calculate NCTR rate based on commission
      const commissionRate = storeData.commissionRate || 0.05;
      const nctrPerDollar = calculateNCTRRate(commissionRate * 100);
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('brands')
        .upsert({
          loyalize_id: brandId,
          name: storeData.name || 'Unknown Store',
          description: storeData.description || storeData.tagline || '',
          logo_url: logoUrl || `https://api.loyalize.com/resources/stores/${brandId}/logo`,
          commission_rate: commissionRate,
          nctr_per_dollar: 100.0, // Fixed default rate, independent of commission
          website_url: storeData.homePage || '',
          category: storeData.categories?.[0] || 'General',
          is_active: true,
          featured: false
        }, {
          onConflict: 'loyalize_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Store "${storeData.name}" imported successfully`,
        brand: data?.[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      
      // If API fails, create with mock data
      console.log('🔄 API failed, creating with mock data');
      const mockBrands = getMockBrands();
      const mockBrand = mockBrands.find(b => b.id === brandId) || mockBrands[0];
      
      const nctrPerDollar = calculateNCTRRate(mockBrand.commission_rate);
      
      const { data, error } = await supabase
        .from('brands')
        .upsert({
          loyalize_id: brandId,
          name: mockBrand.name,
          description: mockBrand.description,
          logo_url: mockBrand.logo_url,
          commission_rate: mockBrand.commission_rate / 100,
          nctr_per_dollar: 100.0, // Fixed default rate
          website_url: mockBrand.website_url,
          category: mockBrand.category,
          is_active: true,
          featured: false
        }, {
          onConflict: 'loyalize_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Mock brand "${mockBrand.name}" imported successfully`,
        brand: data?.[0],
        note: 'Using mock data - API unavailable'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('❌ Import brand error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function syncAllBrands(apiKey: string, supabase: any): Promise<Response> {
  console.log('🔄 Starting bulk sync of Loyalize stores');

  try {
    // Get all brands with Loyalize IDs
    const { data: existingBrands, error } = await supabase
      .from('brands')
      .select('id, loyalize_id, commission_rate')
      .not('loyalize_id', 'is', null);

    if (error) throw error;

    // Fetch all logo data at once for efficiency
    console.log('🖼️ Fetching logo data for all stores...');
    const logoData = await fetchStoreLogos(apiKey);

    let updatedCount = 0;
    
    for (const brand of existingBrands) {
      try {
        // Fetch updated store data from Loyalize
        const response = await fetch(`https://api.loyalize.com/v1/stores/${brand.loyalize_id}`, {
          headers: {
            'Authorization': apiKey, // Correct Loyalize auth format per support
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const storeData = await response.json();
          
          // Update commission rate and other data
          const commissionRate = storeData.commissionRate || 0.05;
          
          await supabase
            .from('brands')
            .update({
              commission_rate: commissionRate,
              nctr_per_dollar: 100.0, // Fixed default rate, independent of commission
              is_active: true,
              name: storeData.name,
              description: storeData.description || storeData.tagline,
              logo_url: logoData[brand.loyalize_id] || `https://api.loyalize.com/resources/stores/${brand.loyalize_id}/logo`,
              website_url: storeData.homePage,
              category: storeData.categories?.[0] || 'General'
            })
            .eq('id', brand.id);
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to sync brand ${brand.loyalize_id}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Synced ${updatedCount} brands successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error syncing brands:', error);
    throw error;
  }
}

// Generate tracking URL with required parameters
function generateTrackingUrl(storeId: string, userId: string, loyalizeId: string, subId?: string): string {
  const baseUrl = `https://api.loyalize.com/v1/stores/${storeId}/tracking`;
  const trackingUrl = new URL(baseUrl);
  
  trackingUrl.searchParams.set('cid', loyalizeId); // Your Loyalize ID
  trackingUrl.searchParams.set('pid', '3120835'); // Your Loyalize PID
  trackingUrl.searchParams.set('cp', userId); // Unique shopper identifier
  
  if (subId) {
    trackingUrl.searchParams.set('sid', subId); // Optional SubID for grouping
  }
  
  return trackingUrl.toString();
}

function getMockBrands(query?: string, category?: string): LoyalizeBrand[] {
  const mockBrands = [
    // Gift Card Brands - High Priority
    {
      id: 'uber_gift_cards',
      name: 'Uber Gift Cards',
      description: 'Purchase Uber gift cards through MyGiftCardsPlus and earn up to 1% cashback. Perfect for gifting rides, food delivery, and groceries.',
      logo_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=100&h=100&fit=crop',
      website_url: 'https://www.mygiftcardsplus.com/buy/Uber-USADIG3RDB2BVAR',
      category: 'Gift Cards',
      commission_rate: 4.5,
      status: 'active'
    },
    {
      id: 'amazon_gift_cards',
      name: 'Amazon Gift Cards',
      description: 'Digital and physical Amazon gift cards for the world\'s largest online retailer. Perfect for any occasion.',
      logo_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100&h=100&fit=crop',
      website_url: 'https://amazon.com/gift-cards',
      category: 'Gift Cards',
      commission_rate: 4.0,
      status: 'active'
    },
    {
      id: 'target_gift_cards',
      name: 'Target Gift Cards',
      description: 'Target gift cards for retail shopping and online purchases. Great for home, clothing, and everyday essentials.',
      logo_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
      website_url: 'https://target.com/gift-cards',
      category: 'Gift Cards',
      commission_rate: 5.5,
      status: 'active'
    },
    {
      id: 'starbucks_gift_cards',
      name: 'Starbucks Gift Cards',
      description: 'Starbucks gift cards for coffee, food, and merchandise. Perfect for coffee lovers everywhere.',
      logo_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=100&h=100&fit=crop',
      website_url: 'https://starbucks.com/gift-cards',
      category: 'Gift Cards',
      commission_rate: 6.0,
      status: 'active'
    },
    {
      id: 'apple_gift_cards',
      name: 'Apple Gift Cards',
      description: 'Apple gift cards for products, apps, services, and more. Perfect for tech enthusiasts.',
      logo_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop',
      website_url: 'https://apple.com/gift-cards',
      category: 'Gift Cards',
      commission_rate: 3.5,
      status: 'active'
    },
    {
      id: 'netflix_gift_cards',
      name: 'Netflix Gift Cards',
      description: 'Netflix gift cards for streaming entertainment. Give the gift of movies, shows, and original content.',
      logo_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=100&h=100&fit=crop',
      website_url: 'https://netflix.com/gift-cards',
      category: 'Gift Cards',
      commission_rate: 5.0,
      status: 'active'
    },
    // Regular Brands
    {
      id: 'loy_fashion_001',
      name: 'Urban Style Co.',
      description: 'Trendy fashion for young professionals',
      logo_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
      website_url: 'https://urbanstyle.com',
      category: 'Fashion',
      commission_rate: 8.5,
      status: 'active'
    },
    {
      id: 'loy_electronics_001',
      name: 'TechHub Pro',
      description: 'Latest gadgets and electronics',
      logo_url: 'https://images.unsplash.com/photo-1518414881446-83681961ada4?w=100&h=100&fit=crop',
      website_url: 'https://techhub.com',
      category: 'Electronics',
      commission_rate: 5.2,
      status: 'active'
    },
    {
      id: 'loy_home_001',
      name: 'Cozy Living',
      description: 'Beautiful home decor and furniture',
      logo_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=100&fit=crop',
      website_url: 'https://cozyliving.com',
      category: 'Home & Garden',
      commission_rate: 6.8,
      status: 'active'
    },
    {
      id: 'loy_fitness_001',
      name: 'FitLife Gear',
      description: 'Premium fitness equipment and apparel',
      logo_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
      website_url: 'https://fitlifegear.com',
      category: 'Health & Fitness',
      commission_rate: 7.5,
      status: 'active'
    }
  ];

  let filtered = mockBrands;
  
  if (query) {
    const searchQuery = query.toLowerCase();
    filtered = filtered.filter(brand => 
      brand.name.toLowerCase().includes(searchQuery) ||
      brand.description.toLowerCase().includes(searchQuery) ||
      brand.category.toLowerCase().includes(searchQuery)
    );
  }
  
  if (category && category !== 'all') {
    filtered = filtered.filter(brand => 
      brand.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  return filtered;
}

function calculateNCTRRate(commissionPercentage: number): number {
  // Fixed rate of 100 NCTR per dollar, independent of commission rates
  // Commission rates are tracked separately for partner payouts
  return 100.0;
}

async function fetchSingleStoreLogo(apiKey: string, storeId: string): Promise<string | null> {
  console.log(`🖼️ Fetching logo for store: ${storeId}`);
  
  try {
    const endpoint = `https://api.loyalize.com/v2/sku-details?storeId=${storeId}&size=1`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': apiKey, // Correct Loyalize auth format per support
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`⚠️ Logo fetch failed for store ${storeId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const items = data.content || [];
    
    if (items.length > 0) {
      const item = items[0];
      const logoUrl = item.storeLogo || item.store_logo || item.merchant_logo;
      
      if (logoUrl) {
        console.log(`✅ Found logo for store ${storeId}: ${logoUrl}`);
        return logoUrl;
      }
    }
    
    console.log(`⚠️ No logo found for store ${storeId}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error fetching logo for store ${storeId}:`, error);
    return null;
  }
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
          'Authorization': apiKey, // Correct Loyalize auth format per support
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
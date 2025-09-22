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

    // Get request data
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';

    switch (action) {
      case 'search':
        return await searchBrands(req, loyalizeApiKey);
      
      case 'import':
        return await importBrand(req, loyalizeApiKey, supabase);
      
      case 'sync':
        return await syncAllBrands(loyalizeApiKey, supabase);
      
      default:
        throw new Error('Invalid action. Supported: search, import, sync');
    }

  } catch (error) {
    console.error('Error in loyalize-brands function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
    if (query.toLowerCase() === 'uber') {
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
          'Authorization': `Bearer ${apiKey}`, // Fixed: Added Bearer prefix
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
        description: 'Uber gift cards for rides and food delivery. Perfect for gifting mobility and convenience.',
        logo_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=100&h=100&fit=crop',
        website_url: 'https://www.uber.com/gift-cards',
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
      error: error.message
    }), {
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
        'Authorization': `Bearer ${apiKey}`, // Fixed: Added Bearer prefix
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const storeData = await response.json();
      console.log(`✅ Successfully fetched store details: ${storeData.name}`);
      
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
          logo_url: `https://api.loyalize.com/resources/stores/${brandId}/logo`,
          commission_rate: commissionRate,
          nctr_per_dollar: nctrPerDollar,
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
          nctr_per_dollar: nctrPerDollar,
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
    return new Response(JSON.stringify({
      success: false,
      error: error.message
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

    let updatedCount = 0;
    
    for (const brand of existingBrands) {
      try {
        // Fetch updated store data from Loyalize
        const response = await fetch(`https://api.loyalize.com/v1/stores/${brand.loyalize_id}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`, // Fixed: Added Bearer prefix
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
              nctr_per_dollar: calculateNCTRRate(commissionRate * 100),
              is_active: true,
              name: storeData.name,
              description: storeData.description || storeData.tagline,
              logo_url: `https://api.loyalize.com/resources/stores/${brand.loyalize_id}/logo`,
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
  trackingUrl.searchParams.set('pid', 'nctr_platform'); // Traffic source identifier
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
      description: 'Uber gift cards for rides, food delivery, and grocery delivery. Perfect for gifting mobility and convenience.',
      logo_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=100&h=100&fit=crop',
      website_url: 'https://www.uber.com/gift-cards',
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
  // Convert commission percentage to NCTR per dollar
  // Example: 8% commission = 0.02 NCTR per dollar
  return (commissionPercentage / 100) * 0.25;
}
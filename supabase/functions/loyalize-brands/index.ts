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

  try {
    console.log(`🔍 Searching stores: query="${query}", category="${category}"`);
    
    const endpoint = 'https://api.loyalize.com/v1/stores';
    const searchUrl = new URL(endpoint);
    
    // Add query parameters according to API docs
    if (query) searchUrl.searchParams.set('name', query);
    if (category) searchUrl.searchParams.set('categories', category);
    searchUrl.searchParams.set('size', limit.toString());
    searchUrl.searchParams.set('page', Math.floor(offset / limit).toString());

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Successfully fetched ${data.content?.length || 0} stores`);
      
      // Transform stores to brand format
      const brands = data.content?.map((store: any) => ({
        id: store.id?.toString() || '',
        name: store.name || 'Unknown Store',
        logo_url: store.imageUrl || '',
        commission_rate: store.commission?.value || 0,
        commission_format: store.commission?.format || '%',
        description: store.description || '',
        website_url: store.url || '',
        category: store.categories?.[0] || 'General'
      })) || [];
      
      return new Response(JSON.stringify({
        success: true,
        brands: brands,
        total: data.totalElements || 0,
        page: data.number || 0,
        totalPages: data.totalPages || 1
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      
      // If API fails, return mock data
      console.log('🔄 API failed, using mock data');
      const mockBrands = getMockBrands(query, category);
      
      return new Response(JSON.stringify({
        success: true,
        brands: mockBrands.slice(offset, offset + limit),
        total: mockBrands.length,
        note: 'Using mock data - API unavailable'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('❌ Search brands error:', error);
    
    // Fallback to mock data
    const mockBrands = getMockBrands(query, category);
    return new Response(JSON.stringify({
      success: true,
      brands: mockBrands.slice(offset, offset + limit),
      total: mockBrands.length,
      note: 'Using mock data - API error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
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
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const storeData = await response.json();
      console.log(`✅ Successfully fetched store details: ${storeData.name}`);
      
      // Calculate NCTR rate based on commission
      const commissionRate = storeData.commission?.value ? (storeData.commission.format === '%' ? storeData.commission.value / 100 : storeData.commission.value) : 0.05;
      const nctrPerDollar = calculateNCTRRate(storeData.commission?.value || 5);
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('brands')
        .upsert({
          loyalize_id: brandId,
          name: storeData.name || 'Unknown Store',
          description: storeData.description || '',
          logo_url: storeData.imageUrl || '',
          commission_rate: commissionRate,
          nctr_per_dollar: nctrPerDollar,
          website_url: storeData.url || '',
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
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const storeData = await response.json();
          
          // Update commission rate and other data
          const commissionRate = storeData.commission?.value ? (storeData.commission.format === '%' ? storeData.commission.value / 100 : storeData.commission.value) : 0.05;
          
          await supabase
            .from('brands')
            .update({
              commission_rate: commissionRate,
              nctr_per_dollar: calculateNCTRRate(storeData.commission?.value || 5),
              is_active: true,
              name: storeData.name,
              description: storeData.description,
              logo_url: storeData.imageUrl,
              website_url: storeData.url,
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
}

function getMockBrands(query?: string, category?: string): LoyalizeBrand[] {
  const mockBrands = [
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
    },
    {
      id: 'loy_beauty_001',
      name: 'Glow Beauty',
      description: 'Natural skincare and cosmetics',
      logo_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop',
      website_url: 'https://glowbeauty.com',
      category: 'Beauty',
      commission_rate: 9.2,
      status: 'active'
    }
  ];

  let filtered = mockBrands;
  
  if (query) {
    filtered = filtered.filter(brand => 
      brand.name.toLowerCase().includes(query.toLowerCase()) ||
      brand.description.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (category) {
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
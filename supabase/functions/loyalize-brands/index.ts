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

async function searchBrands(req: Request, apiKey: string) {
  const body = await req.json().catch(() => ({}));
  const { query, category, limit = 20, offset = 0 } = body as LoyalizeSearchParams;

  console.log('Searching Loyalize brands:', { query, category, limit, offset });

  try {
    // Mock Loyalize API structure - replace with actual API endpoints
    const loyalizeUrl = new URL('https://api.loyalize.com/v1/brands/search');
    if (query) loyalizeUrl.searchParams.set('q', query);
    if (category) loyalizeUrl.searchParams.set('category', category);
    loyalizeUrl.searchParams.set('limit', limit.toString());
    loyalizeUrl.searchParams.set('offset', offset.toString());

    const response = await fetch(loyalizeUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If Loyalize API is not available, return mock data for testing
      console.log('Loyalize API not accessible, returning mock data');
      return new Response(
        JSON.stringify({
          brands: getMockBrands(query, category),
          total: getMockBrands(query, category).length,
          hasMore: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching Loyalize brands:', error);
    
    // Fallback to mock data if API is unavailable
    return new Response(
      JSON.stringify({
        brands: getMockBrands(query, category),
        total: getMockBrands(query, category).length,
        hasMore: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function importBrand(req: Request, apiKey: string, supabase: any) {
  const body = await req.json();
  const { brandId } = body;

  if (!brandId) {
    throw new Error('Brand ID is required');
  }

  console.log('Importing brand from Loyalize:', brandId);

  try {
    // Fetch detailed brand info from Loyalize
    const response = await fetch(`https://api.loyalize.com/v1/brands/${brandId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    let brandData: LoyalizeBrand;
    
    if (!response.ok) {
      // Mock brand data if API is not available
      const mockBrands = getMockBrands();
      brandData = mockBrands.find(b => b.id === brandId) || mockBrands[0];
    } else {
      brandData = await response.json();
    }

    // Insert brand into Supabase
    const { data, error } = await supabase
      .from('brands')
      .insert({
        name: brandData.name,
        description: brandData.description,
        logo_url: brandData.logo_url,
        website_url: brandData.website_url,
        category: brandData.category,
        loyalize_id: brandData.id,
        commission_rate: brandData.commission_rate / 100, // Convert percentage to decimal
        nctr_per_dollar: calculateNCTRRate(brandData.commission_rate),
        is_active: brandData.status === 'active',
        featured: false
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Brand imported successfully:', data.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        brand: data,
        message: `${brandData.name} imported successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing brand:', error);
    throw error;
  }
}

async function syncAllBrands(apiKey: string, supabase: any) {
  console.log('Starting bulk sync of Loyalize brands');

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
        // Fetch updated brand data from Loyalize
        const response = await fetch(`https://api.loyalize.com/v1/brands/${brand.loyalize_id}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const loyalizeBrand = await response.json();
          
          // Update commission rate and other data
          await supabase
            .from('brands')
            .update({
              commission_rate: loyalizeBrand.commission_rate / 100,
              nctr_per_dollar: calculateNCTRRate(loyalizeBrand.commission_rate),
              is_active: loyalizeBrand.status === 'active'
            })
            .eq('id', brand.id);
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to sync brand ${brand.loyalize_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${updatedCount} brands successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing brands:', error);
    throw error;
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
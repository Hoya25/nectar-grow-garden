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
        
        // Check if API key is configured
        if (!loyalizeApiKey) {
          console.warn('LOYALIZE_API_KEY not configured, using sample data')
          
          // Use sample data for testing when API key is not available
          const sampleBrands = [
            {
              id: 'sample-1',
              name: 'Sample Fashion Store',
              description: 'Premium fashion retailer with sustainable clothing options',
              logo_url: 'https://via.placeholder.com/100x100?text=Fashion',
              commission_rate: 8, // 8%
              category: 'Fashion',
              website_url: 'https://example-fashion.com',
              featured: true,
              affiliate_link: 'https://example-fashion.com/affiliate',
              terms: 'Standard affiliate terms apply'
            },
            {
              id: 'sample-2', 
              name: 'Tech Electronics Hub',
              description: 'Latest gadgets and electronics with competitive prices',
              logo_url: 'https://via.placeholder.com/100x100?text=Tech',
              commission_rate: 5, // 5%
              category: 'Electronics',
              website_url: 'https://example-tech.com',
              featured: false,
              affiliate_link: 'https://example-tech.com/affiliate',
              terms: 'Electronics warranty included'
            },
            {
              id: 'sample-3',
              name: 'Home & Garden Plus',
              description: 'Everything for your home improvement and gardening needs',
              logo_url: 'https://via.placeholder.com/100x100?text=Home',
              commission_rate: 6, // 6%
              category: 'Home & Garden',
              website_url: 'https://example-home.com',
              featured: false,
              affiliate_link: 'https://example-home.com/affiliate',
              terms: 'Home delivery available'
            }
          ]
          
          // Transform sample brands
          const transformedBrands = sampleBrands.map(brand => ({
            loyalize_id: brand.id,
            name: brand.name,
            description: brand.description,
            logo_url: brand.logo_url,
            commission_rate: brand.commission_rate / 100, // Convert percentage to decimal
            nctr_per_dollar: (brand.commission_rate / 100) * 0.1, // 10% of commission as NCTR
            category: brand.category,
            website_url: brand.website_url,
            is_active: true,
            featured: brand.featured,
          }))
          
          // Upsert sample brands into the database
          const { data: upsertData, error: upsertError } = await supabase
            .from('brands')
            .upsert(
              transformedBrands,
              {
                onConflict: 'loyalize_id',
                ignoreDuplicates: false
              }
            )
          
          if (upsertError) {
            console.error('Error upserting sample brands:', upsertError)
            throw upsertError
          }
          
          console.log(`Successfully synced ${transformedBrands.length} sample brands`)
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `Successfully synced ${transformedBrands.length} sample brands (API key not configured)`,
              brands_count: transformedBrands.length,
              is_sample_data: true
            }),
            { 
              headers: { 
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          )
        }
        
        // Try to fetch brands from Loyalize API
        try {
          const loyalizeResponse = await fetch('https://api.loyalize.com/v1/brands', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${loyalizeApiKey}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (!loyalizeResponse.ok) {
            console.error('Failed to fetch from Loyalize API:', loyalizeResponse.status, loyalizeResponse.statusText)
            const errorText = await loyalizeResponse.text()
            console.error('Error response:', errorText)
            throw new Error(`Loyalize API error: ${loyalizeResponse.status} - ${loyalizeResponse.statusText}`)
          }
          
          const loyalizeData: LoyalizeApiResponse = await loyalizeResponse.json()
          console.log(`Received ${loyalizeData.brands.length} brands from Loyalize API`)
          
          // Transform and sync brands to database
          const transformedBrands: LoyalizeBrand[] = loyalizeData.brands.map(brand => ({
            id: brand.id,
            name: brand.name,
            description: brand.description,
            logo_url: brand.logo_url,
            commission_rate: brand.commission_rate / 100, // Convert percentage to decimal
            category: brand.category || 'General',
            website_url: brand.website_url,
            is_featured: brand.featured || false,
            affiliate_link: brand.affiliate_link,
            terms_conditions: brand.terms
          }))
          
          // Upsert brands into the database
          const { data: upsertData, error: upsertError } = await supabase
            .from('brands')
            .upsert(
              transformedBrands.map(brand => ({
                loyalize_id: brand.id,
                name: brand.name,
                description: brand.description,
                logo_url: brand.logo_url,
                commission_rate: brand.commission_rate,
                nctr_per_dollar: brand.commission_rate * 0.1, // 10% of commission as NCTR
                category: brand.category,
                website_url: brand.website_url,
                is_active: true,
                featured: brand.is_featured,
              })),
              {
                onConflict: 'loyalize_id',
                ignoreDuplicates: false
              }
            )
          
          if (upsertError) {
            console.error('Error upserting brands:', upsertError)
            throw upsertError
          }
          
          console.log(`Successfully synced ${transformedBrands.length} brands`)
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `Successfully synced ${transformedBrands.length} brands from Loyalize`,
              brands_count: transformedBrands.length
            }),
            { 
              headers: { 
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          )
        } catch (apiError) {
          console.error('Loyalize API call failed, falling back to sample data:', apiError)
          
          // Fallback to sample data if API fails
          const sampleBrands = [
            {
              id: 'fallback-1',
              name: 'Premium Fashion Outlet',
              description: 'High-end fashion brands at discounted prices',
              logo_url: 'https://via.placeholder.com/100x100?text=PF',
              commission_rate: 7, 
              category: 'Fashion',
              website_url: 'https://example-premium-fashion.com',
              featured: true,
              affiliate_link: 'https://example-premium-fashion.com/affiliate',
              terms: 'Premium member benefits included'
            },
            {
              id: 'fallback-2',
              name: 'Smart Home Devices',
              description: 'Latest IoT and smart home technology',
              logo_url: 'https://via.placeholder.com/100x100?text=SH',
              commission_rate: 4,
              category: 'Technology',
              website_url: 'https://example-smarthome.com',
              featured: false,
              affiliate_link: 'https://example-smarthome.com/affiliate',
              terms: 'Tech support included'
            }
          ]
          
          const transformedBrands = sampleBrands.map(brand => ({
            loyalize_id: brand.id,
            name: brand.name,
            description: brand.description,
            logo_url: brand.logo_url,
            commission_rate: brand.commission_rate / 100,
            nctr_per_dollar: (brand.commission_rate / 100) * 0.1,
            category: brand.category,
            website_url: brand.website_url,
            is_active: true,
            featured: brand.featured,
          }))
          
          const { error: fallbackError } = await supabase
            .from('brands')
            .upsert(transformedBrands, { onConflict: 'loyalize_id' })
          
          if (fallbackError) throw fallbackError
          
          return new Response(
            JSON.stringify({
              success: true,
              message: `API unavailable, synced ${transformedBrands.length} fallback brands`,
              brands_count: transformedBrands.length,
              is_fallback_data: true
            }),
            { 
              headers: { 
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          )
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
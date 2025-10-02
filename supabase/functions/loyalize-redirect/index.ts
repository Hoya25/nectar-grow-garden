import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store');
    const userId = url.searchParams.get('user');
    const trackingId = url.searchParams.get('tracking');

    if (!storeId) {
      return new Response('Missing store parameter', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`🔄 Processing redirect for Loyalize store: ${storeId}`);
    console.log(`   User: ${userId}, Tracking: ${trackingId}`);

    // Get Loyalize API key from environment
    const loyalizeApiKey = Deno.env.get('LOYALIZE_API_KEY');
    
    if (!loyalizeApiKey) {
      console.error('❌ LOYALIZE_API_KEY not configured');
      return new Response('Service configuration error', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client to record the click
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // STEP 1: Get store details to retrieve trackingUrl (requires Authorization)
    console.log(`🔍 Step 1: Fetching store details for storeId: ${storeId}`);
    const storeDetailsUrl = `https://api.loyalize.com/v1/stores/${storeId}`;
    
    const storeResponse = await fetch(storeDetailsUrl, {
      method: 'GET',
      headers: {
        'Authorization': loyalizeApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 Store API response status: ${storeResponse.status}`);

    if (!storeResponse.ok) {
      console.error(`❌ Failed to fetch store details: ${storeResponse.status} ${storeResponse.statusText}`);
      if (storeResponse.status === 401) {
        console.error('   💡 Check: API key permissions');
      }
      
      // Fallback to brand website
      const { data: brand } = await supabase
        .from('brands')
        .select('website_url, name')
        .eq('loyalize_id', storeId)
        .single();

      if (brand?.website_url) {
        console.log(`⚠️ Using fallback brand URL: ${brand.website_url}`);
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': brand.website_url,
          },
        });
      }
      
      return new Response('Store not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    const storeData = await storeResponse.json();
    const baseTrackingUrl = storeData.trackingUrl;
    
    if (!baseTrackingUrl) {
      console.error('❌ No trackingUrl in store response');
      console.log('   📦 Store data:', JSON.stringify(storeData, null, 2));
      
      // Fallback
      const { data: brand } = await supabase
        .from('brands')
        .select('website_url')
        .eq('loyalize_id', storeId)
        .single();

      if (brand?.website_url) {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': brand.website_url,
          },
        });
      }
      
      return new Response('Invalid store configuration', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    console.log(`✅ Got base tracking URL: ${baseTrackingUrl}`);

    // STEP 2: Append tracking parameters to the trackingUrl (no Authorization needed)
    const finalTrackingUrl = new URL(baseTrackingUrl);
    
    // Add required parameters per Loyalize team instructions
    finalTrackingUrl.searchParams.set('pid', '3120835'); // Publisher ID
    if (userId) finalTrackingUrl.searchParams.set('cp', userId); // Custom parameter (user tracking)
    if (trackingId) finalTrackingUrl.searchParams.set('sid', trackingId); // Sub-affiliate tracking ID
    
    // Note: cid (Campaign ID) is already in the base trackingUrl from the API
    
    const redirectUrl = finalTrackingUrl.toString();
    console.log(`🎯 Final public tracking URL: ${redirectUrl}`);

    // Record the affiliate link click
    if (userId && trackingId) {
      console.log(`📝 Recording click - User: ${userId}, Tracking: ${trackingId}`);
      try {
        // Get brand_id for this store
        const { data: brand } = await supabase
          .from('brands')
          .select('id')
          .eq('loyalize_id', storeId)
          .single();

        const { data: mappingData, error: mappingError } = await supabase
          .from('affiliate_link_mappings')
          .upsert({
            user_id: userId,
            tracking_id: trackingId,
            brand_id: brand?.id || null,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'tracking_id'
          })
          .select();
        
        if (mappingError) {
          console.error('⚠️ Failed to record click mapping:', mappingError);
        } else {
          console.log(`✅ Recorded affiliate click:`, mappingData);
        }
      } catch (error) {
        console.error('⚠️ Exception recording click:', error);
        // Don't fail the redirect if tracking fails
      }
    } else {
      console.log(`⚠️ Skipping click recording - userId: ${userId}, trackingId: ${trackingId}`);
    }

    console.log(`🎯 Final redirect URL: ${redirectUrl}`);
    console.log(`🚀 Redirecting user now...`);

    // Perform 302 redirect to the merchant
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('❌ Error in loyalize-redirect:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

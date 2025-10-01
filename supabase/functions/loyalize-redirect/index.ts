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

    // Call Loyalize API to get the actual tracking redirect URL
    const loyalizeApiUrl = new URL(`https://api.loyalize.com/v1/stores/${storeId}/tracking`);
    loyalizeApiUrl.searchParams.set('pid', 'thegarden');
    if (userId) loyalizeApiUrl.searchParams.set('cp', userId);
    if (trackingId) loyalizeApiUrl.searchParams.set('sid', trackingId);

    console.log(`🔗 Calling Loyalize API: ${loyalizeApiUrl.toString()}`);

    const loyalizeResponse = await fetch(loyalizeApiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': loyalizeApiKey,
        'Content-Type': 'application/json'
      },
      redirect: 'manual' // Don't follow redirects automatically
    });

    console.log(`📡 Loyalize API response status: ${loyalizeResponse.status}`);

    // Loyalize should return a 302 redirect or a redirect URL in the response
    let redirectUrl: string | null = null;

    if (loyalizeResponse.status === 302 || loyalizeResponse.status === 301) {
      redirectUrl = loyalizeResponse.headers.get('Location');
      console.log(`✅ Got redirect from Loyalize: ${redirectUrl}`);
    } else if (loyalizeResponse.status === 200) {
      // Try to parse JSON response for redirect URL
      try {
        const data = await loyalizeResponse.json();
        redirectUrl = data.redirectUrl || data.url || data.trackingUrl;
        console.log(`✅ Got tracking URL from Loyalize response: ${redirectUrl}`);
      } catch (e) {
        console.error('❌ Failed to parse Loyalize response:', e);
      }
    }

    // Fallback: Try to get store details and build direct URL
    if (!redirectUrl) {
      console.log('⚠️ No redirect URL from Loyalize API, fetching store details...');
      
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('website_url, name')
        .eq('loyalize_id', storeId)
        .single();

      if (brand && brand.website_url) {
        redirectUrl = brand.website_url;
        console.log(`✅ Using brand website URL: ${redirectUrl}`);
      } else {
        console.error('❌ Could not find brand or website URL');
        return new Response('Store not found', { 
          status: 404,
          headers: corsHeaders 
        });
      }
    }

    // Record the affiliate link click
    if (userId && trackingId) {
      try {
        await supabase
          .from('affiliate_link_mappings')
          .upsert({
            user_id: userId,
            tracking_id: trackingId,
            loyalize_store_id: storeId,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'tracking_id'
          });
        console.log(`✅ Recorded affiliate click for tracking ID: ${trackingId}`);
      } catch (error) {
        console.error('⚠️ Failed to record click:', error);
        // Don't fail the redirect if tracking fails
      }
    }

    console.log(`🎯 Final redirect URL: ${redirectUrl}`);

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

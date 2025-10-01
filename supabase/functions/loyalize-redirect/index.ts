import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log(`🔄 Redirecting to Loyalize store: ${storeId}`);
    console.log(`   User: ${userId}, Tracking: ${trackingId}`);

    // Build the Loyalize tracking URL per official API spec
    // Format: api.loyalize.com/v1/stores/{storeId}/tracking?params
    const loyalizeUrl = new URL(`https://api.loyalize.com/v1/stores/${storeId}/tracking`);
    
    // Add tracking parameters per Loyalize API spec:
    // - pid (publisher/traffic source ID) = must be approved in Loyalize dashboard
    // - cp (customer parameter) = user_id so webhook can identify user (96-char limit)
    // - sid (sub-ID) = tracking_id for detailed tracking (96-char limit, optional)
    loyalizeUrl.searchParams.set('pid', 'thegarden'); // Your traffic source ID (must match Loyalize dashboard)
    
    if (userId) {
      loyalizeUrl.searchParams.set('cp', userId); // Customer parameter (user ID)
    }
    if (trackingId) {
      loyalizeUrl.searchParams.set('sid', trackingId); // Sub ID (tracking ID)
    }
    
    console.log(`✅ Loyalize tracking URL: ${loyalizeUrl.toString()}`);
    console.log(`   📊 Tracking: cp=${userId}, sid=${trackingId}`);

    // Perform 302 redirect through Loyalize tracking
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': loyalizeUrl.toString(),
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

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

    // Build the Loyalize tracking URL that will credit YOUR Loyalize account
    // Format: link.loyalize.com/stores/{storeId}?params
    const loyalizeUrl = new URL(`https://link.loyalize.com/stores/${storeId}`);
    
    // Add tracking parameters per Loyalize API spec:
    // - cp (customer parameter) = user_id so webhook can identify user
    // - sid (sub-ID) = tracking_id for detailed tracking
    // - pid (publisher ID) = your identifier (use your domain or Loyalize account ID)
    if (userId) {
      loyalizeUrl.searchParams.set('cp', userId); // Customer parameter (user ID)
    }
    if (trackingId) {
      loyalizeUrl.searchParams.set('sid', trackingId); // Sub ID (tracking ID)
    }
    
    // IMPORTANT: Set your publisher ID here
    // This should match your Loyalize account/publisher identifier
    loyalizeUrl.searchParams.set('pid', 'thegarden'); // Your publisher ID
    
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

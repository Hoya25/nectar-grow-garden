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

    console.log(`🔄 Redirecting to store: ${storeId}`);
    console.log(`   User: ${userId}, Tracking: ${trackingId}`);

    // Map store IDs to direct merchant URLs
    const storeUrls: Record<string, string> = {
      '30095': 'https://nobullproject.com/?ref=nctr&uid={{USER_ID}}&tid={{TRACKING_ID}}',
      '44820': 'https://gifts.uber.com/?ref=nctr&uid={{USER_ID}}&tid={{TRACKING_ID}}'
    };

    const baseUrl = storeUrls[storeId];
    if (!baseUrl) {
      return new Response('Unknown store', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Replace placeholders with actual values
    let finalUrl = baseUrl
      .replace('{{USER_ID}}', userId || 'anonymous')
      .replace('{{TRACKING_ID}}', trackingId || 'unknown');

    console.log(`✅ Redirect URL: ${finalUrl}`);

    // Perform 302 redirect
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': finalUrl,
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

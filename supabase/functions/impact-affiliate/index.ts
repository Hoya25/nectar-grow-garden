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
    const body = await req.json();
    const { action, advertiserId, productUrl, searchTerm } = body;
    
    const accountSid = Deno.env.get('IMPACT_ACCOUNT_SID');
    const authToken = Deno.env.get('IMPACT_AUTH_TOKEN');
    
    if (!accountSid || !authToken) {
      console.error('❌ Impact.com credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Impact.com integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Basic Auth header
    const basicAuth = btoa(`${accountSid}:${authToken}`);
    const headers = {
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    console.log(`🔄 Impact.com API request - Action: ${action}`);

    // Search for advertisers/brands
    if (action === 'search') {
      console.log(`🔍 Searching Impact.com for: ${searchTerm}`);
      
      const searchUrl = `https://api.impact.com/Mediapartners/${accountSid}/v3/Campaigns`;
      
      const response = await fetch(searchUrl, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Impact.com API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to search advertisers', details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = await response.json();
      console.log(`✅ Found ${data.Campaigns?.length || 0} campaigns`);
      
      // Filter campaigns by search term if provided
      let campaigns = data.Campaigns || [];
      if (searchTerm) {
        campaigns = campaigns.filter((c: any) => 
          c.Name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return new Response(
        JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate affiliate link
    if (action === 'generate') {
      console.log(`🔗 Generating affiliate link for advertiser: ${advertiserId}`);
      
      if (!advertiserId || !productUrl) {
        return new Response(
          JSON.stringify({ error: 'advertiserId and productUrl are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Impact.com uses a standard affiliate link structure
      // The tracking link format: https://impact.com/campaign-promo/{accountSid}/{campaignId}/{advertiserId}
      // Then redirects to the actual product URL
      
      // For now, we'll create a deep link that includes the destination URL
      const trackingUrl = `https://api.impact.com/Mediapartners/${accountSid}/v3/Ads`;
      
      // Get campaign details first
      const campaignResponse = await fetch(
        `https://api.impact.com/Mediapartners/${accountSid}/v3/Campaigns/${advertiserId}`,
        { headers }
      );
      
      if (!campaignResponse.ok) {
        const errorText = await campaignResponse.text();
        console.error('❌ Failed to get campaign details:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to get campaign details', details: errorText }),
          { status: campaignResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const campaignData = await campaignResponse.json();
      
      // Create the affiliate tracking link
      // Impact.com format: https://go.impact.com/campaign-promo/{AccountSid}/{CampaignId}
      const affiliateLink = `https://go.impact.com/campaign-promo/${accountSid}/${advertiserId}?url=${encodeURIComponent(productUrl)}`;
      
      console.log(`✅ Generated affiliate link for campaign: ${campaignData.Name}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          affiliateLink,
          campaign: {
            id: campaignData.Id,
            name: campaignData.Name,
            advertiser: campaignData.AdvertiserName,
            commissionType: campaignData.DefaultCommission?.Type,
            commissionRate: campaignData.DefaultCommission?.Amount,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "search" or "generate"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Impact.com integration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

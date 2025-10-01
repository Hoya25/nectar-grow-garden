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
    console.log('🚀 Impact.com affiliate function called');
    
    const accountSid = Deno.env.get('IMPACT_ACCOUNT_SID');
    const authToken = Deno.env.get('IMPACT_AUTH_TOKEN');
    
    console.log('🔑 Account SID exists:', !!accountSid);
    console.log('🔑 Auth Token exists:', !!authToken);
    
    if (accountSid) {
      console.log('📋 Account SID prefix:', accountSid.substring(0, 5));
    }
    
    if (!accountSid || !authToken) {
      console.error('❌ Impact.com credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Impact.com integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, advertiserId, productUrl, searchTerm } = body;
    
    console.log('📝 Request body:', { action, advertiserId, productUrl, searchTerm });

    // Create Basic Auth header
    const basicAuth = btoa(`${accountSid}:${authToken}`);
    const headers = {
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    console.log(`🔄 Impact.com API request - Action: ${action}`);

    // Search for campaigns/brands
    if (action === 'search') {
      console.log(`🔍 Searching Impact.com campaigns for: ${searchTerm}`);
      
      // Use Mediapartners API endpoint (requires Campaigns scope)
      // Filter for US campaigns only
      const searchUrl = `https://api.impact.com/Mediapartners/${accountSid}/Campaigns?Country=US&PageSize=100`;
      
      const response = await fetch(searchUrl, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Impact.com API error:', errorText);
        
        let errorMessage = 'Failed to search campaigns';
        let helpText = '';
        
        if (response.status === 403) {
          errorMessage = 'Access Denied: Your Impact.com API credentials do not have the required permissions.';
          helpText = 'Please ensure your token has "Campaigns - Read" permissions enabled. Visit: https://app.impact.com/secure/agency/accountSettings/agency-wsapi-flow.ihtml';
        }
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage, 
            details: errorText,
            help: helpText
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = await response.json();
      console.log(`✅ Found ${data.Campaigns?.length || 0} campaigns`);
      
      // Log first campaign raw data for debugging
      if (data.Campaigns && data.Campaigns.length > 0) {
        console.log('📊 Sample raw campaign data:', JSON.stringify(data.Campaigns[0], null, 2));
      }
      
      // Filter campaigns by search term if provided
      let campaigns = data.Campaigns || [];
      if (searchTerm) {
        campaigns = campaigns.filter((c: any) => 
          c.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.AdvertiserName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Map campaigns with logo and commission info
      // Try multiple possible ID field names from Impact.com API
      campaigns = campaigns.map((camp: any) => {
        const campaignId = camp.Id || camp.CampaignId || camp.id || camp.CampaignIdFromAdvertiser || String(camp.CampaignIdFromNetworkId);
        
        if (!campaignId) {
          console.warn('⚠️ Campaign missing ID:', camp);
        }
        
        return {
          Id: campaignId,
          Name: camp.Name || camp.CampaignName,
          AdvertiserName: camp.AdvertiserName || camp.Name,
          Status: camp.State || camp.Status,
          LogoUrl: camp.LogoUrl || camp.AdvertiserLogoUrl || null,
          CommissionRate: camp.DefaultPayoutAmount || camp.DefaultPayout || null,
          CommissionType: camp.DefaultPayoutType || 'percentage',
          Description: camp.Description || camp.CampaignDescription || '',
          WebsiteUrl: camp.LandingPageUrl || camp.WebsiteUrl || camp.AdvertiserWebsiteUrl || null
        };
      });
      
      // Deduplicate by AdvertiserName - keep only one campaign per brand
      const uniqueCampaigns = campaigns.reduce((acc: any[], campaign: any) => {
        const existing = acc.find(c => c.AdvertiserName === campaign.AdvertiserName);
        if (!existing) {
          acc.push(campaign);
        }
        return acc;
      }, []);
      
      console.log(`✅ Returning ${uniqueCampaigns.length} unique campaigns (${campaigns.length} total)`);
      
      return new Response(
        JSON.stringify({ campaigns: uniqueCampaigns }),
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
        `https://api.impact.com/Mediapartners/${accountSid}/Campaigns/${advertiserId}`,
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
      
      console.log('📊 Full campaign data received:', JSON.stringify(campaignData, null, 2));
      
      // Extract the actual brand website URL from campaign data
      // Try multiple possible field names from Impact.com API
      // Priority: Use tracking URL if available, otherwise landing page, then website
      const brandWebsiteUrl = campaignData.TrackingLink || 
                              campaignData.LandingPageUrl || 
                              campaignData.WebsiteUrl || 
                              campaignData.AdvertiserWebsiteUrl ||
                              campaignData.CampaignUrl ||
                              productUrl; // Fallback to provided URL
      
      console.log('🌐 Extracted brand website URL:', brandWebsiteUrl);
      console.log('📋 Available URL fields:', {
        TrackingLink: campaignData.TrackingLink,
        LandingPageUrl: campaignData.LandingPageUrl,
        WebsiteUrl: campaignData.WebsiteUrl,
        AdvertiserWebsiteUrl: campaignData.AdvertiserWebsiteUrl,
        CampaignUrl: campaignData.CampaignUrl
      });
      
      // Create the affiliate tracking link that will redirect to the brand's website
      // Impact.com format: https://go.impact.com/campaign-promo/{AccountSid}/{CampaignId}?url={destination}
      const affiliateLink = `https://go.impact.com/campaign-promo/${accountSid}/${advertiserId}?url=${encodeURIComponent(brandWebsiteUrl)}`;
      
      console.log(`✅ Generated affiliate link: ${affiliateLink}`);
      console.log(`✅ Will redirect to: ${brandWebsiteUrl}`);
      
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

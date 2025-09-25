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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const linkId = url.searchParams.get('id');
    let action = url.searchParams.get('action') || 'redirect';

    // For POST requests, check if action is in the body
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        action = body.action || action;
        
        // If it's a create action, handle it directly
        if (action === 'create') {
          return await createTrackedLink(req, body, supabase);
        }
      } catch (e) {
        // If body parsing fails, continue with URL-based action
        console.log('Could not parse request body, using URL parameters');
      }
    }

    if (!linkId && action !== 'create') {
      return new Response('Missing link ID', {
        status: 400,
        headers: corsHeaders
      });
    }

    switch (action) {
      case 'redirect':
        if (!linkId) {
          return new Response('Missing link ID for redirect', {
            status: 400,
            headers: corsHeaders
          });
        }
        return await handleRedirect(linkId, req, supabase);
      case 'stats':
        if (!linkId) {
          return new Response('Missing link ID for stats', {
            status: 400,
            headers: corsHeaders
          });
        }
        return await getLinkStats(linkId, supabase);
      default:
        return new Response('Invalid action', {
          status: 400,
          headers: corsHeaders
        });
    }

  } catch (error) {
    console.error('Error in affiliate-redirect function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createTrackedLink(req: Request, body: any, supabase: any): Promise<Response> {
  const { userId, originalUrl, platformName, description } = body;

  if (!originalUrl || !platformName) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: originalUrl, platformName' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('🔗 Creating tracked affiliate link:', { originalUrl, platformName });

  try {
    // Insert the new affiliate link with admin as creator
    const { data: link, error: insertError } = await supabase
      .from('independent_affiliate_links')
      .insert({
        user_id: userId || 'admin', // Admin creates links for everyone
        original_affiliate_url: originalUrl,
        platform_name: platformName,
        description: description || `${platformName} affiliate link`
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Generate the tracked URL that goes through our redirect system
    const trackedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/affiliate-redirect?id=${link.id}&action=redirect`;

    console.log('✅ Created tracked affiliate link:', link.id);

    return new Response(JSON.stringify({
      success: true,
      link_id: link.id,
      tracked_url: trackedUrl,
      original_url: originalUrl,
      platform_name: platformName,
      click_count: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error creating tracked link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleRedirect(linkId: string, req: Request, supabase: any): Promise<Response> {
  try {
    // Get the affiliate link details
    const { data: link, error: linkError } = await supabase
      .from('independent_affiliate_links')
      .select('*')
      .eq('id', linkId)
      .eq('is_active', true)
      .single();

    if (linkError || !link) {
      console.error('Link not found:', linkId);
      return new Response('Link not found or inactive', {
        status: 404,
        headers: corsHeaders
      });
    }

    // Extract request info for tracking
    const userAgent = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor || realIp || 'unknown';

    // Record the click
    const { error: clickError } = await supabase
      .from('affiliate_link_clicks')
      .insert({
        link_id: linkId,
        user_id: link.user_id,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer
      });

    if (clickError) {
      console.error('Error recording click:', clickError);
      // Don't fail the redirect if click tracking fails
    }

    console.log(`🎯 Redirecting to: ${link.original_affiliate_url}`);

    // Create enhanced affiliate URL with additional tracking parameters
    const enhancedUrl = enhanceAffiliateUrl(
      link.original_affiliate_url, 
      link.user_id, 
      linkId,
      link.platform_name
    );

    // Redirect to the original affiliate URL
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': enhancedUrl
      }
    });

  } catch (error) {
    console.error('❌ Error handling redirect:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    });
  }
}

async function getLinkStats(linkId: string, supabase: any): Promise<Response> {
  try {
    // Get link info with stats
    const { data: link, error: linkError } = await supabase
      .from('independent_affiliate_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (linkError) throw linkError;

    // Get recent clicks
    const { data: recentClicks, error: clicksError } = await supabase
      .from('affiliate_link_clicks')
      .select('clicked_at, ip_address')
      .eq('link_id', linkId)
      .order('clicked_at', { ascending: false })
      .limit(10);

    if (clicksError) throw clicksError;

    return new Response(JSON.stringify({
      success: true,
      link: link,
      recent_clicks: recentClicks || [],
      stats: {
        total_clicks: link.click_count,
        conversions: link.conversion_count,
        total_commissions: link.total_commissions
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error getting link stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

function enhanceAffiliateUrl(originalUrl: string, userId: string, linkId: string, platformName: string): string {
  try {
    const url = new URL(originalUrl);
    
    // Add comprehensive user tracking parameters while preserving existing ones
    url.searchParams.set('nctr_user', userId.substring(0, 8)); // Short user ID for tracking
    url.searchParams.set('nctr_ref', linkId.substring(0, 8)); // Short link ID
    url.searchParams.set('nctr_source', 'garden_platform');
    url.searchParams.set('nctr_campaign', platformName.toLowerCase().replace(/\s+/g, '_'));
    url.searchParams.set('nctr_timestamp', Date.now().toString());
    url.searchParams.set('user_id', userId); // Full user ID for backend tracking
    url.searchParams.set('tracking_id', `${userId.substring(0, 8)}_${linkId.substring(0, 8)}_${Date.now()}`);
    
    console.log('🎯 Enhanced affiliate URL:', url.toString());

    return url.toString();
  } catch (error) {
    console.error('Error enhancing affiliate URL:', error);
    // If URL parsing fails, return original URL
    return originalUrl;
  }
}
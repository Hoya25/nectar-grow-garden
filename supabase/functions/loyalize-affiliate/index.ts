import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AffiliateLink {
  original_url: string;
  affiliate_url: string;
  tracking_id: string;
  expires_at?: string;
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

    const body = await req.json();
    const { action, brandId, userId, productUrl, brand_id, user_id, product_url } = body;
    
    // Support both camelCase and snake_case for backward compatibility
    const normalizedBrandId = brandId || brand_id;
    const normalizedUserId = userId || user_id;
    const normalizedProductUrl = productUrl || product_url;

    switch (action) {
      case 'generate':
        return await generateAffiliateLink(normalizedBrandId, normalizedUserId, normalizedProductUrl, loyalizeApiKey, supabase);
      
      case 'track':
        return await trackPurchase(body, supabase);
      
      default:
        throw new Error('Invalid action. Supported: generate, track');
    }

  } catch (error) {
    console.error('Error in loyalize-affiliate function:', error);
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

async function generateAffiliateLink(
  brandId: string, 
  userId: string, 
  productUrl: string, 
  apiKey: string, 
  supabase: any
): Promise<Response> {
  console.log('🔗 Generating affiliate link:', { brandId, userId, productUrl });

  try {
    // Validate user exists and get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username, email')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile lookup error:', profileError);
    }

    // Get brand information from our database
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError) throw brandError;

    if (!brand.loyalize_id) {
      throw new Error('Brand is not integrated with Loyalize');
    }

    // Check if this is a gift card brand for special handling
    const isGiftCard = brand.category?.toLowerCase().includes('gift') || 
                       brand.name?.toLowerCase().includes('gift');
    
    console.log(`🎁 Gift card detected: ${isGiftCard ? 'Yes' : 'No'} for ${brand.name}`);

    // Generate tracking ID for this specific user/brand/product combination
    const trackingId = await generateTrackingId(userId, brandId, supabase);

    let affiliateData: AffiliateLink;

    // **CRITICAL**: Use Loyalize's proper tracking API endpoint format
    // This ensures commission credit flows back to Loyalize account
    const loyalizeTrackingUrl = generateLoyalizeTrackingUrl(brand.loyalize_id, userId, trackingId);
    
    console.log('✅ Generated Loyalize tracking URL:', loyalizeTrackingUrl);
    
    affiliateData = {
      original_url: productUrl,
      affiliate_url: loyalizeTrackingUrl,
      tracking_id: trackingId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    // Store the pending transaction with detailed tracking
    const { error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'pending',
        nctr_amount: 0, // Will be updated when purchase is confirmed
        description: `${isGiftCard ? 'Gift Card Purchase' : 'Purchase'} via ${brand.name}`,
        partner_name: brand.name,
        status: 'pending',
        earning_source: isGiftCard ? 'gift_card_affiliate' : 'affiliate_purchase'
      });

    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError);
      // Don't fail the entire request if transaction logging fails
    }

    console.log(`✅ Generated affiliate link for user ${userId} (${profile?.username || profile?.email || 'Unknown'}) -> ${brand.name}`);

    return new Response(JSON.stringify({
      success: true,
      affiliate_link: affiliateData.affiliate_url,
      tracking_id: affiliateData.tracking_id,
      user_profile: {
        user_id: userId,
        username: profile?.username,
        email: profile?.email
      },
      brand: {
        id: brand.id,
        name: brand.name,
        logo_url: brand.logo_url,
        commission_rate: brand.commission_rate,
        nctr_per_dollar: brand.nctr_per_dollar,
        is_gift_card: isGiftCard,
        category: brand.category
      },
      expires_at: affiliateData.expires_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error generating affiliate link:', error);
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

async function trackPurchase(data: any, supabase: any): Promise<Response> {
  const { trackingId, purchaseAmount, orderId, timestamp } = data;
  
  console.log('Tracking purchase:', { trackingId, purchaseAmount, orderId });

  try {
    // Parse tracking ID to extract user and brand information
    const parsedIds = await parseTrackingId(trackingId, supabase);
    const { userId, brandId } = parsedIds;
    
    if (!userId || !brandId) {
      throw new Error(`Invalid tracking ID format: ${trackingId}`);
    }

    console.log('📊 Tracking purchase for user:', userId, 'brand:', brandId, 'amount:', purchaseAmount);

    // Get brand information for commission calculation
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError) {
      throw new Error(`Brand not found for ID: ${brandId}`);
    }

    // Calculate NCTR reward based on brand settings
    const nctrReward = purchaseAmount * (brand.nctr_per_dollar || 0.01);

    // Create the completed transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earned',
        nctr_amount: nctrReward,
        purchase_amount: purchaseAmount,
        description: `Purchase reward from ${brand.name} (Order: ${orderId})`,
        partner_name: brand.name,
        status: 'completed',
        earning_source: 'affiliate_purchase'
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error(`Failed to create transaction: ${transactionError.message}`);
    }

    // Update user's portfolio with earned NCTR
    const { data: portfolio, error: portfolioError } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, total_earned')
      .eq('user_id', userId)
      .single();

    if (!portfolioError && portfolio) {
      const { error: updateError } = await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: portfolio.available_nctr + nctrReward,
          total_earned: portfolio.total_earned + nctrReward,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Portfolio update error:', updateError);
        // Don't fail the entire request if portfolio update fails
      }
    }

    console.log(`✅ Successfully tracked purchase: ${nctrReward} NCTR credited to user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        nctr_earned: nctrReward,
        transaction_id: transaction.id,
        user_id: userId,
        brand_name: brand.name,
        purchase_amount: purchaseAmount,
        message: `Earned ${nctrReward.toFixed(8)} NCTR from your purchase!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error tracking purchase:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function generateTrackingId(userId: string, brandId: string, supabase: any): Promise<string> {
  const timestamp = Date.now().toString(36);
  const randomId = Math.random().toString(36).substring(2, 15);
  const trackingId = `tgn_${randomId}_${timestamp}`;
  
  console.log(`🔑 Generated tracking ID: ${trackingId}`);
  console.log(`   └─ For user: ${userId.slice(0, 8)}... brand: ${brandId.slice(0, 8)}...`);
  
  // Store the mapping in database for reliable lookups
  const { error } = await supabase
    .from('affiliate_link_mappings')
    .upsert({
      tracking_id: trackingId,
      user_id: userId,
      brand_id: brandId,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'tracking_id'
    });
    
  if (error) {
    console.error('❌ Error storing tracking ID mapping:', error);
    // Fallback to simple format if mapping fails
    return `${userId}-${brandId}-${timestamp}`;
  } else {
    console.log(`✅ Tracking ID mapping stored in database`);
  }
  
  return trackingId;
}

async function parseTrackingId(trackingId: string, supabase: any): Promise<{ userId: string, brandId: string }> {
  console.log('🔍 Parsing tracking ID:', trackingId);
  
  try {
    // Try database lookup first
    const { data, error } = await supabase
      .from('affiliate_link_mappings')
      .select('user_id, brand_id')
      .eq('tracking_id', trackingId)
      .single();
      
    if (!error && data) {
      console.log('✅ Found tracking mapping:', data);
      return {
        userId: data.user_id,
        brandId: data.brand_id
      };
    }
    
    // Fallback to old format parsing if no mapping found
    if (trackingId.includes('-')) {
      const parts = trackingId.split('-');
      if (parts.length >= 2) {
        return {
          userId: parts[0],
          brandId: parts[1]
        };
      }
    }
    
    throw new Error(`No mapping found for tracking ID: ${trackingId}`);
    
  } catch (error) {
    console.error('❌ Error parsing tracking ID:', trackingId, error);
    return {
      userId: '',
      brandId: ''
    };
  }
}

/**
 * Generate Loyalize tracking URL per official documentation
 * cid: Auto-filled by Loyalize API (do not set manually)
 * pid: Traffic source identifier (must map to approved source in Loyalize dashboard)
 * cp: Shopper identifier (user_id)
 * sid: Optional sub-tracking ID for campaigns/filtering
 */
function generateLoyalizeTrackingUrl(storeId: string, userId: string, trackingId: string): string {
  const TRAFFIC_SOURCE_ID = '3120835'; // Your Loyalize PID
  
  const trackingUrl = new URL(`https://api.loyalize.com/v1/stores/${storeId}/tracking`);
  // cid is auto-filled by Loyalize when using API key - DO NOT set manually
  trackingUrl.searchParams.set('pid', TRAFFIC_SOURCE_ID); // Traffic source (must be approved in Loyalize dashboard)
  trackingUrl.searchParams.set('cp', userId); // Shopper ID (96-char limit)
  trackingUrl.searchParams.set('sid', trackingId); // Sub-tracking ID (96-char limit, optional)
  
  return trackingUrl.toString();
}

function generateMockAffiliateLink(brand: any, productUrl: string, trackingId: string): AffiliateLink {
  // Generate a mock affiliate link for testing
  const baseUrl = brand.website_url || 'https://example.com';
  const affiliateUrl = `${baseUrl}?ref=garden&track=${trackingId}&redirect=${encodeURIComponent(productUrl)}`;
  
  return {
    original_url: productUrl,
    affiliate_url: affiliateUrl,
    tracking_id: trackingId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
}
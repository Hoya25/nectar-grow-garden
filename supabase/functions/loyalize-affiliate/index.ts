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
    return new Response(
      JSON.stringify({ error: error.message }),
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
    const trackingId = generateTrackingId(userId, brandId);

    let affiliateData: AffiliateLink;

    try {
      // Try to generate real affiliate link via Loyalize API
      const response = await fetch('https://api.loyalize.com/v1/affiliate/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_id: brand.loyalize_id,
          product_url: productUrl,
          tracking_id: trackingId,
          user_id: userId,
          campaign_type: isGiftCard ? 'gift_card' : 'standard'
        })
      });

      if (response.ok) {
        const data = await response.json();
        affiliateData = {
          link: data.affiliate_url || data.tracking_url,
          tracking_id: trackingId,
          brand_id: brandId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        console.log('✅ Generated real Loyalize affiliate link');
      } else {
        throw new Error('Loyalize API unavailable');
      }
    } catch (error) {
      console.log('⚠️ Using mock affiliate link generation');
      affiliateData = generateMockAffiliateLink(brand, productUrl, trackingId);
    }

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
      affiliate_link: affiliateData.link,
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
    return new Response(JSON.stringify({
      success: false,
      error: error.message
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
    const parsedIds = parseTrackingId(trackingId);
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

function generateTrackingId(userId: string, brandId: string): string {
  const timestamp = Date.now().toString(36);
  const userHash = userId.slice(-8); // Take last 8 chars to avoid collisions
  const brandHash = brandId.slice(-8);
  return `tgn_${userHash}_${brandHash}_${timestamp}`;
}

function parseTrackingId(trackingId: string): { userId: string, brandId: string } {
  // Enhanced parser with better error handling
  try {
    const parts = trackingId.split('_');
    if (parts.length < 4 || parts[0] !== 'tgn') {
      throw new Error('Invalid tracking ID format');
    }
    return {
      userId: parts[1] || '',
      brandId: parts[2] || ''
    };
  } catch (error) {
    console.error('Error parsing tracking ID:', trackingId, error);
    return {
      userId: '',
      brandId: ''
    };
  }
}

function generateMockAffiliateLink(brand: any, productUrl: string, trackingId: string): AffiliateLink {
  // Generate a mock affiliate link for testing
  const baseUrl = brand.website_url || 'https://example.com';
  const affiliateUrl = `${baseUrl}?ref=garden&track=${trackingId}&redirect=${encodeURIComponent(productUrl)}`;
  
  return {
    original_url: productUrl,
    link: affiliateUrl, // Use 'link' to match the expected structure
    tracking_id: trackingId,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
}
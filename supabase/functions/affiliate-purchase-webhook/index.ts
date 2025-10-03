import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation schema for affiliate webhooks
const AffiliateWebhookSchema = z.object({
  order_id: z.string().max(200),
  order_status: z.string().max(50),
  total_amount: z.number().positive().max(1000000),
  currency: z.string().max(10),
  user_id: z.string().uuid().optional(),
  tracking_id: z.string().max(200).optional(),
  ref: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  purchase_date: z.string().max(50).optional(),
  customer_email: z.string().email().max(255).optional(),
  products: z.array(z.object({
    name: z.string().max(200),
    amount: z.number().positive(),
    quantity: z.number().int().positive(),
    category: z.string().max(100).optional()
  })).max(100).optional()
})

// Interface for giftcards.com and similar affiliate webhooks
interface AffiliateWebhookPayload {
  order_id: string;
  order_status: string;
  total_amount: number;
  currency: string;
  user_id?: string;
  tracking_id?: string;
  ref?: string;
  source?: string;
  purchase_date?: string;
  customer_email?: string;
  products?: Array<{
    name: string;
    amount: number;
    quantity: number;
    category?: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Read body first
    const body = await req.text();
    
    // OPTIONAL: Webhook signature verification (for internal webhooks)
    // Most affiliate networks (Fanatics, Loyalize, etc.) don't use HMAC signatures
    const webhookSecret = Deno.env.get('AFFILIATE_WEBHOOK_SECRET');
    const signature = req.headers.get('x-webhook-signature');
    
    if (webhookSecret && signature) {
      // If both secret and signature exist, verify them
      console.log('[SECURITY] Verifying webhook signature...');
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== expectedSignature) {
        console.error('[SECURITY] Invalid webhook signature', { 
          ip: req.headers.get('x-forwarded-for'),
          providedSig: signature.slice(0, 10) + '...',
          expectedSig: expectedSignature.slice(0, 10) + '...'
        });
        return new Response(JSON.stringify({ error: 'Authentication failed' }), { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log('[SECURITY] ✅ Webhook signature verified');
    } else {
      // Log that we're accepting webhooks without signature verification
      // This is normal for affiliate networks like Fanatics, Loyalize, etc.
      console.log('[INFO] Processing webhook without signature verification (affiliate network mode)', {
        source: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for')
      });
    }

    // Parse and validate payload
    let payload: AffiliateWebhookPayload;
    try {
      console.log('🔔 Affiliate webhook received');
      
      if (!body.trim()) {
        throw new Error('Empty request body');
      }
      const rawPayload = JSON.parse(body);
      
      // Validate with zod schema
      const validationResult = AffiliateWebhookSchema.safeParse(rawPayload);
      if (!validationResult.success) {
        console.error('Invalid webhook payload schema:', validationResult.error.format());
        throw new Error('Invalid payload structure');
      }
      
      payload = validationResult.data as AffiliateWebhookPayload;
      
    } catch (parseError) {
      console.error('[ERROR] Payload validation error:', parseError instanceof Error ? parseError.message : 'Unknown error');
      return new Response(JSON.stringify({ error: 'Invalid request format' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📦 Processed payload:', JSON.stringify(payload, null, 2));

    // Only process completed/paid orders
    if (!['completed', 'paid', 'success'].includes(payload.order_status?.toLowerCase())) {
      console.log('⏸️ Ignoring non-completed order status:', payload.order_status);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Order status ${payload.order_status} - waiting for completion` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract user ID from tracking ID if not provided directly
    let userId = payload.user_id;
    if (!userId && payload.tracking_id) {
      const parsedTracking = await parseTrackingId(payload.tracking_id, supabase);
      if (parsedTracking.userId) {
        userId = parsedTracking.userId;
        console.log('🔍 Found user ID from tracking mapping:', userId);
      }
    }

    // Validate we have a user ID
    if (!userId) {
      console.error('❌ No user ID found in payload or tracking ID');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unable to identify user from webhook data'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if transaction already exists
    const { data: existingTransaction } = await supabase
      .from('nctr_transactions')
      .select('id')
      .eq('external_transaction_id', payload.order_id)
      .maybeSingle();

    if (existingTransaction) {
      console.log('✅ Transaction already processed:', payload.order_id);
      return new Response(JSON.stringify({
        success: true,
        message: 'Transaction already processed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine partner and NCTR reward rate
    let partnerName = payload.source || 'Gift Cards';
    let nctrPerDollar = 0.01; // Default 1 NCTR per dollar

    // Get brand-specific rates if we can identify the brand
    if (payload.source) {
      const { data: brand } = await supabase
        .from('brands')
        .select('name, nctr_per_dollar')
        .ilike('name', `%${payload.source}%`)
        .maybeSingle();
      
      if (brand) {
        partnerName = brand.name;
        nctrPerDollar = brand.nctr_per_dollar || 0.01;
      }
    }

    // Calculate NCTR reward
    const nctrReward = payload.total_amount * nctrPerDollar;
    console.log(`💰 Calculated reward: ${nctrReward} NCTR for $${payload.total_amount} (rate: ${nctrPerDollar})`);

    // Get or create user portfolio
    const { data: portfolio } = await supabase
      .from('nctr_portfolio')
      .select('available_nctr, total_earned')
      .eq('user_id', userId)
      .maybeSingle();

    let currentAvailable = 0;
    let currentTotal = 0;

    if (!portfolio) {
      // Create portfolio if it doesn't exist
      const { data: newPortfolio, error: createError } = await supabase
        .from('nctr_portfolio')
        .insert({
          user_id: userId,
          available_nctr: nctrReward,
          total_earned: nctrReward
        })
        .select('available_nctr, total_earned')
        .single();
      
      if (createError) {
        console.error('❌ Error creating portfolio:', createError);
        throw createError;
      }
      console.log('✅ Created new portfolio for user');
    } else {
      currentAvailable = portfolio.available_nctr;
      currentTotal = portfolio.total_earned;
      
      // Update existing portfolio
      const { error: updateError } = await supabase
        .from('nctr_portfolio')
        .update({
          available_nctr: currentAvailable + nctrReward,
          total_earned: currentTotal + nctrReward,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Error updating portfolio:', updateError);
        throw updateError;
      }
    }

    // Record the transaction
    const productName = payload.products?.[0]?.name || 'Affiliate Purchase';
    const { error: transactionError } = await supabase
      .from('nctr_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earned',
        nctr_amount: nctrReward,
        purchase_amount: payload.total_amount,
        description: `${productName} via ${partnerName} - Order: ${payload.order_id}`,
        partner_name: partnerName,
        status: 'completed',
        earning_source: 'affiliate_purchase',
        external_transaction_id: payload.order_id
      });

    if (transactionError) {
      console.error('❌ Error recording transaction:', transactionError);
      throw transactionError;
    }

    // Update affiliate link click stats if we have tracking info
    if (payload.tracking_id) {
      const parsedTracking = await parseTrackingId(payload.tracking_id, supabase);
      if (parsedTracking.brandId) {
        // Try to find brand-specific tracking info
        console.log('📊 Found brand tracking info:', parsedTracking.brandId);
      }
    }

    console.log(`✅ Successfully processed affiliate purchase: ${nctrReward} NCTR awarded to user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Affiliate purchase processed successfully',
      nctr_earned: nctrReward,
      order_id: payload.order_id,
      user_id: userId,
      partner_name: partnerName,
      purchase_amount: payload.total_amount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ERROR] Affiliate webhook error:', error);
    
    // Sanitize error for external response
    let publicError = 'Transaction processing failed';
    const errorMsg = error instanceof Error ? error.message : '';
    
    if (errorMsg.includes('user_id')) {
      publicError = 'Invalid user reference';
    } else if (errorMsg.includes('duplicate')) {
      publicError = 'Duplicate transaction';
    } else if (errorMsg.includes('amount')) {
      publicError = 'Invalid amount';
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: publicError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Helper function to parse tracking IDs using database lookup
async function parseTrackingId(trackingId: string, supabase: any): Promise<{ userId: string, linkId?: string, brandId?: string }> {
  try {
    console.log('🔍 Parsing tracking ID for webhook:', trackingId);
    
    // Try database lookup first for new format
    const { data, error } = await supabase
      .from('affiliate_link_mappings')
      .select('user_id, brand_id')
      .eq('tracking_id', trackingId)
      .single();
      
    if (!error && data) {
      console.log('✅ Found webhook tracking mapping:', data);
      return {
        userId: data.user_id,
        brandId: data.brand_id
      };
    }
    
    // Fallback parsers for older formats
    if (trackingId.includes('_')) {
      // Format: tgn_userHash_brandHash_timestamp or user_link_brand
      const parts = trackingId.split('_');
      if (parts.length >= 3) {
        return {
          userId: parts[1],
          linkId: parts[2],
          brandId: parts[3] || parts[2]
        };
      }
    }
    
    if (trackingId.includes('-')) {
      // Format: userId-linkId-brandId
      const parts = trackingId.split('-');
      if (parts.length >= 2) {
        return {
          userId: parts[0],
          linkId: parts[1],
          brandId: parts[2] || undefined
        };
      }
    }
    
    console.warn('⚠️ Could not parse tracking ID format:', trackingId);
    return { userId: '' };
    
  } catch (error) {
    console.error('❌ Error parsing tracking ID:', error);
    return { userId: '' };
  }
}
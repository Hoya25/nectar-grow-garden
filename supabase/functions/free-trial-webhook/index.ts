import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// Validation schema
const FreeTrialWebhookSchema = z.object({
  user_id: z.string().uuid('Invalid user_id format'),
  opportunity_id: z.string().uuid('Invalid opportunity_id format')
});

// Webhook secret for signature verification
const WEBHOOK_SECRET = Deno.env.get('RAD_LIVE_WEBHOOK_SECRET');

// Helper to verify webhook signature
async function verifyWebhookSignature(payload: string, signature: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn('⚠️ RAD_LIVE_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    return false; // Fail closed - require secret to be configured
  }
  
  if (!signature) {
    console.error('❌ Missing webhook signature header');
    return false;
  }

  try {
    // Create HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log the incoming IP for audit trail
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';
    
    console.log('📍 Free trial webhook request from IP:', clientIP);
    
    // Get the raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature');
    
    // Verify webhook signature (required for security)
    const isValidSignature = await verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature from IP:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Request could not be processed' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('✅ Webhook signature verified successfully');

    // Parse and validate request body
    const body = JSON.parse(rawBody);
    const validatedData = FreeTrialWebhookSchema.parse(body);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate opportunity exists and is free_trial type
    const { data: opportunity, error: oppError } = await supabase
      .from('earning_opportunities')
      .select('id, opportunity_type, nctr_reward')
      .eq('id', validatedData.opportunity_id)
      .eq('opportunity_type', 'free_trial')
      .eq('is_active', true)
      .single();

    if (oppError || !opportunity) {
      console.error('❌ Invalid opportunity:', validatedData.opportunity_id, oppError);
      return new Response(
        JSON.stringify({ success: false, error: 'Request could not be processed' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Award NCTR using the award_affiliate_nctr function
    const { data: awardResult, error: awardError } = await supabase.rpc(
      'award_affiliate_nctr',
      {
        p_user_id: validatedData.user_id,
        p_base_nctr_amount: opportunity.nctr_reward || 0,
        p_earning_source: 'free_trial'
      }
    );

    if (awardError) {
      console.error('❌ Award error:', awardError);
      return new Response(
        JSON.stringify({ success: false, error: 'Request could not be processed' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Free trial completed and credited:', {
      user_id: validatedData.user_id,
      opportunity_id: validatedData.opportunity_id,
      credited: awardResult.multiplied_amount
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        credited: awardResult.multiplied_amount,
        message: 'Free trial completion credited'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // Detailed logging for server-side debugging
    console.error('❌ Free trial webhook error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle validation errors specifically
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generic error response for all other errors
    return new Response(
      JSON.stringify({ success: false, error: 'Request could not be processed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const FreeTrialWebhookSchema = z.object({
  user_id: z.string().uuid('Invalid user_id format'),
  opportunity_id: z.string().uuid('Invalid opportunity_id format')
});

// TODO: Add Rad.Live webhook IP whitelist once provided
// const RAD_LIVE_IP_WHITELIST = ['IP_ADDRESS_HERE'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log the incoming IP for debugging
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';
    
    console.log('📍 Free trial webhook request from IP:', clientIP);
    
    // TODO: Enable IP whitelist check once Rad.Live IP is provided
    // if (!RAD_LIVE_IP_WHITELIST.includes(clientIP)) {
    //   console.error('❌ Unauthorized IP address:', clientIP);
    //   return new Response(JSON.stringify({ error: 'Request could not be processed' }), {
    //     status: 403,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    //   });
    // }

    // Parse and validate request body
    const body = await req.json();
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
